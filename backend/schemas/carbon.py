"""碳排放模块 Pydantic 数据模型

字段严格对齐前端 carbon.mock.ts 契约。
CarbonOverview 共 12 个字段，顺序与前端完全一致。
"""
from typing import List

from pydantic import Field

from .common import SchemaBase


class CarbonOverview(SchemaBase):
    """碳排放概览（12 个字段）"""

    total_emission_kg: float = Field(description="总排放量(kg)")
    trend_pct: float = Field(description="排放环比百分比")
    green_rate: float = Field(description="绿色运输占比(%)")
    green_rate_trend: float = Field(description="绿色占比趋势")
    offset_count_kg: float = Field(description="碳抵消量(kg)")
    offset_trend: float = Field(description="抵消趋势")
    esg_score: float = Field(description="ESG 评分")
    esg_trend: float = Field(description="ESG 评分趋势")
    energy_consumption_kwh: float = Field(description="总能耗(kWh)")
    energy_trend: float = Field(description="能耗趋势")
    pue: float = Field(description="PUE 能源效率")
    pue_trend: float = Field(description="PUE 趋势")


class CarbonTrendPoint(SchemaBase):
    """碳排放趋势数据点"""

    date: str = Field(description="日期/时间标签")
    sea: float = Field(description="海运排放(kg)")
    air: float = Field(description="空运排放(kg)")
    land: float = Field(description="陆运排放(kg)")
    rail: float = Field(description="铁路排放(kg)")


class CarbonNodeRank(SchemaBase):
    """节点能耗排行"""

    node_id: str = Field(description="节点ID")
    node_name: str = Field(description="节点名称")
    emission_kg: float = Field(description="排放量(kg)")
    trend_pct: float = Field(description="趋势百分比")


class ToggleGreenModeRequest(SchemaBase):
    """切换极绿调度请求"""

    enable: bool = Field(description="是否启用极绿调度")


class ToggleGreenModeResponse(SchemaBase):
    """切换极绿调度响应"""

    enabled: bool = Field(description="当前启用状态")


class ESGReport(SchemaBase):
    """ESG 报告"""

    report_period: str = Field(description="报告周期")
    total_emission: float = Field(description="总排放量")
    scope1: float = Field(description="范围1排放(直接)")
    scope2: float = Field(description="范围2排放(间接-能源)")
    scope3: float = Field(description="范围3排放(价值链)")
    reduction_target: float = Field(description="减排目标(%)")
    actual_reduction: float = Field(description="实际减排(%)")
    highlights: List[str] = Field(description="亮点列表")
