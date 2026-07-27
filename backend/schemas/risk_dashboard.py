"""风险仪表盘模块 Pydantic 数据模型

字段严格对齐前端 riskDashboardApi.ts 契约。
- IntelligenceNews.risk_level 大写枚举：'CRITICAL' | 'HIGH' | 'MODERATE'
- RiskMetrics 可为 null（数据未就绪时）
"""
from typing import List, Optional

from pydantic import Field

from .common import SchemaBase


class IntelligenceNews(SchemaBase):
    """情报新闻条目"""

    id: int = Field(description="情报ID")
    title: str = Field(description="情报标题")
    risk_level: str = Field(description="风险等级(CRITICAL/HIGH/MODERATE)")
    region: str = Field(description="影响区域")
    timestamp: str = Field(description="情报时间 ISO 或 YYYY-MM-DD HH:mm")


class RiskMetrics(SchemaBase):
    """风险指标"""

    congestion_index: float = Field(description="拥堵指数(0-100)")
    weather_disruption: float = Field(description="天气干扰系数(0-1)")
    patency_rate: float = Field(description="通畅率(0-1)")
    affected_routes: int = Field(description="受影响路线数")
    updated_at: str = Field(description="更新时间 ISO 或 YYYY-MM-DD HH:mm")


class RiskDashboardData(SchemaBase):
    """风险仪表盘聚合数据"""

    news: List[IntelligenceNews] = Field(description="情报列表")
    metrics: Optional[RiskMetrics] = Field(default=None, description="风险指标（未就绪时为 null）")
