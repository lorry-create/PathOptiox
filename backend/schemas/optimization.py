"""路径优化模块 Pydantic 数据模型

字段严格对齐前端 optimizeApi.ts 与 optimize.mock.ts 契约。
注意：StepDetail.from 是 Python 关键字，使用别名 from_ + alias="from"。
"""
from typing import List, Optional

from pydantic import ConfigDict, Field

from .common import SchemaBase


class OptimizeRequest(SchemaBase):
    """路径优化请求

    兼容前端组件层只传 start_node/end_node/weight_cost/weight_time/weight_carbon 的场景，
    weight_risk/network_model/scene 均设为可选并提供默认值。
    """

    start_node: str = Field(description="起始节点")
    end_node: str = Field(description="目标节点")
    weight_cost: float = Field(default=0.25, description="成本权重(0-1)")
    weight_time: float = Field(default=0.25, description="时效权重(0-1)")
    weight_carbon: float = Field(default=0.25, description="碳排放权重(0-1)")
    weight_risk: Optional[float] = Field(default=0.25, description="风险权重(0-1)")
    network_model: Optional[str] = Field(default="net_global_v3", description="物流网络模型ID")
    scene: Optional[str] = Field(default="normal", description="场景(normal/stress/policy)")
    risk_id: Optional[str] = Field(default=None, description="风险事件ID(一键重规划时传入)")
    order_id: Optional[str] = Field(default=None, description="订单ID(异常诊断时传入)")


class StepDetail(SchemaBase):
    """分段详情

    from 是 Python 关键字，使用字段名 from_ + alias="from"，
    序列化/反序列化均使用 alias "from"，与前端契约一致。
    """

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    from_: str = Field(alias="from", description="起始节点")
    to: str = Field(description="目标节点")
    transport_mode: str = Field(description="运输方式")
    time_days: float = Field(description="运输天数")
    cost_usd: float = Field(description="成本(美元)")
    carbon_kg: float = Field(description="碳排放(kg)")
    risk_level: str = Field(description="风险等级")
    agent: str = Field(description="负责智能体")


class SchemeItem(SchemaBase):
    """单套路径方案"""

    id: str = Field(description="方案ID(cost/robust/speed/green)")
    label: str = Field(description="方案名称")
    route_nodes: List[str] = Field(description="路由节点列表")
    transport_modes: List[str] = Field(description="各段运输方式列表")
    total_time_days: float = Field(description="总运输天数")
    total_cost_usd: float = Field(description="总成本(美元)")
    total_carbon_kg: float = Field(description="总碳排放(kg)")
    stability_score: float = Field(description="稳定性评分(0-1)")
    on_time_rate: float = Field(description="准时率(0-1)")
    steps_detail: List[StepDetail] = Field(description="分段详情列表")
    path_warning: Optional[str] = Field(default=None, description="路径告警提示")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class OptimizeExplanation(SchemaBase):
    """决策解释"""

    conclusion: str = Field(description="结论")
    route_logic: str = Field(description="路由逻辑")
    prediction_usage: str = Field(description="预测使用情况")
    target_match: str = Field(description="目标匹配说明")


class OptimizeResponse(SchemaBase):
    """路径优化总响应（包含 4 套方案 + 决策解释）"""

    schemes: List[SchemeItem] = Field(description="方案列表(4套)")
    explanation: OptimizeExplanation = Field(description="决策解释")
