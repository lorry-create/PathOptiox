"""路径优化模块业务服务层 V2（Phase C：V2 引擎无感切流）

本模块全面替换 V1 依赖（environment/ppo_agent/multi_agent），
接入 V2 版本的动态图环境、GNN 前端 PPO Agent、真实 PPO 寻路 + Dijkstra 兜底，
并通过专家子模块进行真实业务后处理。

核心改造：
    1. 动态图加载：从 SQLite 读取路网，不再依赖硬编码常量
    2. 真实 PPO 寻路：PPO 真实探索路径 + Dijkstra 兜底（替代 V1 的 Dijkstra 主导）
    3. 真专家模块：PickupExpert/TrunkExpert/ComplianceExpert/DeliveryExpert 真实业务后处理
    4. 4 套方案真差异化：4 组极端 weights + 随机采样 + 每方案独立随机种子
    5. 零侵入输出：严格对齐 OptimizeResponse/SchemeItem/StepDetail，前端无感知

向后兼容：
    - 完全移除 V1 引用（environment.py, ppo_agent.py, multi_agent.py, model_storage.py）
    - model_storage 仍保留供 V1 训练页面使用，但本服务不再调用
    - 输出格式 100% 对齐 V1，前端组件无需任何修改
"""
from __future__ import annotations

import logging
import os
import random
import threading
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from schemas.optimization import (
    OptimizeExplanation,
    OptimizeRequest,
    OptimizeResponse,
    SchemeItem,
    StepDetail,
)

# V2 引擎依赖
from agent.environment_v2 import LogisticsEnvV2
from agent.ppo_agent_v2 import PPOAgentV2
from agent.multi_agent_v2 import MultiAgentCoordinatorV2
from agent.expert_modules_v2 import expert_pipeline

logger = logging.getLogger(__name__)


# ====================================================================
# 节点别名映射（前端输入 -> V2 DB code）
# ====================================================================
# V2 使用 DB code（如 "shenzhen"）作为节点标识，前端可能传中文/英文/别名
_NODE_ALIAS_V2: Dict[str, str] = {
    # 中文 -> DB code
    "北京": "beijing", "上海": "shanghai", "深圳": "shenzhen", "广州": "guangzhou",
    "东京": "tokyo", "首尔": "seoul", "新加坡": "singapore", "汉堡": "hamburg",
    "洛杉矶": "los_angeles", "伦敦": "london", "悉尼": "sydney", "迪拜": "dubai",
    # 英文小写直传（DB code 即英文小写）
    "beijing": "beijing", "shanghai": "shanghai", "shenzhen": "shenzhen",
    "guangzhou": "guangzhou", "tokyo": "tokyo", "seoul": "seoul",
    "singapore": "singapore", "hamburg": "hamburg", "los_angeles": "los_angeles",
    "london": "london", "sydney": "sydney", "dubai": "dubai",
    # 近似映射（前端城市列表中不在 DB 节点内的城市，映射至最近邻 DB 节点）
    # Phase G 修复：原 "new_york" → "los_angeles" 会导致用户选 "纽约 → 洛杉矶"
    # 时起点终点被映射为同一节点，触发 _empty_route 返回仅含起始点的空路径
    "frankfurt": "luxembourg",    # 法兰克福 -> 卢森堡（地理最近邻 DB 节点）
    "new_york": "chicago",        # 纽约 -> 芝加哥（同为北美东部空运枢纽）
    "new york": "chicago",
    "纽约": "chicago",
    "hong_kong": "shenzhen",      # 香港 -> 深圳
    "hong kong": "shenzhen",
    "香港": "shenzhen",
    "chengdu": "beijing",         # 成都 -> 北京
    "xi_an": "beijing",           # 西安 -> 北京
    "xi'an": "beijing",
    "法兰克福": "luxembourg",
    # 注意：rotterdam 本身就是 DB 节点 code，由 _normalize_node_code 直接命中，
    #       无需也不应在此处映射到 hamburg，故移除原 "rotterdam": "hamburg" 与 "鹿特丹": "hamburg"
}


def _normalize_node_code(name: str, env: LogisticsEnvV2) -> Optional[str]:
    """将前端传入的节点名标准化为 V2 DB code

    Args:
        name: 前端传入的节点名（中文/英文/别名）
        env: V2 环境（用于校验 code 是否存在）

    Returns:
        DB code，若无法识别返回 None
    """
    if not name:
        return None

    # 直接命中 DB code
    if name in env.node_code_to_idx:
        return name

    # 查别名表（小写）
    lower = name.lower() if isinstance(name, str) else name
    if lower in _NODE_ALIAS_V2:
        candidate = _NODE_ALIAS_V2[lower]
        if candidate in env.node_code_to_idx:
            return candidate

    # 中文直传
    if name in _NODE_ALIAS_V2:
        candidate = _NODE_ALIAS_V2[name]
        if candidate in env.node_code_to_idx:
            return candidate

    return None


# ====================================================================
# 4 套方案权重配置（极端差异化，确保 PPO 探索出不同路径）
# ====================================================================
SCHEME_WEIGHTS: Dict[str, Tuple[float, float, float, float]] = {
    # (cost, time, carbon, risk)
    "cost":   (0.80, 0.05, 0.05, 0.10),   # 极端成本优先：偏好廉价海运/陆运
    "robust": (0.10, 0.15, 0.10, 0.65),   # 极端稳健优先：强烈回避高风险链路
    "speed":  (0.05, 0.80, 0.05, 0.10),   # 极端时效优先：偏好空运直飞
    "green":  (0.10, 0.10, 0.75, 0.05),   # 极端绿色优先：偏好铁路/海运低碳运输
}

SCHEME_LABELS: Dict[str, str] = {
    "cost": "成本优先",
    "robust": "稳健优先",
    "speed": "时效优先",
    "green": "绿色优先",
}

# 每套方案的独立随机种子（确保 PPO 随机采样产生不同探索路径）
SCHEME_SEEDS: Dict[str, int] = {
    "cost": 101,
    "robust": 202,
    "speed": 303,
    "green": 404,
}


# ====================================================================
# V2 引擎单例缓存（避免每次请求重建环境/Agent）
# ====================================================================
class _V2EngineCache:
    """V2 引擎缓存（线程安全）

    首次请求时加载环境、构建 Agent 并绑定，后续请求复用。
    若 DB 路网变更（节点/链路数量变化），自动重建。
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._env: Optional[LogisticsEnvV2] = None
        self._agent: Optional[PPOAgentV2] = None
        self._coordinator: Optional[MultiAgentCoordinatorV2] = None
        self._signature: Tuple[int, int] = (0, 0)  # (节点数, 链路数)

    def get(self, scene: str = "normal") -> Tuple[LogisticsEnvV2, PPOAgentV2, MultiAgentCoordinatorV2]:
        with self._lock:
            # 首次加载或场景切换时重建环境
            need_rebuild = (
                self._env is None
                or self._agent is None
                or self._coordinator is None
                or self._env.scene != scene
            )

            if need_rebuild:
                self._env = LogisticsEnvV2(scene=scene)
                self._env.load_from_db()
                self._agent = PPOAgentV2(
                    hidden_dim=64,
                    lr=1e-3,
                    gamma=0.99,
                    gae_lambda=0.95,
                    clip_epsilon=0.2,
                    entropy_coef=0.05,  # 推理时较高的熵鼓励探索差异化
                    value_loss_coef=0.5,
                    batch_size=64,
                    epochs=4,
                )
                self._agent.bind_env(self._env)

                # 尝试加载已训练的 V2 权重（若存在）
                self._try_load_trained_weights(self._agent)

                self._coordinator = MultiAgentCoordinatorV2()
                self._coordinator.bind_unified(self._agent)
                self._signature = (self._env.num_nodes, self._env.num_links)
                logger.info(
                    f"V2 引擎已初始化: scene={scene}, "
                    f"nodes={self._env.num_nodes}, links={self._env.num_links}"
                )

            return self._env, self._agent, self._coordinator

    def _try_load_trained_weights(self, agent: PPOAgentV2) -> None:
        """尝试加载已训练的 V2 权重文件

        Phase E 修复：优先加载 gnn_weights_aware 架构的生产模型
        - ppo_v2_prod.pt: 生产训练模型（V2 架构，含 weights 感知层）
        - ppo_v2_latest.pt: 备用最新模型
        - ppo_v2_smoke.pt: 烟雾测试模型（V1 旧架构，Actor/Critic 会随机初始化，已弃用）

        避免加载 V1 架构模型（arch=gnn），否则 PPO 的 Actor/Critic 会使用随机权重，
        导致路径优化出现"阿拉山口掉头"等违反物流常理的混乱路径。
        """
        candidates = [
            "agent/saved_models/ppo_v2_prod.pt",     # 生产训练模型（V2 架构，首选）
            "agent/saved_models/ppo_v2_latest.pt",   # 备用最新模型
        ]
        for path in candidates:
            if os.path.exists(path):
                try:
                    agent.load(path)
                    logger.info(f"V2 权重已加载: {path}")
                    return
                except Exception as e:
                    logger.warning(f"加载 V2 权重失败 {path}: {e}")
        logger.info("未找到 V2 训练权重，使用随机初始化（Dijkstra 兜底保障可用性）")


# 全局引擎缓存
_v2_engine = _V2EngineCache()


# ====================================================================
# 工具函数
# ====================================================================
def _compute_on_time_rate(total_time: float, scene: str) -> float:
    """根据总时效与场景计算准时率"""
    base_threshold = 25.0
    if scene == "stress":
        base_threshold = 40.0
    elif scene == "policy":
        base_threshold = 30.0
    if total_time <= base_threshold * 0.5:
        return 0.99
    if total_time >= base_threshold * 2.0:
        return 0.75
    rate = 0.99 - (total_time - base_threshold * 0.5) / (base_threshold * 1.5) * 0.24
    return max(0.75, min(0.99, rate))


def _compute_stability(success_rate: float, variance: float) -> float:
    """根据成功率与方差计算稳定性评分 (0-1)"""
    var_score = max(0.0, 1.0 - variance / 1e8)
    return round(0.7 * success_rate + 0.3 * var_score, 3)


def _to_float(value: Any, default: float = 0.0) -> float:
    """防御性数值提取：确保返回纯 float，避免 dict/对象导致前端 [object Object] 乱码

    若传入 dict（如 {'value': 11000}），显式提取 'value' 键；
    若传入 int/float，直接转换为 float；
    其他类型返回 default。
    """
    if value is None:
        return default
    if isinstance(value, dict):
        # 字典：按用户要求显式提取数值部分（如 cost.get('value')）
        inner = value.get("value")
        if inner is None:
            # 兼容其他常见键名
            for k in ("cost", "amount", "total", "usd"):
                if k in value:
                    inner = value[k]
                    break
        return float(inner) if inner is not None else default
    if isinstance(value, (int, float)):
        return float(value)
    # 字符串数字（如 "11000"）
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _build_step_detail(step: dict) -> StepDetail:
    """将算法层步骤转换为 StepDetail Schema

    对 cost/time/carbon 字段使用 _to_float 防御性提取，
    确保即使上游传入 dict（如 {'value': 11000}）也能正确解析为纯数字。
    """
    return StepDetail(
        **{
            "from": step["from"],
            "to": step["to"],
            "transport_mode": step["mode"],
            "time_days": round(_to_float(step.get("time")), 2),
            "cost_usd": round(_to_float(step.get("cost")), 2),
            "carbon_kg": round(_to_float(step.get("carbon")), 2),
            "risk_level": step["risk_level"],
            "agent": step["agent"],
        }
    )


def _build_scheme(
    scheme_id: str,
    route_result: dict,
    scene: str,
    stability: float,
) -> SchemeItem:
    """构建单套方案（与 V1 输出格式严格对齐）

    对 total_cost/total_time/total_carbon 字段使用 _to_float 防御性提取，
    确保返回前端的是纯数字（如 11000.0），而非 dict（如 {'value': 11000}）。
    """
    steps_detail = [_build_step_detail(s) for s in route_result["steps_detail"]]
    total_time = _to_float(route_result.get("total_time"))
    on_time_rate = _compute_on_time_rate(total_time, scene)
    path_warning = None
    if not route_result["success"]:
        path_warning = "当前权重组合下未找到可行路径，已回退至最近候选方案"
    elif "air" in route_result["transport_modes"]:
        total_carbon = _to_float(route_result.get("total_carbon"))
        if total_carbon > 20000:
            path_warning = "空运方案碳排放较高，建议对时效要求不高的货物选择其他方案"
    return SchemeItem(
        id=scheme_id,
        label=SCHEME_LABELS[scheme_id],
        route_nodes=route_result["route_nodes"],
        transport_modes=route_result["transport_modes"],
        total_time_days=round(total_time, 2),
        total_cost_usd=round(_to_float(route_result.get("total_cost")), 2),
        total_carbon_kg=round(_to_float(route_result.get("total_carbon")), 2),
        stability_score=stability,
        on_time_rate=round(on_time_rate, 2),
        steps_detail=steps_detail,
        path_warning=path_warning,
    )


def _set_global_seed(seed: int) -> None:
    """设置全局随机种子（确保 PPO 随机采样可复现且各方案不同）"""
    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch
        torch.manual_seed(seed)
    except ImportError:
        pass


# ====================================================================
# 主服务类
# ====================================================================
class OptimizationService:
    """路径优化服务 V2（接入 V2 引擎 + 专家模块）"""

    async def optimize(self, req: OptimizeRequest) -> OptimizeResponse:
        """返回标准 4 套方案 + 决策解释

        流程：
        1. 加载 V2 引擎（env + agent + coordinator，缓存复用）
        2. 标准化节点 code（前端输入 -> DB code）
        3. 对 4 套方案分别推理：
           a. 设置独立随机种子（确保路径差异化）
           b. PPO 真实探索 + Dijkstra 兜底
           c. 专家模块后处理（PickupExpert → Trunk → Compliance → Delivery）
        4. 评估稳定性（同权重多次采样）
        5. 组装 OptimizeResponse（格式 100% 对齐 V1）
        """
        scene = req.scene if req.scene in ("normal", "stress", "policy") else "normal"

        # 1. 加载 V2 引擎
        env, agent, coordinator = _v2_engine.get(scene=scene)

        # 2. 标准化节点
        start_code = _normalize_node_code(req.start_node, env)
        end_code = _normalize_node_code(req.end_node, env)
        if start_code is None or end_code is None:
            logger.warning(
                f"节点无法识别: start={req.start_node}, end={req.end_node}，"
                f"回退到默认 shenzhen -> hamburg"
            )
            start_code = start_code or "shenzhen"
            end_code = end_code or "hamburg"

        # 3. 4 套方案推理
        schemes: List[SchemeItem] = []
        for scheme_id in ("cost", "robust", "speed", "green"):
            weights = SCHEME_WEIGHTS[scheme_id]
            seed = SCHEME_SEEDS[scheme_id]

            # 设置独立种子：确保 PPO 随机采样产生不同探索路径
            _set_global_seed(seed)

            # PPO 真实探索 + Dijkstra 兜底
            # 使用 stochastic sampling (deterministic=False) 引入路径多样性
            route_result = coordinator.coordinate_route(
                env=env,
                start_code=start_code,
                end_code=end_code,
                weights=weights,
                agent=agent,
                deterministic=False,  # 随机采样：4 套方案产生真实差异
            )

            # 失败时再尝试一次（贪心模式，确保至少有可行路径）
            if not route_result["success"]:
                _set_global_seed(seed + 1000)  # 换种子重试
                route_result = coordinator.coordinate_route(
                    env=env,
                    start_code=start_code,
                    end_code=end_code,
                    weights=weights,
                    agent=agent,
                    deterministic=True,
                )

            # 专家模块后处理（真实业务规则）
            route_result = expert_pipeline.process(route_result, env)

            # 稳定性评估（同权重重复采样 5 次，减少评估开销）
            success_rate, variance = coordinator.evaluate_stability(
                env, start_code, end_code, weights, agent, runs=5
            )
            stability = _compute_stability(success_rate, variance)

            schemes.append(_build_scheme(scheme_id, route_result, scene, stability))

        # 4. 生成决策解释（LLM 优先，失败回退硬编码）
        try:
            from agent.xrl_workflow import generate_explanation

            rl_path_json = self._build_llm_input(req, schemes, scene)
            explanation_dict = await generate_explanation(
                rl_path_json,
                w1=req.weight_cost,
                w2=req.weight_time,
                w3=req.weight_carbon,
            )
            explanation = OptimizeExplanation(**explanation_dict)
            logger.info("LLM 可解释性报告生成成功")
        except Exception as e:
            err_msg = str(e)
            if "Arrearage" in err_msg or "overdue-payment" in err_msg:
                logger.error(
                    "DashScope 账户欠费，Qwen 调用被拒绝，已回退到硬编码 _build_explanation。"
                    "请前往 https://dashscope.console.aliyun.com/billing 充值后重试。"
                    "原始错误: %s", e
                )
            elif "DASHSCOPE_API_KEY 未配置" in err_msg:
                logger.error(
                    "DASHSCOPE_API_KEY 未配置，已回退到硬编码 _build_explanation。"
                    "请在 backend/.env 中设置 DASHSCOPE_API_KEY。"
                )
            else:
                logger.warning(
                    "LLM 可解释性生成失败，回退到硬编码 _build_explanation: %s", e
                )
            explanation = self._build_explanation(req, schemes, scene)

        return OptimizeResponse(schemes=schemes, explanation=explanation)

    def _build_llm_input(self, req: OptimizeRequest,
                         schemes: List[SchemeItem], scene: str) -> dict:
        """组装传给 Qwen 的路径方案数据（与 V1 接口对齐）"""
        weight_map = [
            (req.weight_cost, "cost"),
            (req.weight_risk, "robust"),
            (req.weight_time, "speed"),
            (req.weight_carbon, "green"),
        ]
        best_id = max(weight_map, key=lambda x: x[0])[1]
        best_label = SCHEME_LABELS.get(best_id, "成本优先")

        shown = schemes[0] if schemes else None

        def _scheme_full(s: SchemeItem) -> dict:
            return {
                "id": s.id,
                "label": s.label,
                "route_nodes": s.route_nodes,
                "transport_modes": s.transport_modes,
                "total_time_days": s.total_time_days,
                "total_cost_usd": s.total_cost_usd,
                "total_carbon_kg": s.total_carbon_kg,
                "stability_score": s.stability_score,
                "on_time_rate": s.on_time_rate,
                "path_warning": s.path_warning,
                "steps_detail": [
                    {
                        "from": sd.from_,
                        "to": sd.to,
                        "transport_mode": sd.transport_mode,
                        "time_days": sd.time_days,
                        "cost_usd": sd.cost_usd,
                        "carbon_kg": sd.carbon_kg,
                        "risk_level": sd.risk_level,
                        "agent": sd.agent,
                    }
                    for sd in s.steps_detail
                ],
            }

        return {
            "start_node": req.start_node,
            "end_node": req.end_node,
            "scene": scene,
            "recommended_scheme": _scheme_full(shown) if shown else None,
            "best_match_scheme_id": best_id,
            "best_match_scheme_label": best_label,
            "all_schemes_comparison": [
                {
                    "id": s.id,
                    "label": s.label,
                    "total_cost_usd": s.total_cost_usd,
                    "total_time_days": s.total_time_days,
                    "total_carbon_kg": s.total_carbon_kg,
                    "stability_score": s.stability_score,
                    "on_time_rate": s.on_time_rate,
                }
                for s in schemes
            ],
            "user_weights": {
                "w_cost": req.weight_cost,
                "w_time": req.weight_time,
                "w_carbon": req.weight_carbon,
                "w_risk": req.weight_risk,
            },
        }

    def _build_explanation(self, req: OptimizeRequest,
                           schemes: List[SchemeItem], scene: str) -> OptimizeExplanation:
        """构建决策解释（V2 版本，体现真实 PPO 寻路 + 专家模块）"""
        weight_map = [
            (req.weight_cost, "cost"),
            (req.weight_risk, "robust"),
            (req.weight_time, "speed"),
            (req.weight_carbon, "green"),
        ]
        best_id = max(weight_map, key=lambda x: x[0])[1]
        best_label = SCHEME_LABELS.get(best_id, "成本优先")

        scene_desc = {
            "normal": "常规运营",
            "stress": "高压场景",
            "policy": "政策调整",
        }.get(scene, "常规运营")
        return OptimizeExplanation(
            conclusion=f"基于 GNN-PPO 真实寻路 + 专家模块后处理生成 4 套候选方案，"
            f"当前权重下推荐【{best_label}】方案",
            route_logic="路径由 PPO Agent 在动态物流图上真实探索生成，"
            "GNN 提取节点/链路特征，Actor-Critic 网络输出动作概率分布并采样决策；"
            "探索失败时由 Dijkstra 兜底补全。"
            "随后由揽收/干线/合规/交付 4 类专家模块基于真实业务规则进行后处理，"
            "包括枢纽属性调整、批量折扣、跨境合规成本注入等",
            prediction_usage=f"结合 {scene_desc} 场景参数与动态图路网数据，"
            "对每段运输时效与风险进行前瞻性评估，"
            "稳定性评分基于同权重 5 次随机采样的成功率与方差",
            target_match=f"当前权重配置：成本 {req.weight_cost:.2f}、时效 {req.weight_time:.2f}、"
            f"碳排 {req.weight_carbon:.2f}、风险 {req.weight_risk:.2f}，"
            f"4 套方案采用极端差异化 weights + 独立随机种子，"
            f"确保路径选择产生真实物理差异",
        )


optimization_service = OptimizationService()
