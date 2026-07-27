"""风险预警 ORM 模型

字段与 schemas/alert.py 的 AlertItem 一一对应。
S2-T01: affected_orders JSON 列已移除，改用 alert_order_rel 中间表。
S2-T01: 新增 handled_by 外键引用 users.id。
S2-T03: time 字段改为 DATETIME 类型（原 String(32)）。
S2-T04: level 增加 CHECK 约束。
"""
from sqlalchemy import Column, String, Float, Boolean, Text, Integer, ForeignKey, DateTime, CheckConstraint
from datetime import datetime

from database import Base
from .base import BaseModel


class Alert(BaseModel):
    """风险预警表"""

    __tablename__ = "alerts"
    __table_args__ = (
        CheckConstraint(
            "level IN ('low', 'moderate', 'high', 'critical')",
            name="ck_alerts_level",
        ),
        {"comment": "风险预警表"},
    )

    alert_no = Column(String(32), unique=True, index=True, nullable=False, comment="预警编号")
    # level / handled 为高频过滤字段，添加索引以加速风险看板查询
    level = Column(String(20), nullable=False, default="low", index=True, comment="风险等级(小写字符串)")
    title = Column(String(200), nullable=False, comment="预警标题")
    content = Column(Text, nullable=False, comment="预警内容")
    # S2-T03: 改用 DATETIME 类型，服务层负责与字符串互转
    time = Column(DateTime, nullable=False, comment="预警时间")
    affected_route = Column(String(200), nullable=False, comment="受影响路线")
    daily_loss = Column(Float, nullable=False, default=0.0, comment="日损失金额")
    ai_suggestion = Column(Text, nullable=True, comment="AI 建议")
    handled = Column(Boolean, nullable=False, default=False, index=True, comment="是否已处置")
    # S2-T01: 处置人外键（nullable：历史预警可能未指派处置人）
    handled_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True, comment="处置人用户ID")


class AlertOrderRel(Base):
    """预警-订单关联表（S2-T01）

    替代原 alerts.affected_orders JSON 列，实现多对多规范化关系。
    """

    __tablename__ = "alert_order_rel"
    __table_args__ = (
        {"comment": "预警-订单关联表（多对多）"},
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True, comment="预警ID")
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True, comment="订单ID")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="创建时间")
