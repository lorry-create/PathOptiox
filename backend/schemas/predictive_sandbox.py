"""预测沙箱模块 Pydantic 数据模型

字段严格对齐前端 predictiveSandboxApi.ts 契约。
- RiskRadar.severity 大写枚举：'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
- PreemptiveAction.status 大写枚举：'QUEUED' | 'EXECUTING' | 'COMPLETED'
"""
from typing import List

from pydantic import Field

from .common import SchemaBase


class RiskRadar(SchemaBase):
    """未来风险雷达条目"""

    id: str = Field(description="风险ID")
    hazard_type: str = Field(description="灾害类型")
    probability: float = Field(description="发生概率(0-100)")
    impact_region: str = Field(description="影响区域")
    estimated_loss: str = Field(description="预估损失(带单位字符串)")
    severity: str = Field(description="严重等级(LOW/MODERATE/HIGH/CRITICAL)")


class PreemptiveAction(SchemaBase):
    """前置处置动作条目"""

    id: str = Field(description="动作ID")
    target_order: str = Field(description="目标订单号")
    strategy: str = Field(description="处置策略描述")
    cost_saved: str = Field(description="节约成本(带单位字符串)")
    status: str = Field(description="执行状态(QUEUED/EXECUTING/COMPLETED)")


class PredictionTimeData(SchemaBase):
    """预测时间点数据"""

    offset_hours: int = Field(description="时间偏移(小时)")
    label: str = Field(description="时间标签")
    narrative: str = Field(description="叙述性分析")
    risks: List[RiskRadar] = Field(description="风险雷达列表")
    actions: List[PreemptiveAction] = Field(description="前置处置动作列表")
