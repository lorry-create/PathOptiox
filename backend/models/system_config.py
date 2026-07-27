"""系统配置 ORM 模型

存储极绿调度开关等全局状态，采用 key-value 结构便于扩展。
"""
from sqlalchemy import Column, String, Text

from .base import BaseModel


class SystemConfig(BaseModel):
    """系统配置表（key-value）"""

    __tablename__ = "system_config"
    __table_args__ = {"comment": "系统配置表"}

    config_key = Column(String(64), unique=True, index=True, nullable=False, comment="配置键")
    config_value = Column(Text, nullable=True, comment="配置值(字符串)")
    description = Column(String(200), nullable=True, comment="配置说明")
