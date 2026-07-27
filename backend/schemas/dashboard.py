"""仪表盘模块 Pydantic 数据模型

字段严格对齐前端 dashboard.mock.ts 契约。
注意：metrics 字段命名为 on_time_trend（非 on_time_rate_trend）、emission_trend。
"""
from typing import List

from pydantic import Field

from .common import SchemaBase


class DashboardMetrics(SchemaBase):
    """仪表盘指标卡数据（8 个字段）"""

    active_orders: int = Field(description="活跃订单数")
    active_orders_trend: float = Field(description="活跃订单趋势")
    on_time_rate: float = Field(description="准时率(%)")
    on_time_trend: float = Field(description="准时率趋势")
    total_emission_kg: float = Field(description="总排放量(kg)")
    emission_trend: float = Field(description="排放趋势")
    risk_count: int = Field(description="风险数量")
    risk_trend: float = Field(description="风险趋势")


class AgentLoadInfo(SchemaBase):
    """智能体负载信息"""

    agent_id: str = Field(description="智能体ID")
    name: str = Field(description="智能体名称")
    load: float = Field(description="负载(0-1)")
    status: str = Field(description="状态(idle/active/busy)")


class GlobalStatus(SchemaBase):
    """全局状态"""

    network_health: float = Field(description="网络健康度(0-1)")
    avg_latency_ms: float = Field(description="平均延迟(ms)")
    active_tasks: int = Field(description="活跃任务数")


class DashboardOverview(SchemaBase):
    """仪表盘全局概览"""

    metrics: DashboardMetrics = Field(description="指标卡数据")
    agent_load: List[AgentLoadInfo] = Field(description="智能体负载列表")
    global_status: GlobalStatus = Field(description="全局状态")


class GlobalOptimizeResponse(SchemaBase):
    """全局重调度响应"""

    task_id: str = Field(description="重调度任务ID")
