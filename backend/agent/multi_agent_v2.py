"""多智能体协同管理器 V2（Phase B：真实 PPO 寻路 + Dijkstra 兜底）

与 V1 `multi_agent.py` 的核心区别：
    - V1: Dijkstra 生成候选路径 → PPO 对候选路径打分（"马后炮"打分）
    - V2: PPO 真实探索路径（env.reset → PPO.act → env.step 循环） → 失败时 Dijkstra 兜底

V2 寻路决策链路：
    1. env.reset(start, end, weights) 重置环境
    2. 循环：
        a. PPO 根据当前 State 输出可行动作的概率分布
        b. 采样动作 → env.step(action) → 获得新状态、奖励、done 标记
        c. 若 done：检查是否到达终点
            - 到达终点：成功，构建路径
            - 死胡同/超步：触发 Dijkstra 兜底，从当前节点到终点补全剩余路径
    3. 拼接 PPO 已走路径 + Dijkstra 兜底路径，构建完整 route 结果

向后兼容：
    本模块独立存在，不修改 V1 `multi_agent.py`。
    `optimization_service.py` 仍调用 V1，本模块待 Phase C 切流后启用。
"""
from __future__ import annotations

import heapq
import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from .environment_v2 import (
    GEO_BACKWARD_THRESHOLD_KM,
    GEO_HARD_BLOCK_THRESHOLD_KM,
    LogisticsEnvV2,
)
from .ppo_agent_v2 import PPOAgentV2

logger = logging.getLogger(__name__)


# Phase F：Dijkstra 地理方向惩罚系数
# 后退每 km 增加的边权惩罚（让 Dijkstra 自然避开大折返）
DIJKSTRA_GEO_PENALTY_PER_KM = 0.005


# ===== 智能体定义（与 V1 保持一致，便于前端兼容）=====
AGENT_TYPES: Dict[str, str] = {
    "pickup": "揽收智能体",
    "trunk": "干线智能体",
    "compliance": "合规智能体",
    "delivery": "交付智能体",
}

# 按运输方式映射智能体
MODE_TO_AGENT: Dict[str, str] = {
    "land": "pickup",
    "rail": "trunk",
    "sea": "trunk",
    "air": "trunk",
}


def _classify_segment(position: int, total: int, mode: str) -> str:
    """根据段位置和运输方式分类智能体（与 V1 逻辑一致）"""
    if total <= 1:
        return "trunk"
    if position == 0:
        return "pickup"
    if position == total - 1:
        return "delivery"
    if mode in ("sea", "air") and position == total // 2:
        return "compliance"
    return "trunk"


def _agent_label(agent_type: str) -> str:
    """智能体类型 -> 前端展示标签"""
    mapping = {
        "pickup": "pickup_agent",
        "trunk": "trunk_agent",
        "compliance": "compliance_agent",
        "delivery": "delivery_agent",
    }
    return mapping.get(agent_type, "trunk_agent")


def risk_to_level(risk: float) -> str:
    """风险数值转等级字符串（与 V1 environment.py 一致）"""
    if risk < 0.10:
        return "low"
    elif risk < 0.18:
        return "moderate"
    elif risk < 0.25:
        return "high"
    else:
        return "critical"


class MultiAgentCoordinatorV2:
    """多智能体协同管理器 V2

    核心方法：
        coordinate_route(env, start_code, end_code, weights, agent)
        -> Dict[str, Any]

    决策流程：
        1. PPO 真实探索：env.reset → PPO.act → env.step 循环
        2. 若 PPO 探索失败（死胡同/超步）：从当前节点用 Dijkstra 补全
        3. 拼接完整路径，构建与 V1 兼容的 route 结果字典
    """

    def __init__(self) -> None:
        # V2 仍保留多智能体定义，但寻路核心是单个 PPO Agent
        # 4 类 agent 的差异主要体现在路径分段标注上
        self.agents: Dict[str, Optional[PPOAgentV2]] = {
            "pickup": None,
            "trunk": None,
            "compliance": None,
            "delivery": None,
        }

    def bind_agent(self, agent_type: str, agent: PPOAgentV2) -> None:
        if agent_type in self.agents:
            self.agents[agent_type] = agent

    def bind_unified(self, agent: PPOAgentV2) -> None:
        for k in self.agents:
            self.agents[k] = agent

    # ====================================================================
    # Dijkstra 兜底算法（基于动态图 + Phase F 地理方向感知）
    # ====================================================================
    def _link_weight(
        self,
        link,
        weights: Tuple[float, float, float, float],
        geo_dist_to_goal: Optional[np.ndarray] = None,
        current_geo_dist: Optional[float] = None,
    ) -> float:
        """计算链路的加权成本（Dijkstra 边权，值越小越优）

        Phase F 新增：地理方向惩罚
            - 若传入 geo_dist_to_goal 和 current_geo_dist，则对后退动作施加惩罚
            - 后退距离超过 GEO_BACKWARD_THRESHOLD_KM 时，每 km 增加惩罚
            - 超过 GEO_HARD_BLOCK_THRESHOLD_KM 时，惩罚量极大（近乎禁止）
            - 防止 Dijkstra 找到"汉堡→苏伊士→上海"这种全球大折返路径
        """
        wc, wt, wc_, wr = weights
        base_weight = (
            wc * (link.cost_usd / 100000.0)
            + wt * (link.time_days / 60.0)
            + wc_ * (link.carbon_kg / 100000.0)
            + wr * (link.base_risk)
        )

        # Phase F 地理方向惩罚
        if geo_dist_to_goal is not None and current_geo_dist is not None:
            to_geo_dist = float(geo_dist_to_goal[link.to_idx])
            geo_delta = to_geo_dist - current_geo_dist  # 正=后退
            if geo_delta > GEO_HARD_BLOCK_THRESHOLD_KM:
                # 严重后退：近乎禁止（惩罚 1000，远超任何成本权重）
                base_weight += 1000.0
            elif geo_delta > GEO_BACKWARD_THRESHOLD_KM:
                # 中度后退：按 km 比例惩罚
                excess = geo_delta - GEO_BACKWARD_THRESHOLD_KM
                base_weight += excess * DIJKSTRA_GEO_PENALTY_PER_KM

        return base_weight

    def _coordinate_route_multi_sample(
        self,
        env: LogisticsEnvV2,
        start_code: str,
        end_code: str,
        weights: Tuple[float, float, float, float],
        agent: "PPOAgentV2",
        sample_n: int,
    ) -> Dict[str, Any]:
        """Phase D：多次 stochastic 采样取最优路径

        策略：
            1. 跑 sample_n 次 stochastic 采样（deterministic=False）
            2. Phase F 新增：地理合理性硬过滤 - 跳过最大后退 > 1500km 的路径
            3. Phase F 强化：跳过包含重复节点的路径（避免 PPO 绕圈）
            4. Phase F 强化：综合评分 = path_reward - 路径长度惩罚 - 地理后退惩罚
            5. 取综合评分最高的路径返回

        用途：
            - 解决 PPO 在 deterministic=True 时输出固定路径的问题
            - 让不同 weights 能生成不同路径（通过随机探索发现偏好匹配的路径）
            - Phase F：避免 PPO 采样到地理上荒谬的路径（如上海→东京→安克雷奇→...）
            - Phase F 强化：避免短距离起终点绕远路（如深圳→香港绕道阿拉斯加）
        """
        best_result: Optional[Dict[str, Any]] = None
        best_score: float = float("-inf")
        # Phase F：分两档筛选
        # - 严格档：最大后退 ≤ 800km（优先选择）
        # - 宽松档：最大后退 ≤ 1500km（次优选择）
        # - 超过 1500km：直接丢弃
        GEO_TIGHT_KM = 800.0
        GEO_LOOSE_KM = 1500.0
        # Phase F 强化：路径长度惩罚系数（每多 1 跳扣 0.5 分）
        HOP_PENALTY = 0.5
        # Phase F 强化：地理后退惩罚系数（每 km 后退扣 0.001 分）
        GEO_BACKWARD_PENALTY = 0.001
        loose_candidates: List[Tuple[float, Dict[str, Any]]] = []  # (score, result)

        end_idx = env.node_code_to_idx.get(end_code)
        geo_dist_to_goal = (
            env._compute_geo_distances(end_idx) if end_idx is not None else None
        )

        for i in range(sample_n):
            # 每次用不同随机种子，确保路径多样
            result = self._coordinate_route_single(
                env, start_code, end_code, weights, agent, deterministic=False
            )
            if not result.get("success", False):
                continue

            route_codes = result.get("route_codes", [])
            if len(route_codes) < 2:
                continue

            # Phase F 强化：检测重复节点（PPO 不应产生重复，Dijkstra 兜底可能产生）
            if len(set(route_codes)) != len(route_codes):
                continue

            # Phase F：地理合理性硬过滤
            if geo_dist_to_goal is not None:
                max_backward = 0.0
                total_backward = 0.0
                for j in range(len(route_codes) - 1):
                    from_idx = env.node_code_to_idx.get(route_codes[j])
                    to_idx = env.node_code_to_idx.get(route_codes[j + 1])
                    if from_idx is None or to_idx is None:
                        continue
                    delta = float(geo_dist_to_goal[to_idx]) - float(geo_dist_to_goal[from_idx])
                    if delta > 0:
                        total_backward += delta
                        if delta > max_backward:
                            max_backward = delta
                # 超过宽松阈值：丢弃
                if max_backward > GEO_LOOSE_KM:
                    continue

                # Phase F 强化：综合评分 = reward - 跳数惩罚 - 总后退惩罚
                path_reward = self._evaluate_path_reward(env, result, weights)
                hop_count = len(route_codes)
                composite_score = (
                    path_reward
                    - hop_count * HOP_PENALTY
                    - total_backward * GEO_BACKWARD_PENALTY
                )

                # 严格档：参与最优选择
                # 宽松档：暂存，作为后备
                if max_backward <= GEO_TIGHT_KM:
                    if composite_score > best_score:
                        best_score = composite_score
                        best_result = result
                        best_result["sample_reward"] = path_reward
                        best_result["sample_score"] = composite_score
                        best_result["sample_idx"] = i
                else:
                    loose_candidates.append((composite_score, result))

        # 如果严格档无候选，从宽松档选 score 最高的
        if best_result is None and loose_candidates:
            loose_candidates.sort(key=lambda x: x[0], reverse=True)
            best_result = loose_candidates[0][1]
            best_result["sample_reward"] = loose_candidates[0][0]

        # 如果所有采样都失败或不合理，回退到 deterministic=True
        if best_result is None:
            return self._coordinate_route_single(
                env, start_code, end_code, weights, agent, deterministic=True
            )

        return best_result

    def _evaluate_path_reward(
        self,
        env: LogisticsEnvV2,
        result: Dict[str, Any],
        weights: Tuple[float, float, float, float],
    ) -> float:
        """评估路径的总 reward（用 env 的 reward 函数重放）"""
        # Phase D 修复：使用 route_codes（节点 code）而非 route_nodes（中文名）
        # env.reset() 和 node_code_to_idx 都以 code 为键
        route_codes = result.get("route_codes", [])
        transport_modes = result.get("transport_modes", [])
        if len(route_codes) < 2:
            return float("-inf")

        # 重置环境，按路径重放
        env.reset(route_codes[0], route_codes[-1], weights)
        total_reward = 0.0
        for i, mode in enumerate(transport_modes):
            from_idx = env.node_code_to_idx.get(route_codes[i])
            to_idx = env.node_code_to_idx.get(route_codes[i + 1])
            if from_idx is None or to_idx is None:
                return float("-inf")

            # 找到对应的链路
            found_link = None
            for link_idx in env.adjacency.get(from_idx, []):
                link = env.links[link_idx]
                if link.to_idx == to_idx and link.mode == mode:
                    found_link = link
                    break
            if found_link is None:
                return float("-inf")

            dist_before = env.dist_to_goal[env.current_idx]
            env.current_idx = to_idx
            env.visited.add(to_idx)
            env.step_count += 1
            env.acc_cost += found_link.cost_usd
            env.acc_time += found_link.time_days
            env.acc_carbon += found_link.carbon_kg
            env.acc_risk += found_link.base_risk

            # 用 env 的 reward 函数计算
            step_reward = env._compute_reward(found_link, dist_before)
            total_reward += step_reward

        # 加上终局奖励
        if env.current_idx == env.end_idx:
            total_reward += env._compute_terminal_reward("reach_goal")

        return total_reward

    def _coordinate_route_single(
        self,
        env: LogisticsEnvV2,
        start_code: str,
        end_code: str,
        weights: Tuple[float, float, float, float],
        agent: "PPOAgentV2",
        deterministic: bool = False,
    ) -> Dict[str, Any]:
        """单次 coordinate_route（原 coordinate_route 逻辑，重构后供多次调用）"""
        # 临时把 sample_n=1 传给 coordinate_route，避免无限递归
        return self._coordinate_route_impl(
            env, start_code, end_code, weights, agent, deterministic
        )

    def _coordinate_route_impl(
        self,
        env: LogisticsEnvV2,
        start_code: str,
        end_code: str,
        weights: Tuple[float, float, float, float],
        agent: Optional["PPOAgentV2"],
        deterministic: bool = False,
    ) -> Dict[str, Any]:
        """coordinate_route 的实际实现（不含 sample_n 逻辑）"""
        if start_code not in env.node_code_to_idx:
            return self._empty_route(start_code, end_code)
        if end_code not in env.node_code_to_idx:
            return self._empty_route(start_code, end_code)

        start_idx = env.node_code_to_idx[start_code]
        end_idx = env.node_code_to_idx[end_code]
        if start_idx == end_idx:
            return self._empty_route(start_code, end_code)

        # ========== PPO 真实探索阶段 ==========
        ppo_path_links: List[int] = []
        ppo_success = False
        fallback_reason: Optional[str] = None

        if agent is not None:
            try:
                state = env.reset(start_code, end_code, weights)
                done = False
                while not done:
                    feasible = env.get_feasible_action_indices()
                    if not feasible:
                        fallback_reason = "dead_end"
                        break

                    action, log_prob, value = agent.act(
                        state, env, deterministic=deterministic
                    )
                    if action < 0:
                        fallback_reason = "no_action"
                        break

                    next_state, reward, done, info = env.step(action)
                    ppo_path_links.append(action)
                    state = next_state

                    if env.step_count >= 15:  # Phase F 强化：50 → 15，避免 PPO 乱绕
                        fallback_reason = "timeout"
                        break

                ppo_success = (env.current_idx == end_idx)
            except Exception as e:
                logger.error(f"PPO 探索失败: {e}")
                ppo_success = False
                fallback_reason = f"exception: {e}"

        # ========== Dijkstra 兜底阶段 ==========
        # Phase F 强化：PPO 失败时的兜底策略
        # - PPO 走的步数 ≤ 4：从 PPO 当前位置 Dijkstra（PPO 探索方向大致正确）
        # - PPO 走的步数 > 4：从起点重新 Dijkstra（PPO 已严重偏离方向）
        #   这样避免 PPO 走了 21 步到错误位置后，Dijkstra 还要从那里继续延伸
        dijkstra_used = False
        dijkstra_path_links: List[int] = []
        PPO_FALLBACK_MAX_STEPS = 4  # PPO 走到这个步数以内才从当前位置兜底

        if not ppo_success:
            dijkstra_used = True
            if len(ppo_path_links) <= PPO_FALLBACK_MAX_STEPS and env.current_idx != start_idx:
                # PPO 探索方向大致正确：从 PPO 当前位置继续 Dijkstra
                dijkstra_start = env.current_idx
                avoid_nodes = set(env.visited) - {dijkstra_start, end_idx}
                # 重新 reset 环境（清空 PPO 走过的路径，仅保留起点）
                env.reset(start_code, end_code, weights)
                # 重新走 PPO 的路径（让 env 状态正确）
                for a in ppo_path_links:
                    env.step(a)
            else:
                # PPO 已严重偏离：从起点重新 Dijkstra，丢弃 PPO 的所有路径
                ppo_path_links = []  # 清空 PPO 路径，避免拼接出超长路径
                env.reset(start_code, end_code, weights)
                dijkstra_start = start_idx
                avoid_nodes = set()

            try:
                dijkstra_path_links = self._dijkstra(
                    env, dijkstra_start, end_idx, weights,
                    avoid_nodes=avoid_nodes,
                ) or []
                if not dijkstra_path_links and avoid_nodes:
                    dijkstra_path_links = self._dijkstra(
                        env, dijkstra_start, end_idx, weights,
                        avoid_nodes=set(),
                    ) or []
            except Exception as e:
                logger.error(f"Dijkstra 兜底失败: {e}")
                dijkstra_path_links = []

            if not dijkstra_path_links and not ppo_path_links:
                return self._empty_route(start_code, end_code)

        # ========== 合并路径 ==========
        full_path_links = ppo_path_links + dijkstra_path_links
        success = (env.get_node_code(env.current_idx) == end_code) or (
            full_path_links and env.links[full_path_links[-1]].to_idx == end_idx
        )

        # ========== Phase F 强化：路径合理性后处理 ==========
        # 检查 PPO 路径是否存在以下不合理情况：
        #   1. 重复节点（PPO 绕圈）
        #   2. 地理大后退（单步后退 > 1500km）
        #   3. 路径过长（> 12 跳，超过合理多式联运上限）
        # 若存在，丢弃 PPO 路径，用纯 Dijkstra 从起点重新规划
        if success and ppo_path_links:
            route_node_indices = [env.links[lk].from_idx for lk in full_path_links]
            route_node_indices.append(env.links[full_path_links[-1]].to_idx)

            # 检查 1：重复节点
            has_duplicate = len(set(route_node_indices)) != len(route_node_indices)

            # 检查 2：地理大后退
            geo_dist_to_goal_check = getattr(env, "geo_dist_to_goal", None)
            if geo_dist_to_goal_check is None or len(geo_dist_to_goal_check) == 0:
                geo_dist_to_goal_check = env._compute_geo_distances(end_idx)
            max_backward = 0.0
            for k in range(len(route_node_indices) - 1):
                d_from = float(geo_dist_to_goal_check[route_node_indices[k]])
                d_to = float(geo_dist_to_goal_check[route_node_indices[k + 1]])
                delta = d_to - d_from
                if delta > max_backward:
                    max_backward = delta
            has_geo_violation = max_backward > 1500.0

            # 检查 3：路径过长
            too_long = len(full_path_links) > 12

            if has_duplicate or has_geo_violation or too_long:
                logger.warning(
                    f"PPO 路径不合理 (duplicate={has_duplicate}, "
                    f"max_backward={max_backward:.0f}km, hops={len(full_path_links)})，"
                    f"回退到纯 Dijkstra 重新规划"
                )
                # 重新 reset 环境，丢弃 PPO 路径
                env.reset(start_code, end_code, weights)
                try:
                    dijkstra_only = self._dijkstra(
                        env, start_idx, end_idx, weights, avoid_nodes=set()
                    ) or []
                except Exception as e:
                    logger.error(f"后处理 Dijkstra 失败: {e}")
                    dijkstra_only = []

                if dijkstra_only:
                    return self._build_route_result(
                        env=env,
                        path_links=dijkstra_only,
                        start_code=start_code,
                        end_code=end_code,
                        success=True,
                        ppo_steps=0,
                        dijkstra_steps=len(dijkstra_only),
                        fallback_reason="ppo_unreasonable_postprocess",
                        dijkstra_used=True,
                    )

        return self._build_route_result(
            env=env,
            path_links=full_path_links,
            start_code=start_code,
            end_code=end_code,
            success=success,
            ppo_steps=len(ppo_path_links),
            dijkstra_steps=len(dijkstra_path_links),
            fallback_reason=fallback_reason,
            dijkstra_used=dijkstra_used,
        )

    def _dijkstra(
        self,
        env: LogisticsEnvV2,
        start_idx: int,
        end_idx: int,
        weights: Tuple[float, float, float, float],
        avoid_nodes: Optional[set] = None,
    ) -> Optional[List[int]]:
        """Dijkstra 最短路径（动态图版 + Phase F 地理方向感知）

        Phase F 修复：在边权计算中加入地理方向惩罚，防止 Dijkstra 找到
        "汉堡→苏伊士→上海"这种地理上荒谬的大折返路径。

        Args:
            env: V2 环境（已 load_from_db）
            start_idx: 起点节点索引
            end_idx: 终点节点索引
            weights: (cost, time, carbon, risk) 权重
            avoid_nodes: 需要避开的节点索引集合（防止 PPO 已访问节点回头）

        Returns:
            链路索引列表，或 None（不可达）
        """
        n = len(env.nodes)
        dist = [float("inf")] * n
        dist[start_idx] = 0.0
        prev_link = [-1] * n
        visited = [False] * n
        avoid = avoid_nodes or set()

        # Phase F：获取预计算的地理距离矩阵
        # 注意：env.geo_dist_to_goal 是在 env.reset() 时计算的
        # 兜底场景下 env 可能已经被 reset 过，geo_dist_to_goal 可用
        geo_dist_to_goal = getattr(env, "geo_dist_to_goal", None)
        if geo_dist_to_goal is None or len(geo_dist_to_goal) == 0:
            # 若未预计算，临时计算
            geo_dist_to_goal = env._compute_geo_distances(end_idx)

        heap = [(0.0, start_idx)]
        while heap:
            d, u = heapq.heappop(heap)
            if visited[u]:
                continue
            visited[u] = True
            if u == end_idx:
                break

            # 当前节点的地理距离
            current_geo_dist = float(geo_dist_to_goal[u])

            for link_idx in env.adjacency.get(u, []):
                link = env.links[link_idx]
                v = link.to_idx
                if visited[v] or v in avoid:
                    continue
                # Phase F：传入地理距离参数
                w = self._link_weight(
                    link, weights,
                    geo_dist_to_goal=geo_dist_to_goal,
                    current_geo_dist=current_geo_dist,
                )
                nd = d + w
                if nd < dist[v]:
                    dist[v] = nd
                    prev_link[v] = link_idx
                    heapq.heappush(heap, (nd, v))

        if dist[end_idx] == float("inf"):
            return None

        # 回溯路径
        path_links: List[int] = []
        cur = end_idx
        while cur != start_idx and prev_link[cur] != -1:
            path_links.append(prev_link[cur])
            cur = env.links[prev_link[cur]].from_idx
        path_links.reverse()
        return path_links

    # ====================================================================
    # 核心方法：真实 PPO 寻路 + Dijkstra 兜底
    # ====================================================================
    def coordinate_route(
        self,
        env: LogisticsEnvV2,
        start_code: str,
        end_code: str,
        weights: Tuple[float, float, float, float],
        agent: Optional[PPOAgentV2] = None,
        deterministic: bool = False,
        sample_n: int = 1,  # Phase D: 多次采样取最优
    ) -> Dict[str, Any]:
        """协调生成完整路径（PPO 真实探索 + Dijkstra 兜底）

        Args:
            env: V2 环境（已 load_from_db）
            start_code: 起点节点 code
            end_code: 终点节点 code
            weights: (cost, time, carbon, risk) 权重
            agent: 已 bind_env 的 PPO V2 agent（None 时纯 Dijkstra）
            deterministic: PPO 推理是否贪心（True 用于部署，False 用于训练探索）
            sample_n: Phase D 新增：stochastic 采样次数，取 reward 最高的路径
                      当 sample_n > 1 时，强制 deterministic=False，跑多次取最优

        Returns:
            与 V1 coordinate_route 兼容的结果字典
        """
        # Phase D：多次采样取最优
        if sample_n > 1 and agent is not None:
            return self._coordinate_route_multi_sample(
                env, start_code, end_code, weights, agent, sample_n
            )
        # 单次调用：委托给 _coordinate_route_impl
        return self._coordinate_route_impl(
            env, start_code, end_code, weights, agent, deterministic
        )

    # ====================================================================
    # 结果构建
    # ====================================================================
    def _build_route_result(
        self,
        env: LogisticsEnvV2,
        path_links: List[int],
        start_code: str,
        end_code: str,
        success: bool,
        ppo_steps: int = 0,
        dijkstra_steps: int = 0,
        fallback_reason: Optional[str] = None,
        dijkstra_used: bool = False,
    ) -> Dict[str, Any]:
        """构建与 V1 兼容的 route 结果字典

        附加 V2 专属字段：
            - ppo_steps: PPO 探索的步数
            - dijkstra_steps: Dijkstra 兜底的步数
            - fallback_reason: 触发兜底的原因（None 表示未触发）
            - dijkstra_used: 是否使用了 Dijkstra 兜底
        """
        route_nodes: List[str] = []
        route_codes: List[str] = []  # Phase D 修复：并行保存节点 code，供 _evaluate_path_reward 使用
        transport_modes: List[str] = []
        steps_raw: List[Dict[str, Any]] = []
        total_cost = 0.0
        total_time = 0.0
        total_carbon = 0.0
        total_risk = 0.0

        if path_links:
            # 起点
            first_link = env.links[path_links[0]]
            route_nodes.append(env.get_node_name_cn(first_link.from_idx))
            route_codes.append(env.get_node_code(first_link.from_idx))

            for link_idx in path_links:
                link = env.links[link_idx]
                route_nodes.append(env.get_node_name_cn(link.to_idx))
                route_codes.append(env.get_node_code(link.to_idx))
                transport_modes.append(link.mode)
                steps_raw.append({
                    "from": env.get_node_name_cn(link.from_idx),
                    "to": env.get_node_name_cn(link.to_idx),
                    "from_code": env.get_node_code(link.from_idx),
                    "to_code": env.get_node_code(link.to_idx),
                    "mode": link.mode,
                    "cost": link.cost_usd,
                    "time": link.time_days,
                    "carbon": link.carbon_kg,
                    "risk": link.base_risk,
                })
                total_cost += link.cost_usd
                total_time += link.time_days
                total_carbon += link.carbon_kg
                total_risk += link.base_risk
        else:
            route_nodes.append(env.get_node_name_cn(
                env.node_code_to_idx.get(start_code, 0)
            ))
            route_codes.append(start_code)

        total_segments = len(steps_raw)
        steps_detail = []
        for i, step in enumerate(steps_raw):
            agent_type = _classify_segment(i, total_segments, step["mode"])
            steps_detail.append({
                "from": step["from"],
                "to": step["to"],
                "from_code": step.get("from_code", ""),
                "to_code": step.get("to_code", ""),
                "mode": step["mode"],
                "cost": step["cost"],
                "time": step["time"],
                "carbon": step["carbon"],
                "risk": step["risk"],
                "risk_level": risk_to_level(step["risk"]),
                "agent": _agent_label(agent_type),
                "agent_type": agent_type,
                "agent_name": AGENT_TYPES[agent_type],
            })

        return {
            # 与 V1 兼容的核心字段
            "route_nodes": route_nodes,
            "route_codes": route_codes,  # Phase D 修复：节点 code 列表，供 reward 重放使用
            "transport_modes": transport_modes,
            "steps_detail": steps_detail,
            "total_cost": total_cost,
            "total_time": total_time,
            "total_carbon": total_carbon,
            "total_risk": total_risk,
            "success": success,
            # V2 专属诊断字段
            "ppo_steps": ppo_steps,
            "dijkstra_steps": dijkstra_steps,
            "fallback_reason": fallback_reason,
            "dijkstra_used": dijkstra_used,
        }

    def _empty_route(self, start_code: str, end_code: str) -> Dict[str, Any]:
        """空路径结果（与 V1 兼容）"""
        return {
            "route_nodes": [start_code],
            "route_codes": [start_code],
            "transport_modes": [],
            "steps_detail": [],
            "total_cost": 0.0,
            "total_time": 0.0,
            "total_carbon": 0.0,
            "total_risk": 0.0,
            "success": False,
            "ppo_steps": 0,
            "dijkstra_steps": 0,
            "fallback_reason": "no_path",
            "dijkstra_used": False,
        }

    # ====================================================================
    # 稳定性评估（与 V1 接口一致，用于多次采样评估路径一致性）
    # ====================================================================
    def evaluate_stability(
        self,
        env: LogisticsEnvV2,
        start_code: str,
        end_code: str,
        weights: Tuple[float, float, float, float],
        agent: Optional[PPOAgentV2] = None,
        runs: int = 10,
    ) -> Tuple[float, float]:
        """评估路径稳定性（多次采样统计成功率与成本方差）

        Returns:
            (success_rate, cost_variance)
        """
        successes = 0
        costs: List[float] = []
        for _ in range(runs):
            result = self.coordinate_route(
                env, start_code, end_code, weights, agent, deterministic=False
            )
            if result["success"]:
                successes += 1
                costs.append(result["total_cost"])
        success_rate = successes / runs
        variance = float(np.var(costs)) if len(costs) >= 2 else 0.0
        return success_rate, variance


# 全局单例（V2，与 V1 multi_agent 分离）
multi_agent_v2 = MultiAgentCoordinatorV2()
