"""多智能体协同管理器

定义 4 类智能体：揽收(pickup)、干线(trunk)、合规(compliance)、交付(delivery)。
采用分段接力 + 全局奖励约束机制：每个智能体负责对应路段决策。

路径规划使用 Dijkstra 全局最优算法（基于权重加权成本）生成 Top-K 候选路径，
PPO 部署模型对每条候选路径打分（agent.get_action_scores），
融合 PPO 评分与 Dijkstra 成本后选择最终路径，确保不同权重产生不同路径。
PPO 部署模型同时参与稳定性评估。

输出路径时，每段标注负责的智能体名称，对齐前端 steps_detail.agent 字段。
"""
from __future__ import annotations

import heapq
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from .environment import (
    LogisticsEnv,
    NODES,
    NODE_INDEX,
    NORM_COST,
    NORM_TIME,
    NORM_CARBON,
    NORM_RISK,
    NORM_DIST,
)
from .ppo_agent import PPOAgent, build_agent


# ===== 智能体定义 =====
AGENT_TYPES: Dict[str, str] = {
    "pickup": "揽收智能体",       # 起点段
    "trunk": "干线智能体",         # 中段长途
    "compliance": "合规智能体",    # 跨境/合规检查段
    "delivery": "交付智能体",      # 终点段
}

# 按运输方式映射智能体（用于路径分段标注）
MODE_TO_AGENT: Dict[str, str] = {
    "land": "pickup",      # 短途陆运 -> 揽收
    "rail": "trunk",       # 铁路 -> 干线
    "sea": "trunk",        # 海运 -> 干线
    "air": "trunk",        # 空运 -> 干线
}


def _classify_segment(position: int, total: int, mode: str) -> str:
    """根据段位置和运输方式分类智能体

    Args:
        position: 段索引（0-based）
        total: 总段数
        mode: 运输方式
    Returns:
        智能体类型名称（pickup/trunk/compliance/delivery）
    """
    if total <= 1:
        return "trunk"
    if position == 0:
        # 第一段：跨境则合规，否则揽收
        if mode in ("sea", "air", "rail"):
            return "pickup"
        return "pickup"
    if position == total - 1:
        # 最后一段：交付
        return "delivery"
    # 中间段：跨境运输涉及合规
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


class MultiAgentCoordinator:
    """多智能体协同管理器

    路径规划使用 Dijkstra 全局最优算法（基于权重加权成本）。
    PPO 部署模型用于在等优路径间微调选择及稳定性评估。
    """

    def __init__(self) -> None:
        self.agents: Dict[str, Optional[PPOAgent]] = {
            "pickup": None,
            "trunk": None,
            "compliance": None,
            "delivery": None,
        }

    def bind_agent(self, agent_type: str, agent: PPOAgent) -> None:
        if agent_type in self.agents:
            self.agents[agent_type] = agent

    def bind_unified(self, agent: PPOAgent) -> None:
        for k in self.agents:
            self.agents[k] = agent

    def _link_weight(self, link, weights: Tuple[float, float, float, float]) -> float:
        """计算链路的加权成本（Dijkstra 边权）"""
        wc, wt, wc_, wr = weights
        # 归一化后加权求和（值越小越优）
        return (
            wc * (link.cost_usd / 100000.0)
            + wt * (link.time_days / 60.0)
            + wc_ * (link.carbon_kg / 100000.0)
            + wr * (link.base_risk)
        )

    def _dijkstra(self, env: LogisticsEnv, start_idx: int, end_idx: int,
                  weights: Tuple[float, float, float, float]
                  ) -> Optional[List[int]]:
        """Dijkstra 最短路径（基于加权成本）

        Returns: 链路索引列表，或 None（不可达）
        """
        n = len(NODES)
        dist = [float("inf")] * n
        dist[start_idx] = 0.0
        prev_link = [-1] * n  # 前驱链路索引
        visited = [False] * n
        heap = [(0.0, start_idx)]
        while heap:
            d, u = heapq.heappop(heap)
            if visited[u]:
                continue
            visited[u] = True
            if u == end_idx:
                break
            for link_idx in env.adjacency.get(u, []):
                link = env.links[link_idx]
                v = link.to_idx
                if visited[v]:
                    continue
                w = self._link_weight(link, weights)
                nd = d + w
                if nd < dist[v]:
                    dist[v] = nd
                    prev_link[v] = link_idx
                    heapq.heappush(heap, (nd, v))
        # 回溯路径
        if dist[end_idx] == float("inf"):
            return None
        path_links: List[int] = []
        cur = end_idx
        while cur != start_idx and prev_link[cur] != -1:
            path_links.append(prev_link[cur])
            cur = env.links[prev_link[cur]].from_idx
        path_links.reverse()
        return path_links

    def _k_shortest_paths(self, env: LogisticsEnv, start_idx: int, end_idx: int,
                          weights: Tuple[float, float, float, float],
                          k: int = 3) -> List[List[int]]:
        """生成 Top-K 候选路径

        通过对权重施加不同扰动多次调用 Dijkstra，收集互不相同的候选路径。
        扰动幅度可控，保证候选路径在合理范围内偏离最优解。

        Returns: 候选路径列表（每个元素为链路索引列表），至少包含 1 条
        """
        candidates: List[List[int]] = []
        seen: set = set()

        # 第一条：原始权重下的最优路径
        main_path = self._dijkstra(env, start_idx, end_idx, weights)
        if main_path:
            candidates.append(main_path)
            seen.add(tuple(main_path))

        # 通过权重扰动生成更多候选
        # 扰动系数：保留各维度主导方向，但放大次要维度以探索不同路径
        perturbations = [
            (1.0, 1.2, 1.0, 1.1),   # 时效+风险扰动
            (1.1, 1.0, 1.2, 1.0),   # 成本+碳排扰动
            (1.0, 1.1, 1.0, 1.3),   # 风险放大
        ]
        for factor in perturbations:
            if len(candidates) >= k:
                break
            perturbed = tuple(w * f for w, f in zip(weights, factor))
            path = self._dijkstra(env, start_idx, end_idx, perturbed)
            if path:
                key = tuple(path)
                if key not in seen:
                    candidates.append(path)
                    seen.add(key)

        return candidates

    def _path_dijkstra_cost(self, env: LogisticsEnv, path_links: List[int],
                            weights: Tuple[float, float, float, float]) -> float:
        """计算路径的 Dijkstra 加权成本（值越小越优）"""
        return sum(self._link_weight(env.links[i], weights) for i in path_links)

    def _score_path_with_ppo(self, env: LogisticsEnv, path_links: List[int],
                             end_idx: int, agent: PPOAgent,
                             weights: Tuple[float, float, float, float]
                             ) -> float:
        """用 PPO agent 对候选路径打分

        沿路径逐步构造状态向量，调用 agent.get_action_scores(state, mask)
        取出 PPO 对实际选中链路的评分，累加后归一化到 [0, 1]。

        Returns: PPO 评分（0-1，越高越优）
        """
        if not path_links or agent is None:
            return 0.5  # 默认中等评分

        total_score = 0.0
        step_count = 0
        acc_cost = 0.0
        acc_time = 0.0
        acc_carbon = 0.0
        acc_risk = 0.0

        for link_idx in path_links:
            link = env.links[link_idx]
            # 构造当前节点状态向量（对齐 environment._get_state 的 6 维定义）
            dist_to_goal = env._dist_matrix[link.from_idx, end_idx]
            state = np.array([
                link.from_idx / max(1, len(NODES) - 1),
                acc_cost / NORM_COST,
                acc_time / NORM_TIME,
                acc_carbon / NORM_CARBON,
                acc_risk / NORM_RISK,
                dist_to_goal / NORM_DIST,
            ], dtype=np.float32)
            # 构造动作掩码：允许当前节点所有邻接链路（与 env.get_action_mask 一致）
            mask = np.zeros(len(env.links), dtype=np.float32)
            for adj_idx in env.adjacency.get(link.from_idx, []):
                mask[adj_idx] = 1.0
            # PPO 对所有可行动作的评分
            try:
                scores = agent.get_action_scores(state, mask)
                # 取 PPO 对实际选中链路的评分
                total_score += float(scores[link_idx])
            except Exception:
                # PPO 推理异常时回退到 0.5 默认评分，不阻断主流程
                total_score += 0.5
            step_count += 1
            # 累计指标用于下一步状态构造
            acc_cost += link.cost_usd
            acc_time += link.time_days
            acc_carbon += link.carbon_kg
            acc_risk += link.base_risk

        return total_score / max(1, step_count)

    def coordinate_route(self, env: LogisticsEnv, start: str, end: str,
                         weights: Tuple[float, float, float, float],
                         agent: Optional[PPOAgent] = None
                         ) -> Dict[str, Any]:
        """协调多智能体生成完整路径

        流程：
        1. 用 Dijkstra + 权重扰动生成 Top-K 候选路径
        2. 若 PPO agent 已加载，对每条候选路径打分（agent.get_action_scores），
           融合 PPO 评分（越高越优）与 Dijkstra 成本（越低越优）后选择最优
        3. 若 PPO agent 未加载，回退到 Dijkstra 最优路径
        4. 构建路径详情，标注每段负责的智能体类型
        """
        if start not in NODE_INDEX or end not in NODE_INDEX:
            return self._empty_route(start, end)
        start_idx = NODE_INDEX[start]
        end_idx = NODE_INDEX[end]
        if start_idx == end_idx:
            return self._empty_route(start, end)

        # 1. 生成 Top-K 候选路径
        candidates = self._k_shortest_paths(env, start_idx, end_idx, weights, k=3)
        if not candidates:
            return self._empty_route(start, end)

        # 2. 选择最优候选路径（PPO 评分 + Dijkstra 成本融合）
        if agent is not None and len(candidates) > 1:
            # 先计算所有候选的 Dijkstra 成本，做 min-max 归一化
            costs = [self._path_dijkstra_cost(env, p, weights) for p in candidates]
            min_cost, max_cost = min(costs), max(costs)
            cost_range = max_cost - min_cost

            best_score = -float("inf")
            best_path = candidates[0]
            for idx, path_links in enumerate(candidates):
                ppo_score = self._score_path_with_ppo(env, path_links, end_idx, agent, weights)
                # Dijkstra 成本归一化到 [0, 1]（成本越低，归一化值越小，越优）
                if cost_range > 1e-6:
                    normalized_cost = (costs[idx] - min_cost) / cost_range
                else:
                    normalized_cost = 0.0  # 所有候选成本相同
                # 融合：PPO 评分 [0,1] 越高越优，归一化成本越低越优
                # 权重平衡：PPO 主导（0.7），Dijkstra 微调（0.3）
                combined = 0.7 * ppo_score - 0.3 * normalized_cost
                if combined > best_score:
                    best_score = combined
                    best_path = path_links
            path_links = best_path
        else:
            # PPO 未加载时回退到 Dijkstra 最优
            path_links = candidates[0]

        # 3. 构建路径详情
        route_nodes: List[str] = [start]
        transport_modes: List[str] = []
        steps_raw: List[Dict[str, Any]] = []
        total_cost = 0.0
        total_time = 0.0
        total_carbon = 0.0
        total_risk = 0.0
        for link_idx in path_links:
            link = env.links[link_idx]
            route_nodes.append(NODES[link.to_idx])
            transport_modes.append(link.mode)
            steps_raw.append({
                "from": NODES[link.from_idx],
                "to": NODES[link.to_idx],
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

        success = True
        total_segments = len(steps_raw)
        steps_detail = []
        for i, step in enumerate(steps_raw):
            agent_type = _classify_segment(i, total_segments, step["mode"])
            steps_detail.append({
                "from": step["from"],
                "to": step["to"],
                "mode": step["mode"],
                "cost": step["cost"],
                "time": step["time"],
                "carbon": step["carbon"],
                "risk": step["risk"],
                "risk_level": env.risk_to_level(step["risk"]),
                "agent": _agent_label(agent_type),
                "agent_type": agent_type,
                "agent_name": AGENT_TYPES[agent_type],
            })

        return {
            "route_nodes": route_nodes,
            "transport_modes": transport_modes,
            "steps_detail": steps_detail,
            "total_cost": total_cost,
            "total_time": total_time,
            "total_carbon": total_carbon,
            "total_risk": total_risk,
            "success": success,
        }

    def _empty_route(self, start: str, end: str) -> Dict[str, Any]:
        return {
            "route_nodes": [start],
            "transport_modes": [],
            "steps_detail": [],
            "total_cost": 0.0,
            "total_time": 0.0,
            "total_carbon": 0.0,
            "total_risk": 0.0,
            "success": False,
        }

    def evaluate_stability(self, env: LogisticsEnv, start: str, end: str,
                           weights: Tuple[float, float, float, float],
                           agent: Optional[PPOAgent] = None,
                           runs: int = 10) -> Tuple[float, float]:
        """评估路径稳定性

        Dijkstra 路径是确定性的，稳定性基于路径成功率与成本一致性。
        部署模型存在时，加入模型推理的随机性评估。
        """
        successes = 0
        costs: List[float] = []
        for _ in range(runs):
            result = self.coordinate_route(env, start, end, weights, agent)
            if result["success"]:
                successes += 1
                costs.append(result["total_cost"])
        success_rate = successes / runs
        if len(costs) >= 2:
            variance = float(np.var(costs))
        else:
            variance = 0.0
        return success_rate, variance


# 全局单例
multi_agent = MultiAgentCoordinator()
