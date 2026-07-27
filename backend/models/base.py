"""ORM 基础模型

包含通用字段：id、created_at、updated_at。
S2-T02: 增加审计字段 created_by、updated_by、is_deleted、deleted_at。
所有业务模型应继承 BaseModel 而非直接继承 Base。
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer

from database import Base


class BaseModel(Base):
    """ORM 基础模型

    通用字段：
        id: 自增主键
        created_at: 创建时间（UTC）
        updated_at: 更新时间（UTC，每次更新自动刷新）
        created_by: 创建人用户ID（S2-T02 审计字段，FK -> users.id）
        updated_by: 更新人用户ID（S2-T02 审计字段，FK -> users.id）
        is_deleted: 软删除标记（S2-T02，默认 False）
        deleted_at: 软删除时间（S2-T02，NULL 表示未删除）

    用法：
        class Order(BaseModel):
            __tablename__ = "orders"
            customer_name = Column(String(100), nullable=False)
    """

    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(
        DateTime, default=datetime.utcnow, nullable=False, comment="创建时间"
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
        comment="更新时间",
    )
    # S2-T02: 审计字段
    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
        comment="创建人用户ID",
    )
    updated_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
        comment="更新人用户ID",
    )
    # S2-T02: 软删除
    is_deleted = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        comment="是否已软删除",
    )
    deleted_at = Column(
        DateTime,
        nullable=True,
        comment="软删除时间",
    )
