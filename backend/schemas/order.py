"""订单模块 Pydantic 数据模型

字段严格对齐前端 order.mock.ts 与 orderApi.ts 契约。
"""
from typing import List, Optional

from pydantic import Field

from .common import SchemaBase
from .enums import OrderStatus


class OrderBase(SchemaBase):
    """订单基础字段"""

    id: str = Field(description="订单ID")
    customer_name: str = Field(description="客户名称")
    date: str = Field(description="订单日期 YYYY-MM-DD")
    total_amount: float = Field(description="订单总金额")
    status: OrderStatus = Field(description="订单状态")
    sender: Optional[str] = Field(default=None, description="发件方")
    receiver: Optional[str] = Field(default=None, description="收件方")
    goods_description: Optional[str] = Field(default=None, description="货物描述")
    shipping_method: Optional[str] = Field(default=None, description="运输方式")
    estimated_delivery: Optional[str] = Field(default=None, description="预计送达日期")


class OrderCreate(SchemaBase):
    """创建订单请求（去掉 id，由后端生成）"""

    customer_name: str = Field(description="客户名称")
    date: str = Field(description="订单日期 YYYY-MM-DD")
    total_amount: float = Field(description="订单总金额")
    status: OrderStatus = Field(description="订单状态")
    sender: Optional[str] = Field(default=None, description="发件方")
    receiver: Optional[str] = Field(default=None, description="收件方")
    goods_description: Optional[str] = Field(default=None, description="货物描述")
    shipping_method: Optional[str] = Field(default=None, description="运输方式")
    estimated_delivery: Optional[str] = Field(default=None, description="预计送达日期")


class OrderUpdate(SchemaBase):
    """更新订单请求（所有字段可选）"""

    customer_name: Optional[str] = None
    date: Optional[str] = None
    total_amount: Optional[float] = None
    status: Optional[OrderStatus] = None
    sender: Optional[str] = None
    receiver: Optional[str] = None
    goods_description: Optional[str] = None
    shipping_method: Optional[str] = None
    estimated_delivery: Optional[str] = None


class OrderResponse(OrderBase):
    """订单响应（继承 OrderBase 全部字段）"""

    pass


class OrderListResponse(SchemaBase):
    """订单列表响应"""

    orders: List[OrderResponse] = Field(description="订单列表")
    total: int = Field(description="总记录数")


class OrderMetricsData(SchemaBase):
    """订单指标统计"""

    total_count: int = Field(description="订单总数")
    in_transit_count: int = Field(description="运输中订单数")
    avg_processing_hours: float = Field(description="平均处理时长(小时)")
    exception_count: int = Field(description="异常订单数")
    total_trend: float = Field(description="总数趋势百分比")
    exception_trend: float = Field(description="异常趋势百分比")


class BatchDispatchRequest(SchemaBase):
    """批量调度请求"""

    order_ids: List[str] = Field(description="待调度订单ID列表")


class BatchDispatchResponse(SchemaBase):
    """批量调度响应"""

    task_id: str = Field(description="调度任务ID")
