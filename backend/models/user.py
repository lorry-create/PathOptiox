"""用户 ORM 模型

JWT 鉴权启用后，密码以 bcrypt 哈希存储（hashed_password 字段）。
"""
from sqlalchemy import Column, String, Boolean

from .base import BaseModel


class User(BaseModel):
    """用户表"""

    __tablename__ = "users"
    __table_args__ = {"comment": "用户表"}

    username = Column(String(64), unique=True, index=True, nullable=False, comment="用户名")
    # bcrypt 哈希长度约 60 字符，String(128) 足够；禁止明文存储
    hashed_password = Column(String(128), nullable=False, comment="密码哈希值（bcrypt）")
    email = Column(String(128), nullable=True, comment="邮箱")
    full_name = Column(String(64), nullable=True, comment="姓名")
    is_admin = Column(Boolean, nullable=False, default=False, comment="是否管理员")
