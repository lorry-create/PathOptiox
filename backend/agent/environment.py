"""物流网络环境（Gym 风格接口）

内置 12 个核心国际物流节点 + 24 条运输链路，覆盖海运/空运/陆运/铁路 4 种方式。
支持 normal/stress/policy 三种场景，动态修改链路参数。

状态空间（6 维 numpy 数组）：
    [当前节点索引归一化, 累计成本, 累计时效, 累计碳排, 累计风险, 到终点距离估计]

动作空间：
    当前节点的邻接链路集合（索引）

终止条件：到达终点 / 超过最大步数 30
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np


# ===== 节点定义（12 个核心国际物流节点）=====
NODES: List[str] = [
    "北京",       # 0
    "上海",       # 1
    "深圳",       # 2
    "广州",       # 3
    "东京",       # 4
    "首尔",       # 5
    "新加坡",     # 6
    "汉堡",       # 7
    "洛杉矶",     # 8
    "伦敦",       # 9
    "悉尼",       # 10
    "迪拜",       # 11
]

NODE_INDEX: Dict[str, int] = {name: idx for idx, name in enumerate(NODES)}

# ===== 链路定义（24 条）=====
# 每条链路: (from_idx, to_idx, transport_mode, cost_usd, time_days, carbon_kg, base_risk)
# transport_mode: sea / air / land / rail
# base_risk: 0.0~1.0
LINKS_RAW: List[Tuple[int, int, str, float, float, float, float]] = [
    # 中国国内陆运
    (0, 1, "land", 800, 1.5, 980, 0.05),     # 北京-上海
    (1, 2, "land", 600, 1.0, 620, 0.05),     # 上海-深圳
    (2, 3, "land", 300, 0.5, 320, 0.03),     # 深圳-广州
    (0, 3, "land", 1100, 2.0, 1200, 0.08),   # 北京-广州
    # 中欧班列（铁路）
    (0, 7, "rail", 14600, 20.0, 5200, 0.15), # 北京-汉堡
    (1, 7, "rail", 13800, 18.0, 4800, 0.12), # 上海-汉堡
    # 中国-东亚空运/海运
    (1, 4, "air", 8500, 0.5, 6800, 0.08),    # 上海-东京
    (1, 5, "air", 7200, 0.5, 5900, 0.06),    # 上海-首尔
    (2, 4, "sea", 3200, 4.0, 4200, 0.10),    # 深圳-东京
    (2, 5, "sea", 2800, 3.5, 3800, 0.08),    # 深圳-首尔
    # 中国-东南亚海运
    (2, 6, "sea", 4200, 7.0, 8500, 0.12),    # 深圳-新加坡
    (1, 6, "sea", 4500, 7.5, 9100, 0.12),    # 上海-新加坡
    # 东南亚-中东/欧洲海运
    (6, 11, "sea", 6800, 10.0, 14600, 0.18), # 新加坡-迪拜
    (6, 7, "sea", 9800, 18.0, 22400, 0.22),  # 新加坡-汉堡
    (11, 7, "sea", 9200, 18.0, 24180, 0.20), # 迪拜-汉堡
    # 中东-欧洲空运
    (11, 7, "air", 22400, 1.0, 12600, 0.15), # 迪拜-汉堡
    # 中国-北美海运/空运
    (1, 8, "sea", 8200, 14.0, 18600, 0.20),  # 上海-洛杉矶
    (2, 8, "air", 18500, 1.0, 9800, 0.12),   # 深圳-洛杉矶
    # 北美-欧洲
    (8, 9, "air", 12800, 0.8, 7400, 0.10),   # 洛杉矶-伦敦
    (8, 7, "sea", 7600, 12.0, 17200, 0.18),  # 洛杉矶-汉堡
    # 欧洲-中东
    (9, 7, "air", 5600, 0.5, 4200, 0.08),    # 伦敦-汉堡
    (9, 11, "air", 9800, 1.0, 6200, 0.12),   # 伦敦-迪拜
    # 澳洲-亚洲
    (6, 10, "sea", 5400, 8.0, 12800, 0.15),  # 新加坡-悉尼
    (10, 8, "air", 14200, 1.0, 8600, 0.10),  # 悉尼-洛杉矶
]

# 场景系数：场景 -> (cost_factor, time_factor, risk_factor)
SCENE_FACTORS: Dict[str, Tuple[float, float, float]] = {
    "normal": (1.0, 1.0, 1.0),
    "stress": (1.0, 1.8, 2.0),   # 时效×1.8、风险×2.0
    "policy": (1.3, 1.0, 1.5),   # 成本×1.3、风险×1.5
}

MAX_STEPS = 30
REWARD_REACH_GOAL = 10.0
REWARD_TIMEOUT = -5.0

# 状态空间维度
STATE_DIM = 6
# 归一化常数（避免数值过大）
NORM_COST = 100000.0
NORM_TIME = 60.0
NORM_CARBON = 100000.0
NORM_RISK = 10.0
NORM_DIST = 12.0


class Link:
    """运输链路"""

    __slots__ = ("from_idx", "to_idx", "mode", "cost_usd", "time_days",
                 "carbon_kg", "base_risk", "reverse")

    def __init__(self, from_idx: int, to_idx: int, mode: str,
                 cost_usd: float, time_days: float, carbon_kg: float,
                 base_risk: float, reverse: bool = False) -> None:
        self.from_idx = from_idx
        self.to_idx = to_idx
        self.mode = mode
        self.cost_usd = cost_usd
        self.time_days = time_days
        self.carbon_kg = carbon_kg
        self.base_risk = base_risk
        self.reverse = reverse

    def apply_scene(self, scene: str) -> "Link":
        """应用场景系数，返回新链路对象"""
        cf, tf, rf = SCENE_FACTORS.get(scene, (1.0, 1.0, 1.0))
        return Link(
            self.from_idx, self.to_idx, self.mode,
            self.cost_usd * cf,
            self.time_days * tf,
            self.carbon_kg,  # 碳排不受场景影响
            self.base_risk * rf,
            self.reverse,
        )


class LogisticsEnv:
    """物流网络环境

    Gym 风格接口：
        - reset(start_node, end_node) -> state
        - step(action) -> (next_state, reward, done, info)
    """

    def __init__(self, scene: str = "normal") -> None:
        if scene not in SCENE_FACTORS:
            scene = "normal"
        self.scene = scene
        self._build_graph()
        # 计算节点间最短跳数（BFS）用于距离估计
        self._dist_matrix = self._compute_distance_matrix()
        # 运行时状态
        self.start_idx: int = 0
        self.end_idx: int = 0
        self.current_idx: int = 0
        self.acc_cost: float = 0.0
        self.acc_time: float = 0.0
        self.acc_carbon: float = 0.0
        self.acc_risk: float = 0.0
        self.step_count: int = 0
        self._weights: Tuple[float, float, float, float] = (0.25, 0.25, 0.25, 0.25)

    def _build_graph(self) -> None:
        """构建邻接表（含正反向链路）"""
        self.links: List[Link] = []
        adj: Dict[int, List[int]] = {i: [] for i in range(len(NODES))}
        for raw in LINKS_RAW:
            f, t, mode, cost, time_, carbon, risk = raw
            link = Link(f, t, mode, cost, time_, carbon, risk, reverse=False).apply_scene(self.scene)
            idx = len(self.links)
            self.links.append(link)
            adj[f].append(idx)
            # 反向链路（同属性，from/to 互换）
            rlink = Link(t, f, mode, cost, time_, carbon, risk, reverse=True).apply_scene(self.scene)
            ridx = len(self.links)
            self.links.append(rlink)
            adj[t].append(ridx)
        self.adjacency: Dict[int, List[int]] = adj

    def _compute_distance_matrix(self) -> np.ndarray:
        """BFS 计算节点间最短跳数"""
        n = len(NODES)
        dist = np.full((n, n), float(n), dtype=np.float32)
        for src in range(n):
            dist[src, src] = 0.0
            queue = [src]
            while queue:
                u = queue.pop(0)
                for link_idx in self.adjacency[u]:
                    v = self.links[link_idx].to_idx
                    if dist[src, v] > dist[src, u] + 1:
                        dist[src, v] = dist[src, u] + 1
                        queue.append(v)
        return dist

    def set_scene(self, scene: str) -> None:
        """切换场景（重建图）"""
        if scene not in SCENE_FACTORS:
            scene = "normal"
        self.scene = scene
        self._build_graph()
        self._dist_matrix = self._compute_distance_matrix()

    def reset(self, start_node: str, end_node: str,
              weights: Optional[Tuple[float, float, float, float]] = None
              ) -> np.ndarray:
        """重置环境到起点

        Args:
            start_node: 起点节点名
            end_node: 终点节点名
            weights: (cost, time, carbon, risk) 奖励权重
        Returns:
            初始状态 numpy 数组 (6,)
        """
        if start_node not in NODE_INDEX or end_node not in NODE_INDEX:
            # 节点不存在，回退到默认
            start_node = NODES[0] if start_node not in NODE_INDEX else start_node
            end_node = NODES[1] if end_node not in NODE_INDEX else end_node
        self.start_idx = NODE_INDEX[start_node]
        self.end_idx = NODE_INDEX[end_node]
        self.current_idx = self.start_idx
        self.acc_cost = 0.0
        self.acc_time = 0.0
        self.acc_carbon = 0.0
        self.acc_risk = 0.0
        self.step_count = 0
        if weights is not None:
            self._weights = weights
        return self._get_state()

    def _get_state(self) -> np.ndarray:
        """构造状态向量"""
        dist_to_goal = self._dist_matrix[self.current_idx, self.end_idx]
        state = np.array([
            self.current_idx / max(1, len(NODES) - 1),
            self.acc_cost / NORM_COST,
            self.acc_time / NORM_TIME,
            self.acc_carbon / NORM_CARBON,
            self.acc_risk / NORM_RISK,
            dist_to_goal / NORM_DIST,
        ], dtype=np.float32)
        return state

    def get_action_space(self) -> List[int]:
        """当前节点可用的动作（邻接链路索引列表）"""
        return list(self.adjacency.get(self.current_idx, []))

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, dict]:
        """执行动作

        Args:
            action: 链路索引
        Returns:
            (next_state, reward, done, info)
        """
        info: dict = {}
        valid_actions = self.get_action_space()
        if action not in valid_actions:
            # 非法动作，给予惩罚但不终止
            reward = -1.0
            return self._get_state(), reward, False, info

        link = self.links[action]
        # 累计指标
        self.acc_cost += link.cost_usd
        self.acc_time += link.time_days
        self.acc_carbon += link.carbon_kg
        self.acc_risk += link.base_risk
        self.current_idx = link.to_idx
        self.step_count += 1

        info["link"] = link
        info["from"] = NODES[link.from_idx]
        info["to"] = NODES[link.to_idx]
        info["mode"] = link.mode
        info["cost"] = link.cost_usd
        info["time"] = link.time_days
        info["carbon"] = link.carbon_kg
        info["risk"] = link.base_risk

        done = False
        reward = 0.0
        if self.current_idx == self.end_idx:
            done = True
            reward = REWARD_REACH_GOAL
        elif self.step_count >= MAX_STEPS:
            done = True
            reward = REWARD_TIMEOUT

        # 加权负向奖励（每步即时成本）
        wc, wt, wc_, wr = self._weights
        step_penalty = (
            wc * (link.cost_usd / NORM_COST)
            + wt * (link.time_days / NORM_TIME)
            + wc_ * (link.carbon_kg / NORM_CARBON)
            + wr * (link.base_risk / 1.0)
        )
        reward -= step_penalty

        return self._get_state(), reward, done, info

    def get_action_mask(self) -> np.ndarray:
        """返回动作掩码（长度=链路总数，1=可用，0=不可用）

        用于 PPO 网络屏蔽非法动作。
        """
        mask = np.zeros(len(self.links), dtype=np.float32)
        for idx in self.get_action_space():
            mask[idx] = 1.0
        return mask

    @property
    def max_action_dim(self) -> int:
        """动作空间最大维度（链路总数，含正反向）"""
        return len(self.links)

    def get_link_info(self, link_idx: int) -> Optional[dict]:
        """获取链路详情"""
        if 0 <= link_idx < len(self.links):
            link = self.links[link_idx]
            return {
                "from": NODES[link.from_idx],
                "to": NODES[link.to_idx],
                "mode": link.mode,
                "cost": link.cost_usd,
                "time": link.time_days,
                "carbon": link.carbon_kg,
                "risk": link.base_risk,
            }
        return None

    def risk_to_level(self, risk: float) -> str:
        """风险数值转等级字符串"""
        if risk < 0.10:
            return "low"
        elif risk < 0.18:
            return "moderate"
        elif risk < 0.25:
            return "high"
        else:
            return "critical"
