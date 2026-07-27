"""专家子模块 V2（Phase C：真实业务后处理）

V1 的"多智能体协同"仅靠 `if-else` 数组索引打标签（首段=揽收、末段=派送），
本模块用真实的业务规则对 PPO 生成的路径进行后处理：

专家职责：
    - PickupExpert（揽收专家）：处理起点段，根据起点的枢纽属性调整揽收成本/时效
    - TrunkExpert（干线专家）：识别真实的长途干线（跨区域或海/空/铁运输），
      并对多段干线批量运输给予折扣
    - ComplianceExpert（合规专家）：检测跨国界/跨区域转运节点，
      动态注入合规成本和时效延迟（如海关清关、跨境文件审核）
    - DeliveryExpert（交付专家）：处理终点段，根据终点枢纽属性调整交付成本/时效

处理流程：
    PPO 路径 → PickupExpert → TrunkExpert → ComplianceExpert → DeliveryExpert → 最终路径

每个专家模块会：
    1. 基于真实业务规则重新分类 segments 的 agent_type（覆盖 V1 的位置启发式）
    2. 应用真实的成本/时效调整（覆盖 V1 的"假标签无调整"）
    3. 重算 total_cost / total_time / total_carbon / total_risk

向后兼容：
    本模块独立存在，仅被 optimization_service.py (V2) 调用，不修改 V1 任何文件。
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from .environment_v2 import LogisticsEnvV2

logger = logging.getLogger(__name__)


# ====================================================================
# 区域映射（用于跨区域合规判定）
# ====================================================================
# 区域代码 -> 区域中文名
REGION_NAMES: Dict[str, str] = {
    "asia_east": "东亚",
    "asia_se": "东南亚",
    "europe_w": "西欧",
    "na_w": "北美西部",
    "oceania": "大洋洲",
    "mideast": "中东",
}

# 跨区域运输视为"跨境"，触发合规检查
CROSS_REGION_MODES = {"sea", "air", "rail"}


# ====================================================================
# 风险等级转换（与 V1 environment.py 一致）
# ====================================================================
def risk_to_level(risk: float) -> str:
    if risk < 0.10:
        return "low"
    elif risk < 0.18:
        return "moderate"
    elif risk < 0.25:
        return "high"
    else:
        return "critical"


# ====================================================================
# 专家模块基类
# ====================================================================
class BaseExpert:
    """专家模块基类"""

    name: str = "base"
    agent_type: str = "trunk"
    agent_label: str = "trunk_agent"
    agent_name_cn: str = "干线智能体"

    def process(self, route_result: Dict[str, Any], env: LogisticsEnvV2) -> Dict[str, Any]:
        """处理路径，返回修改后的 route_result"""
        raise NotImplementedError

    # ----- 工具方法 -----
    def _recalculate_totals(self, route_result: Dict[str, Any]) -> None:
        """重算 total_* 字段（在专家调整 cost/time 后调用）"""
        total_cost = 0.0
        total_time = 0.0
        total_carbon = 0.0
        total_risk = 0.0
        for step in route_result["steps_detail"]:
            total_cost += step["cost"]
            total_time += step["time"]
            total_carbon += step["carbon"]
            total_risk += step["risk"]
        route_result["total_cost"] = total_cost
        route_result["total_time"] = total_time
        route_result["total_carbon"] = total_carbon
        route_result["total_risk"] = total_risk


# ====================================================================
# 揽收专家
# ====================================================================
class PickupExpert(BaseExpert):
    """揽收专家：处理起点段

    业务规则：
        1. 路径首段强制标记为 pickup（覆盖 V1 的位置启发式）
        2. 根据起点节点是否为枢纽港（is_hub），调整揽收成本和时效：
           - 枢纽港：快速通道，无额外费用
           - 非枢纽港：+0.5 天揽收时间，+$200 揽收费用（仓库提货+短驳）
    """

    name = "pickup_expert"
    agent_type = "pickup"
    agent_label = "pickup_agent"
    agent_name_cn = "揽收智能体"

    # 揽收附加费率
    NON_HUB_PICKUP_COST = 200.0    # 非枢纽港额外揽收成本（美元）
    NON_HUB_PICKUP_TIME = 0.5      # 非枢纽港额外揽收时间（天）

    def process(self, route_result: Dict[str, Any], env: LogisticsEnvV2) -> Dict[str, Any]:
        if not route_result["steps_detail"]:
            return route_result

        first_step = route_result["steps_detail"][0]
        # 强制标记为 pickup
        first_step["agent_type"] = self.agent_type
        first_step["agent"] = self.agent_label
        first_step["agent_name"] = self.agent_name_cn

        # 根据起点枢纽属性调整
        from_code = first_step.get("from_code", "")
        if from_code:
            from_idx = env.node_code_to_idx.get(from_code)
            if from_idx is not None:
                start_node = env.nodes[from_idx]
                if not getattr(start_node, "is_hub", False):
                    first_step["cost"] += self.NON_HUB_PICKUP_COST
                    first_step["time"] += self.NON_HUB_PICKUP_TIME
                    logger.debug(
                        f"[PickupExpert] 起点 {from_code} 非枢纽港，"
                        f"附加揽收成本 ${self.NON_HUB_PICKUP_COST} / {self.NON_HUB_PICKUP_TIME} 天"
                    )

        self._recalculate_totals(route_result)
        return route_result


# ====================================================================
# 干线专家
# ====================================================================
class TrunkExpert(BaseExpert):
    """干线专家：识别真实的长途干线段

    业务规则：
        1. 遍历所有 segment，根据运输方式和起终点区域识别真实干线：
           - 海运/空运/铁路运输视为干线候选
           - 同区域内陆运不视为干线（属于本地配送）
        2. 对多段连续干线（≥2 段）给予批量运输折扣：
           - 2 段干线：成本 -5%
           - 3+ 段干线：成本 -10%（鼓励整合干线运输）
        3. 重新标记 agent_type=trunk
    """

    name = "trunk_expert"
    agent_type = "trunk"
    agent_label = "trunk_agent"
    agent_name_cn = "干线智能体"

    def process(self, route_result: Dict[str, Any], env: LogisticsEnvV2) -> Dict[str, Any]:
        if not route_result["steps_detail"]:
            return route_result

        # 第一遍：识别干线段
        trunk_indices: List[int] = []
        for i, step in enumerate(route_result["steps_detail"]):
            # 首段和末段不视为干线（已被 pickup/delivery 占用）
            if i == 0 or i == len(route_result["steps_detail"]) - 1:
                continue
            mode = step.get("mode", "")
            if mode in ("sea", "air", "rail"):
                trunk_indices.append(i)
            else:
                # 陆运但跨区域也算干线
                from_region = self._get_node_region(env, step.get("from_code", ""))
                to_region = self._get_node_region(env, step.get("to_code", ""))
                if from_region and to_region and from_region != to_region:
                    trunk_indices.append(i)

        # 第二遍：应用批量折扣并标记
        if len(trunk_indices) >= 3:
            discount = 0.10  # 10% 折扣
        elif len(trunk_indices) == 2:
            discount = 0.05  # 5% 折扣
        else:
            discount = 0.0

        for idx in trunk_indices:
            step = route_result["steps_detail"][idx]
            if discount > 0:
                original_cost = step["cost"]
                step["cost"] = round(original_cost * (1 - discount), 2)
                logger.debug(
                    f"[TrunkExpert] 干线段 {step.get('from')}→{step.get('to')} "
                    f"批量折扣 -{discount*100:.0f}%：${original_cost:.0f} → ${step['cost']:.0f}"
                )
            # 标记为 trunk
            step["agent_type"] = self.agent_type
            step["agent"] = self.agent_label
            step["agent_name"] = self.agent_name_cn

        self._recalculate_totals(route_result)
        return route_result

    def _get_node_region(self, env: LogisticsEnvV2, node_code: str) -> Optional[str]:
        """获取节点区域"""
        if not node_code:
            return None
        idx = env.node_code_to_idx.get(node_code)
        if idx is None:
            return None
        return getattr(env.nodes[idx], "region", None)


# ====================================================================
# 合规专家
# ====================================================================
class ComplianceExpert(BaseExpert):
    """合规专家：跨区域合规检查

    业务规则：
        1. 检测跨区域运输段（from_region != to_region）
        2. 在跨区域段上注入合规成本和时效延迟：
           - 海关清关：+1.0 天，+$500
           - 跨境文件审核：+0.5 天，+$200
           - 关税/税费：+货值 1%（简化为固定 $300）
           合计：+1.5 天，+$1000
        3. 仅在第一个跨区域段注入（避免重复收费）
        4. 标记该段 agent_type=compliance
    """

    name = "compliance_expert"
    agent_type = "compliance"
    agent_label = "compliance_agent"
    agent_name_cn = "合规智能体"

    # 合规附加成本和时效
    COMPLIANCE_COST = 1000.0   # 海关清关 + 文件审核 + 关税
    COMPLIANCE_TIME = 1.5      # 1.5 天

    def process(self, route_result: Dict[str, Any], env: LogisticsEnvV2) -> Dict[str, Any]:
        if not route_result["steps_detail"]:
            return route_result

        # 寻找第一个跨区域段（排除首段和末段）
        compliance_applied = False
        for i, step in enumerate(route_result["steps_detail"]):
            if i == 0 or i == len(route_result["steps_detail"]) - 1:
                continue
            if compliance_applied:
                break

            from_region = self._get_node_region(env, step.get("from_code", ""))
            to_region = self._get_node_region(env, step.get("to_code", ""))
            if from_region and to_region and from_region != to_region:
                # 跨区域运输，注入合规成本
                step["cost"] += self.COMPLIANCE_COST
                step["time"] += self.COMPLIANCE_TIME
                step["agent_type"] = self.agent_type
                step["agent"] = self.agent_label
                step["agent_name"] = self.agent_name_cn
                compliance_applied = True
                logger.debug(
                    f"[ComplianceExpert] 跨区域合规：{step.get('from')}({from_region}) → "
                    f"{step.get('to')}({to_region})，"
                    f"附加合规成本 ${self.COMPLIANCE_COST} / {self.COMPLIANCE_TIME} 天"
                )

        self._recalculate_totals(route_result)
        return route_result

    def _get_node_region(self, env: LogisticsEnvV2, node_code: str) -> Optional[str]:
        if not node_code:
            return None
        idx = env.node_code_to_idx.get(node_code)
        if idx is None:
            return None
        return getattr(env.nodes[idx], "region", None)


# ====================================================================
# 交付专家
# ====================================================================
class DeliveryExpert(BaseExpert):
    """交付专家：处理终点段

    业务规则：
        1. 路径末段强制标记为 delivery（覆盖 V1 的位置启发式）
        2. 根据终点节点是否为枢纽港，调整交付成本和时效：
           - 枢纽港：成熟配送网络，无额外费用
           - 非枢纽港：+1.0 天交付时间，+$300 末端配送费
    """

    name = "delivery_expert"
    agent_type = "delivery"
    agent_label = "delivery_agent"
    agent_name_cn = "交付智能体"

    NON_HUB_DELIVERY_COST = 300.0
    NON_HUB_DELIVERY_TIME = 1.0

    def process(self, route_result: Dict[str, Any], env: LogisticsEnvV2) -> Dict[str, Any]:
        if not route_result["steps_detail"]:
            return route_result

        last_step = route_result["steps_detail"][-1]
        # 强制标记为 delivery
        last_step["agent_type"] = self.agent_type
        last_step["agent"] = self.agent_label
        last_step["agent_name"] = self.agent_name_cn

        # 根据终点枢纽属性调整
        to_code = last_step.get("to_code", "")
        if to_code:
            to_idx = env.node_code_to_idx.get(to_code)
            if to_idx is not None:
                end_node = env.nodes[to_idx]
                if not getattr(end_node, "is_hub", False):
                    last_step["cost"] += self.NON_HUB_DELIVERY_COST
                    last_step["time"] += self.NON_HUB_DELIVERY_TIME
                    logger.debug(
                        f"[DeliveryExpert] 终点 {to_code} 非枢纽港，"
                        f"附加交付成本 ${self.NON_HUB_DELIVERY_COST} / {self.NON_HUB_DELIVERY_TIME} 天"
                    )

        self._recalculate_totals(route_result)
        return route_result


# ====================================================================
# 专家流水线：组合 4 个专家依次处理路径
# ====================================================================
class ExpertPipeline:
    """专家模块流水线

    按 PickupExpert → TrunkExpert → ComplianceExpert → DeliveryExpert 顺序处理路径。
    每个专家独立修改 route_result，最终输出经过完整业务后处理的路径。
    """

    def __init__(self) -> None:
        self.experts: List[BaseExpert] = [
            PickupExpert(),
            TrunkExpert(),
            ComplianceExpert(),
            DeliveryExpert(),
        ]

    def process(self, route_result: Dict[str, Any], env: LogisticsEnvV2) -> Dict[str, Any]:
        """依次应用所有专家模块"""
        for expert in self.experts:
            try:
                route_result = expert.process(route_result, env)
            except Exception as e:
                logger.warning(f"[ExpertPipeline] {expert.name} 处理失败: {e}")
                # 单个专家失败不阻断流水线
        return route_result


# 全局单例
expert_pipeline = ExpertPipeline()
