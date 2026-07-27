"""风险预警模块 Pydantic 数据模型

字段严格对齐前端 risk.mock.ts 契约。
"""
from typing import List

from pydantic import Field

from .common import PageResponseBase, SchemaBase
from .enums import RiskLevel


class AlertItem(SchemaBase):
    """预警条目"""

    id: str = Field(description="预警ID")
    level: RiskLevel = Field(description="风险等级")
    title: str = Field(description="预警标题")
    content: str = Field(description="预警内容")
    time: str = Field(description="预警时间 YYYY-MM-DD HH:mm")
    affected_route: str = Field(description="受影响路线")
    affected_orders: List[str] = Field(description="受影响订单ID列表")
    daily_loss: float = Field(description="日损失金额")
    ai_suggestion: str = Field(description="AI 建议")
    handled: bool = Field(description="是否已处置")


class AlertListResponse(PageResponseBase):
    """预警列表响应（继承分页基类）"""

    list: List[AlertItem] = Field(description="预警列表")


class AlertHandleRequest(SchemaBase):
    """预警处置请求"""

    method: str = Field(description="处置方式")
    remark: str | None = Field(default=None, description="备注")


class AlertHandleResponse(SchemaBase):
    """预警处置响应"""

    success: bool = Field(description="是否处置成功")
