"""订单 ORM 模型

字段与 schemas/order.py 的 OrderBase 一一对应。
status 枚举存小写字符串（对齐前端 OrderStatus）。
S2-T01: created_by 外键已上移至 BaseModel（S2-T02 统一审计字段）。
S2-T03: date 字段改为 DATE 类型（原 String(20)）。
S2-T04: status / shipping_method 增加 CHECK 约束。
"""
from sqlalchemy import Column, String, Float, Date, CheckConstraint

from .base import BaseModel


class Order(BaseModel):
    """订单表"""

    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'in_transit', 'delivered', 'exception')",
            name="ck_orders_status",
        ),
        CheckConstraint(
            "shipping_method IS NULL OR shipping_method IN ('land', 'sea', 'air', 'rail', 'land_customs')",
            name="ck_orders_shipping_method",
        ),
        {"comment": "订单表"},
    )

    # 业务主键（前端使用的订单ID，如 CN77218841）
    # 注意：业务 ID 与 ORM 自增 id 分离，业务 ID 用唯一索引
    order_no = Column(String(32), unique=True, index=True, nullable=False, comment="订单编号")
    customer_name = Column(String(100), nullable=False, comment="客户名称")
    # date / status 为高频过滤字段，添加索引以加速列表查询
    # S2-T03: 改用 DATE 类型，服务层负责与字符串互转
    date = Column(Date, nullable=False, index=True, comment="订单日期")
    total_amount = Column(Float, nullable=False, default=0.0, comment="订单总金额")
    status = Column(String(20), nullable=False, default="pending", index=True, comment="订单状态(小写字符串)")
    sender = Column(String(200), nullable=True, comment="发件方")
    receiver = Column(String(200), nullable=True, comment="收件方")
    goods_description = Column(String(500), nullable=True, comment="货物描述")
    shipping_method = Column(String(20), nullable=True, comment="运输方式")
    estimated_delivery = Column(String(20), nullable=True, comment="预计送达日期")
