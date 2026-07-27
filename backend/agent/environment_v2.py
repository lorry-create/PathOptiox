"""动态图物流环境 V2（Phase B：真实 PPO 寻路逻辑 + Phase C 修复：状态感知 + 奖励重塑）

从 SQLite 数据库动态加载节点和链路（通过 `models/logistics_network.py`），
替代 V1 `environment.py` 中硬编码的 NODES/LINKS_RAW 常量。

核心改造：
    1. 动态加载：节点数、链路数不再固定，从 DB 读取
    2. 真实 step(action)：实现完整的环境状态转移，action 是链路索引
    3. 密集奖励（Dense Rewards）：
       - 单步成本惩罚：-(w_c*cost + w_t*time + w_cb*carbon + w_r*risk) / NORM * AMPLIFIER
         权重动态放大，让不同偏好在 Reward 上产生数量级区分
       - 距离引导：靠近终点给予正向 reward（BFS 跳数差），权重降低
       - 步数惩罚：极小（-0.001），不抑制多跳中转
       - 终局奖励：到达终点 = 适度激励 + 预算奖励，死胡同/超步 = 适度惩罚
    4. 启发式距离：用 BFS 预计算所有节点到终点的最短跳数
    5. 状态感知（Phase C 修复）：状态向量拼接 4 维 weights，让 PPO 能感知当前偏好

向后兼容：
    本模块独立存在，不修改 V1 `environment.py`。
"""
from __future__ import annotations

import logging
import math
from collections import deque
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


# ====================================================================
# 归一化常数（Phase D 炼丹调优：严格归一化到 0~1 区间，解决量纲不平衡）
# 修复前问题：Cost 万级 vs Time 个位数，导致 Cost 微小波动淹没 Time 权重
# 修复策略：所有指标在与 weights 相乘前，先除以"实际链路最大值"，映射到 0~1
# ====================================================================
# 基准值取自扩充后图网络中的实际最大链路值（见 seed_logistics_net.py）
# - 最大链路 cost: 上海→卢森堡 air = $19,800，向上取整 $30,000
# - 最大链路 time: 上海→suez sea = 16 天，向上取整 40 天（多跳累积可能 30+ 天）
# - 最大链路 carbon: 上海→singapore sea = 22,400 kg，向上取整 30,000 kg
# - 最大链路 risk: 0.22（跨洋海运），向上取整 1.0
NORM_COST = 30000.0          # Phase D: 100000 → 30000（更严格归一化）
NORM_TIME = 40.0             # Phase D: 60 → 40（更严格归一化）
NORM_CARBON = 30000.0        # Phase D: 100000 → 30000（更严格归一化）
NORM_RISK = 1.0              # Phase D: 10 → 1（更严格归一化）
NORM_DIST = 20.0             # 最大跳数（扩充图后调整）

# 终局奖励（Phase C 修复：适度激励，不再使用极大值）
REWARD_REACH_GOAL = 3.0       # 到达终点的固定激励
REWARD_TIMEOUT = -2.0         # 超步惩罚（不再极端）
REWARD_DEAD_END = -2.0        # 死胡同惩罚

# 步数惩罚（Phase C 修复：极小，不抑制多跳中转）
STEP_PENALTY = -0.001

# 距离引导权重（Phase C 修复：降低，避免单纯追求最少跳数）
APPROACH_REWARD_WEIGHT = 0.1

# 权重放大系数（Phase C 修复：让权重差异在 Reward 上产生数量级区分）
# Phase D 二次调优：10.0 → 3.0（降低单步惩罚累积效应，避免多跳海运总惩罚过大）
# 修复前：海运 10 跳累积 -9.0，空运 2 跳累积 -12.42，PPO 选空运
# 修复后：海运 10 跳累积 -2.7，空运 2 跳累积 -3.72 + 物理惩罚 -10.0，PPO 选海运
REWARD_AMPLIFIER = 3.0

# 预算奖励：到达终点时，若总成本低于预算，给予剩余预算比例的奖励
# Phase D 二次调优：2.0 → 5.0（增大预算奖励，鼓励低成本路径）
BUDGET_REWARD_WEIGHT = 5.0
DEFAULT_BUDGET_COST = 30000.0   # Phase D: 50000 → 30000（与 NORM_COST 对齐）
DEFAULT_BUDGET_TIME = 40.0      # 默认时效预算

# 最大步数（Phase F 强化：50 → 15，避免 PPO 乱绕远路）
# 物流图中最长合理路径约 10-12 跳（如上海→新加坡→科伦坡→苏伊士→比雷埃夫斯→杜伊斯堡→汉堡）
# 15 跳给 PPO 留余地，但不会出现 24 跳全球环游
MAX_STEPS = 15

# ====================================================================
# Phase D 炼丹调优：物理常识惩罚（防止 AI 在"成本优先"时仍选空运）
# ====================================================================
# 当 weight_cost > COST_SENSITIVE_THRESHOLD 时，选择 air 给予固定惩罚
# 阈值 0.6 = 用户明确表示成本敏感（4 维权重和为 1.0 时，0.6 即压倒性偏好）
COST_SENSITIVE_THRESHOLD = 0.6
# Phase D 二次调优：-0.5 → -2.0 → -5.0（让 PPO 在成本优先时选 air 的总 reward 严重负值，
# 强迫其探索 sea/rail 替代路径）
AIR_PENALTY_WHEN_COST_SENSITIVE = -5.0  # 固定重罚，量级远超过单步 cost penalty

# 当 weight_time > TIME_SENSITIVE_THRESHOLD 时，选择 sea 给予固定惩罚
# （时效优先时不应走慢速海运）
TIME_SENSITIVE_THRESHOLD = 0.6
SEA_PENALTY_WHEN_TIME_SENSITIVE = -5.0

# ====================================================================
# Phase E 炼丹调优：地理方向引导（基于经纬度的方向感知）
# ====================================================================
# 修复问题：进入阿拉山口后掉头回中国大西南等违反物流常理的路径
# 根因：
#   1. 对称双向图：A→B 与 B→A 成本/时间/碳排完全相同，PPO 可随意回头
#   2. BFS 距离只数跳数，不感知地理方向
#   3. 奖励函数无"反向移动"惩罚
# 修复策略（精细化）：
#   用 Haversine 球面距离计算每步移动后到终点的地理距离变化 geo_delta：
#   - 前进（geo_delta < 0）：不奖励，让 PPO 根据 weights 偏好自由选择路径
#   - 轻微后退（0 < geo_delta ≤ 阈值）：不惩罚，允许海运绕路（如上海→新加坡向南绕苏伊士运河）
#   - 明显后退（geo_delta > 阈值）：重罚，防止"阿拉山口掉头回西安"等违反物流常理的路径
# 关键：只惩罚"明显掉头"，不干扰正常的绕路前进，保留 PPO 的偏好差异化能力
#
# Phase F 强化（防止"汉堡→苏伊士→上海"全球大折返）：
#   1. GEO_BACKWARD_THRESHOLD_KM 从 1500 → 800（更严格，允许海运绕路但禁止大折返）
#   2. GEO_BACKWARD_PENALTY_WEIGHT 从 5.0 → 30.0（惩罚强度提升 6 倍）
#   3. 新增 GEO_HARD_BLOCK_THRESHOLD_KM = 2000（硬约束阈值，超过此值的动作直接屏蔽）
#      在 _get_feasible_actions 中硬性屏蔽严重后退动作，PPO 无法选择
GEO_BACKWARD_THRESHOLD_KM = 800.0    # Phase F: 1500 → 800（允许海运绕路，禁止大折返）
GEO_BACKWARD_PENALTY_WEIGHT = 30.0   # Phase F: 5.0 → 30.0（惩罚强度提升 6 倍）
NORM_GEO_DIST = 20000.0              # 地球半周长（km），用于归一化球面距离

# Phase F 新增：地理方向硬约束阈值（动作屏蔽）
# 超过此阈值的后退动作将被 _get_feasible_actions 直接屏蔽，PPO 无法选择
# 设置 2000km：允许海运绕路（如上海→新加坡南绕 1500km），但禁止"上海→安克雷奇"反向跨洋
GEO_HARD_BLOCK_THRESHOLD_KM = 2000.0

# 状态向量维度（Phase C 修复：6 维基础 + 4 维 weights = 10 维）
STATE_DIM_BASE = 6
STATE_DIM_WEIGHTS = 4
STATE_DIM = STATE_DIM_BASE + STATE_DIM_WEIGHTS  # 10


class LinkV2:
    """链路对象（运行时实例，对应 DB 中一条 LogisticsLink 记录）"""

    __slots__ = ("id", "from_idx", "to_idx", "mode",
                 "cost_usd", "time_days", "carbon_kg", "base_risk")

    def __init__(self, link_id: int, from_idx: int, to_idx: int, mode: str,
                 cost_usd: float, time_days: float, carbon_kg: float,
                 base_risk: float) -> None:
        self.id = link_id            # 链路数据库 ID
        self.from_idx = from_idx     # 起点索引（在 nodes 列表中的位置）
        self.to_idx = to_idx         # 终点索引
        self.mode = mode             # land / rail / sea / air
        self.cost_usd = cost_usd
        self.time_days = time_days
        self.carbon_kg = carbon_kg
        self.base_risk = base_risk


class LogisticsEnvV2:
    """动态图物流环境 V2

    与 V1 的核心区别：
        - 节点/链路从 DB 动态加载（不依赖硬编码常量）
        - step(action) 实现真实状态转移（V1 无此方法）
        - 密集奖励（V1 仅终局奖励）
        - 动作空间 = 当前节点出边数（V1 是固定 48 维）

    用法：
        env = LogisticsEnvV2(scene="normal")
        env.load_from_db()                      # 从 DB 加载路网
        state = env.reset("shenzhen", "hamburg", weights=(0.4, 0.25, 0.2, 0.15))
        for step in range(30):
            mask = env.get_action_mask()
            if mask.sum() == 0:
                break  # 死胡同
            action = ...  # PPO 选择动作（链路索引）
            state, reward, done, info = env.step(action)
            if done:
                break
    """

    def __init__(self, scene: str = "normal") -> None:
        self.scene = scene

        # 路网数据（load_from_db 后填充）
        self.nodes: List[Any] = []          # LogisticsNode ORM 对象列表
        self.links: List[LinkV2] = []       # LinkV2 运行时对象列表
        self.node_code_to_idx: Dict[str, int] = {}
        self.node_id_to_idx: Dict[int, int] = {}
        self.adjacency: Dict[int, List[int]] = {}  # node_idx -> [link_idx, ...]

        # 场景系数（从 DB 加载，默认 normal=1.0）
        self.scene_factors: Tuple[float, float, float] = (1.0, 1.0, 1.0)

        # 运行时状态（reset 后填充）
        self.start_idx: int = 0
        self.end_idx: int = 0
        self.current_idx: int = 0
        self.weights: Tuple[float, float, float, float] = (1.0, 1.0, 1.0, 1.0)
        self.step_count: int = 0
        self.visited: set = set()
        self.path_links: List[int] = []     # 已走过的链路索引列表
        self.acc_cost: float = 0.0
        self.acc_time: float = 0.0
        self.acc_carbon: float = 0.0
        self.acc_risk: float = 0.0

        # 启发式距离矩阵（BFS 跳数）reset 时按终点计算
        self.dist_to_goal: np.ndarray = np.zeros(0)

        # Phase E：地理距离矩阵（Haversine 球面距离，km）reset 时按终点计算
        self.geo_dist_to_goal: np.ndarray = np.zeros(0)

        # 加载标记
        self._loaded: bool = False

    # ====================================================================
    # 数据库加载
    # ====================================================================
    def load_from_db(self, db_session=None) -> "LogisticsEnvV2":
        """从 SQLite 数据库加载节点和链路

        Args:
            db_session: SQLAlchemy 会话（None 时自动创建）

        Returns:
            self（链式调用）
        """
        from database import get_db_session
        from models.logistics_network import (
            LogisticsLink,
            LogisticsNode,
            SceneFactor,
        )

        db = db_session
        if db is None:
            with get_db_session() as session:
                return self._load_from_session(session)
        return self._load_from_session(db)

    def _load_from_session(self, db) -> "LogisticsEnvV2":
        """从 DB 会话加载路网数据"""
        from models.logistics_network import (
            LogisticsLink,
            LogisticsNode,
            SceneFactor,
        )

        # 1. 加载所有启用的节点
        nodes_orm = db.query(LogisticsNode).filter_by(is_active=True).all()
        self.nodes = nodes_orm
        self.node_code_to_idx = {n.code: i for i, n in enumerate(nodes_orm)}
        self.node_id_to_idx = {n.id: i for i, n in enumerate(nodes_orm)}

        # 2. 加载所有启用的链路
        links_orm = db.query(LogisticsLink).filter_by(is_active=True).all()
        self.links = []
        for link_orm in links_orm:
            from_idx = self.node_id_to_idx.get(link_orm.from_node_id)
            to_idx = self.node_id_to_idx.get(link_orm.to_node_id)
            if from_idx is None or to_idx is None:
                continue  # 跳过孤儿链路
            # 应用场景系数
            cost_f, time_f, risk_f = self.scene_factors
            link_v2 = LinkV2(
                link_id=link_orm.id,
                from_idx=from_idx,
                to_idx=to_idx,
                mode=link_orm.transport_mode,
                cost_usd=link_orm.base_cost_usd * cost_f,
                time_days=link_orm.base_time_days * time_f,
                carbon_kg=link_orm.base_carbon_kg,  # 碳排不受场景影响
                base_risk=link_orm.base_risk * risk_f,
            )
            self.links.append(link_v2)

        # 3. 构建邻接表
        self.adjacency = {i: [] for i in range(len(self.nodes))}
        for link_idx, link in enumerate(self.links):
            self.adjacency[link.from_idx].append(link_idx)

        # 4. 加载场景系数
        scene_factor_orm = db.query(SceneFactor).filter_by(scene_code=self.scene).first()
        if scene_factor_orm:
            self.scene_factors = (
                scene_factor_orm.cost_multiplier,
                scene_factor_orm.time_multiplier,
                scene_factor_orm.risk_multiplier,
            )
            # 重新应用场景系数到已加载的链路
            self._apply_scene_to_links()

        self._loaded = True
        logger.info(
            f"LogisticsEnvV2 加载完成: {len(self.nodes)} 节点, "
            f"{len(self.links)} 链路, scene={self.scene}"
        )
        return self

    def _apply_scene_to_links(self) -> None:
        """对已加载的链路应用场景系数"""
        cost_f, time_f, risk_f = self.scene_factors
        for link in self.links:
            # 注意：base_* 已是场景化后的值，这里不做二次应用
            # 实际场景系数在 _load_from_session 中已应用
            pass

    # ====================================================================
    # 环境接口（Gym 风格）
    # ====================================================================
    def reset(
        self,
        start_code: str,
        end_code: str,
        weights: Tuple[float, float, float, float] = (1.0, 1.0, 1.0, 1.0),
    ) -> np.ndarray:
        """重置环境到起点

        Args:
            start_code: 起点节点 code（如 'shenzhen'）
            end_code: 终点节点 code（如 'hamburg'）
            weights: (cost, time, carbon, risk) 奖励权重

        Returns:
            初始状态向量 [6]
        """
        if not self._loaded:
            raise RuntimeError("环境未加载，请先调用 load_from_db()")

        if start_code not in self.node_code_to_idx:
            raise ValueError(f"起点节点 {start_code} 不存在")
        if end_code not in self.node_code_to_idx:
            raise ValueError(f"终点节点 {end_code} 不存在")

        self.start_idx = self.node_code_to_idx[start_code]
        self.end_idx = self.node_code_to_idx[end_code]
        self.current_idx = self.start_idx
        self.weights = weights
        self.step_count = 0
        self.visited = {self.start_idx}
        self.path_links = []
        self.acc_cost = 0.0
        self.acc_time = 0.0
        self.acc_carbon = 0.0
        self.acc_risk = 0.0

        # 预计算 BFS 距离（到终点的最短跳数）
        self.dist_to_goal = self._bfs_distances(self.end_idx)

        # Phase E：预计算地理距离（每个节点到终点的 Haversine 球面距离，km）
        self.geo_dist_to_goal = self._compute_geo_distances(self.end_idx)

        return self._get_state()

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, Dict[str, Any]]:
        """执行一步状态转移

        Args:
            action: 链路索引（在 self.links 列表中的位置）

        Returns:
            next_state: [6] 新状态向量
            reward: 本步奖励（密集奖励）
            done: 是否终止（到达终点 / 死胡同 / 超步）
            info: 附加信息 {reason, link, ...}
        """
        if not self._loaded:
            raise RuntimeError("环境未加载，请先调用 load_from_db()")

        # 校验动作合法性
        if action < 0 or action >= len(self.links):
            raise ValueError(f"非法动作 action={action}，链路总数={len(self.links)}")

        link = self.links[action]
        if link.from_idx != self.current_idx:
            raise ValueError(
                f"动作 {action} 的起点 {link.from_idx} 与当前节点 {self.current_idx} 不匹配"
            )

        # 记录走到此节点前的距离（用于计算距离引导 reward）
        dist_before = self.dist_to_goal[self.current_idx]

        # 1. 状态转移：走到 link.to_idx
        self.current_idx = link.to_idx
        self.visited.add(self.current_idx)
        self.path_links.append(action)
        self.step_count += 1

        # 2. 累计指标
        self.acc_cost += link.cost_usd
        self.acc_time += link.time_days
        self.acc_carbon += link.carbon_kg
        self.acc_risk += link.base_risk

        # 3. 计算密集奖励
        reward = self._compute_reward(link, dist_before)

        # 4. 终止条件判断
        done = False
        info: Dict[str, Any] = {"link": link, "step": self.step_count}

        if self.current_idx == self.end_idx:
            # 成功到达终点
            done = True
            reward += self._compute_terminal_reward("reach_goal")
            info["reason"] = "reach_goal"
        elif self.step_count >= MAX_STEPS:
            # 超过最大步数
            done = True
            reward += self._compute_terminal_reward("timeout")
            info["reason"] = "timeout"
        else:
            # 检查是否走入死胡同（无可用动作）
            feasible = self._get_feasible_actions()
            if not feasible:
                done = True
                reward += self._compute_terminal_reward("dead_end")
                info["reason"] = "dead_end"

        info["acc_cost"] = self.acc_cost
        info["acc_time"] = self.acc_time
        info["acc_carbon"] = self.acc_carbon
        info["acc_risk"] = self.acc_risk

        return self._get_state(), reward, done, info

    def _compute_reward(self, link: LinkV2, dist_before: float) -> float:
        """计算密集奖励（Phase E：地理方向引导 + Phase D 严格归一化 + 物理常识惩罚）

        Phase E 修复（防止"阿拉山口掉头回大西南"等违反物流常理路径）：
            4. 地理方向引导（基于 Haversine 球面距离）：
               - 向终点前进：正向 reward
               - 向远离终点方向移动（掉头）：负向 reward，并放大惩罚
               - 强约束 PPO 走向终点的地理方向，避免对称双向图导致的无方向乱走

        Phase D 修复：
            1. 严格归一化：所有指标在与 weights 相乘前，先除以基准最大值映射到 0~1
               - 修复前：Cost/NORM_COST = 19800/100000 = 0.198（量级偏小）
               - 修复后：Cost/NORM_COST = 19800/30000 = 0.66（量级正常，与 Time 同级）
            2. 物理常识惩罚：
               - 成本优先（w_c > 0.6）选 air：额外 -0.5 惩罚
               - 时效优先（w_t > 0.6）选 sea：额外 -0.5 惩罚
               - 强迫 AI 探索符合偏好的运输方式

        组成：
            1. 单步成本惩罚（严格归一化 + 权重动态放大）
            2. 物理常识惩罚（Phase D 新增）
            3. BFS 距离引导（弱化，辅助）
            4. 地理方向引导（Phase E 新增，主引导信号）
            5. 步数惩罚（极小）：-0.001，不抑制多跳中转
        """
        w_c, w_t, w_cb, w_r = self.weights

        # 1. 单步成本惩罚（Phase D：严格归一化，所有指标映射到 0~1）
        #    修复前 Cost/NORM_COST = 0.198，Time/NORM_TIME = 0.025（Cost 淹没 Time）
        #    修复后 Cost/NORM_COST = 0.66，Time/NORM_TIME = 0.4（量级平衡）
        norm_cost = link.cost_usd / NORM_COST
        norm_time = link.time_days / NORM_TIME
        norm_carbon = link.carbon_kg / NORM_CARBON
        norm_risk = link.base_risk / NORM_RISK

        step_cost = (
            w_c * norm_cost
            + w_t * norm_time
            + w_cb * norm_carbon
            + w_r * norm_risk
        )
        cost_penalty = -step_cost * REWARD_AMPLIFIER

        # 2. 物理常识惩罚（Phase D 新增：防止偏好与运输方式冲突）
        physics_penalty = 0.0
        if w_c > COST_SENSITIVE_THRESHOLD and link.mode == "air":
            # 成本优先却选空运：重罚，强迫走 sea/rail
            physics_penalty += AIR_PENALTY_WHEN_COST_SENSITIVE
        if w_t > TIME_SENSITIVE_THRESHOLD and link.mode == "sea":
            # 时效优先却选海运：重罚，强迫走 air/rail
            physics_penalty += SEA_PENALTY_WHEN_TIME_SENSITIVE

        # 3. BFS 距离引导（弱化，仅作辅助引导，跳数感知）
        dist_after = self.dist_to_goal[self.current_idx]
        approach_reward = (dist_before - dist_after) / NORM_DIST * APPROACH_REWARD_WEIGHT

        # 4. Phase E 地理方向引导（精细化：只惩罚"明显掉头"，不干扰绕路前进）
        #    用 Haversine 球面距离计算移动前后到终点的地理距离变化
        #    - 前进（geo_delta < 0）：不奖励，让 PPO 根据 weights 偏好自由选择
        #    - 轻微后退（0 < geo_delta ≤ 阈值）：不惩罚，允许海运绕路
        #      （如上海→新加坡向南绕苏伊士运河，后退约 1500km，属于正常绕路）
        #    - 明显后退（geo_delta > 阈值）：重罚，防止"阿拉山口掉头回西安"等
        #      违反物流常理的路径（阿拉山口→西安后退约 2800km）
        #    关键：只惩罚明显掉头，保留 PPO 的偏好差异化能力
        geo_dist_before = float(self.geo_dist_to_goal[link.from_idx])
        geo_dist_after = float(self.geo_dist_to_goal[link.to_idx])
        geo_delta = geo_dist_after - geo_dist_before  # 正=后退，负=前进
        if geo_delta > GEO_BACKWARD_THRESHOLD_KM:
            # 明显后退：超过阈值的这部分按比例重罚
            excess = geo_delta - GEO_BACKWARD_THRESHOLD_KM
            geo_reward = -(excess / NORM_GEO_DIST) * GEO_BACKWARD_PENALTY_WEIGHT
        else:
            # 前进或轻微后退（绕路）：不奖不罚
            geo_reward = 0.0

        # 5. 步数惩罚（极小，不抑制多跳中转）
        step_penalty = STEP_PENALTY

        return cost_penalty + physics_penalty + approach_reward + geo_reward + step_penalty

    def _compute_terminal_reward(self, reason: str) -> float:
        """计算终局奖励（Phase C 修复：预算奖励 + 适度激励）

        Args:
            reason: "reach_goal" / "timeout" / "dead_end"

        Returns:
            终局奖励
        """
        if reason == "reach_goal":
            # 到达终点：固定激励 + 预算奖励（剩余预算比例）
            w_c, w_t, w_cb, w_r = self.weights

            # 成本预算奖励：若总成本低于预算，按剩余比例给奖励
            cost_ratio = max(0.0, 1.0 - self.acc_cost / DEFAULT_BUDGET_COST)
            # 时效预算奖励：若总时效低于预算，按剩余比例给奖励
            time_ratio = max(0.0, 1.0 - self.acc_time / DEFAULT_BUDGET_TIME)

            # 预算奖励按当前权重加权（让符合偏好的方案获得更高奖励）
            budget_reward = (
                w_c * cost_ratio + w_t * time_ratio
            ) * BUDGET_REWARD_WEIGHT

            return REWARD_REACH_GOAL + budget_reward
        elif reason == "timeout":
            return REWARD_TIMEOUT
        else:  # dead_end
            return REWARD_DEAD_END

    # ====================================================================
    # 状态与动作掩码
    # ====================================================================
    def _get_state(self) -> np.ndarray:
        """构造当前状态向量 [10]（Phase C 修复：拼接 weights）

        状态向量组成（10 维）：
            基础状态（6 维）：
                [当前节点索引归一化, 累计成本, 累计时效, 累计碳排, 累计风险, 到终点距离]
            权重向量（4 维，Phase C 新增）：
                [w_cost, w_time, w_carbon, w_risk]

        权重拼接让 PPO 能感知当前偏好，从而根据 weights 做出不同决策。
        """
        w_c, w_t, w_cb, w_r = self.weights
        state = np.array([
            # 基础状态（6 维）
            self.current_idx / max(1, len(self.nodes) - 1),
            self.acc_cost / NORM_COST,
            self.acc_time / NORM_TIME,
            self.acc_carbon / NORM_CARBON,
            self.acc_risk / NORM_RISK,
            self.dist_to_goal[self.current_idx] / NORM_DIST,
            # 权重向量（4 维，Phase C 修复：状态感知）
            w_c, w_t, w_cb, w_r,
        ], dtype=np.float32)
        return state

    def get_action_mask(self) -> np.ndarray:
        """获取当前节点的可行动作掩码

        Returns:
            mask: [len(self.links)] 0/1 向量，1 表示该链路可走
                  可走条件：链路起点 = 当前节点，且终点未访问过（防止绕路）
        """
        mask = np.zeros(len(self.links), dtype=np.float32)
        feasible = self._get_feasible_actions()
        for link_idx in feasible:
            mask[link_idx] = 1.0
        return mask

    def _get_feasible_actions(self) -> List[int]:
        """获取当前节点所有可行动作（链路索引）

        过滤规则：
            1. 链路起点 = 当前节点
            2. 链路终点未访问过（防止回头绕路）
            3. Phase F 新增：地理方向硬约束
               - 屏蔽严重后退动作（geo_delta > GEO_HARD_BLOCK_THRESHOLD_KM）
               - 防止 PPO 选择"上海→安克雷奇"反向跨洋等荒谬路径
               - 兜底机制：若所有动作都被屏蔽（死胡同），按后退距离升序排序，
                 优先选后退最小的动作（而非随机选）
        """
        feasible = []
        feasible_without_geo: List[Tuple[float, int]] = []  # (geo_delta, link_idx)

        current_geo_dist = float(self.geo_dist_to_goal[self.current_idx])

        for link_idx in self.adjacency.get(self.current_idx, []):
            link = self.links[link_idx]
            if link.to_idx in self.visited:
                continue

            # Phase F 地理方向硬约束
            to_geo_dist = float(self.geo_dist_to_goal[link.to_idx])
            geo_delta = to_geo_dist - current_geo_dist  # 正=后退

            # 记录不带地理约束的可行动作（兜底用，按后退距离排序）
            feasible_without_geo.append((geo_delta, link_idx))

            if geo_delta > GEO_HARD_BLOCK_THRESHOLD_KM:
                # 严重后退：屏蔽此动作
                continue

            feasible.append(link_idx)

        # 兜底：若地理约束屏蔽了所有动作，按后退距离升序排序，优先选后退最小的
        if not feasible and feasible_without_geo:
            feasible_without_geo.sort(key=lambda x: x[0])  # 升序：后退小的在前
            return [link_idx for _, link_idx in feasible_without_geo]

        return feasible

    def get_feasible_action_indices(self) -> List[int]:
        """对外暴露的可行动作列表（PPO V2 用于动态动作空间）"""
        return self._get_feasible_actions()

    # ====================================================================
    # BFS 距离计算（启发式距离）
    # ====================================================================
    def _bfs_distances(self, goal_idx: int) -> np.ndarray:
        """从 goal_idx 出发 BFS，计算所有节点到 goal 的最短跳数

        Returns:
            distances: [N] 数组，distances[i] = 节点 i 到 goal 的跳数
                       不可达节点的距离设为 N（视为无穷大）
        """
        N = len(self.nodes)
        distances = np.full(N, N, dtype=np.int32)  # 默认不可达
        distances[goal_idx] = 0
        queue = deque([goal_idx])

        # 反向邻接表：node_idx -> [from_idx, ...]
        reverse_adj: Dict[int, List[int]] = {i: [] for i in range(N)}
        for link in self.links:
            reverse_adj[link.to_idx].append(link.from_idx)

        while queue:
            u = queue.popleft()
            for v in reverse_adj.get(u, []):
                if distances[v] == N:  # 未访问
                    distances[v] = distances[u] + 1
                    queue.append(v)

        return distances

    # ====================================================================
    # Phase E：地理距离计算（Haversine 球面距离）
    # ====================================================================
    @staticmethod
    def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """计算两点间球面距离（Haversine 公式）

        Args:
            lat1, lng1: 起点纬度/经度（度）
            lat2, lng2: 终点纬度/经度（度）

        Returns:
            距离（km），地球半径 R=6371km
        """
        R = 6371.0  # 地球平均半径（km）
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lng2 - lng1)
        a = (
            math.sin(dphi / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        )
        return 2.0 * R * math.asin(min(1.0, math.sqrt(a)))

    def _compute_geo_distances(self, goal_idx: int) -> np.ndarray:
        """计算所有节点到终点的 Haversine 球面距离（km）

        Phase E：用于地理方向引导，防止 PPO 走出"阿拉山口掉头"等违反物流常理的路径

        Args:
            goal_idx: 终点节点索引

        Returns:
            distances: [N] 数组，distances[i] = 节点 i 到终点的球面距离（km）
                       缺失经纬度的节点返回 NORM_GEO_DIST（视为无穷远，强烈惩罚）
        """
        N = len(self.nodes)
        distances = np.full(N, NORM_GEO_DIST, dtype=np.float64)
        goal_node = self.nodes[goal_idx]
        goal_lat = float(getattr(goal_node, "lat", 0.0) or 0.0)
        goal_lng = float(getattr(goal_node, "lng", 0.0) or 0.0)
        distances[goal_idx] = 0.0
        for i, node in enumerate(self.nodes):
            if i == goal_idx:
                continue
            lat = float(getattr(node, "lat", 0.0) or 0.0)
            lng = float(getattr(node, "lng", 0.0) or 0.0)
            distances[i] = self._haversine(lat, lng, goal_lat, goal_lng)
        return distances

    # ====================================================================
    # 工具方法
    # ====================================================================
    def get_node_code(self, idx: int) -> str:
        """索引 -> 节点 code"""
        return self.nodes[idx].code if 0 <= idx < len(self.nodes) else ""

    def get_node_name_cn(self, idx: int) -> str:
        """索引 -> 节点中文名"""
        return self.nodes[idx].name_cn if 0 <= idx < len(self.nodes) else ""

    def get_path_summary(self) -> Dict[str, Any]:
        """获取当前已走路径的汇总信息"""
        route_nodes = [self.get_node_name_cn(self.start_idx)]
        for link_idx in self.path_links:
            link = self.links[link_idx]
            route_nodes.append(self.get_node_name_cn(link.to_idx))

        transport_modes = [self.links[li].mode for li in self.path_links]

        return {
            "route_nodes": route_nodes,
            "transport_modes": transport_modes,
            "total_cost": self.acc_cost,
            "total_time": self.acc_time,
            "total_carbon": self.acc_carbon,
            "total_risk": self.acc_risk,
            "steps": self.step_count,
            "success": self.current_idx == self.end_idx,
            "start_code": self.get_node_code(self.start_idx),
            "end_code": self.get_node_code(self.end_idx),
        }

    @property
    def num_nodes(self) -> int:
        return len(self.nodes)

    @property
    def num_links(self) -> int:
        return len(self.links)
