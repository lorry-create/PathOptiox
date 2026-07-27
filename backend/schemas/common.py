"""通用基础 Pydantic 数据模型

提供所有 Schema 的基类（开启 from_attributes 兼容 ORM）、分页查询/响应基类。
"""
from typing import TypeVar

from pydantic import BaseModel, ConfigDict, Field


T = TypeVar("T")


class SchemaBase(BaseModel):
    """所有业务 Schema 的基类

    开启 from_attributes=True，便于从 ORM 模型实例直接构造（model_validate）。
    """

    model_config = ConfigDict(from_attributes=True)


class PageQueryBase(SchemaBase):
    """分页查询基类"""

    page: int = Field(default=1, ge=1, description="页码，从 1 开始")
    page_size: int = Field(default=10, ge=1, description="每页条数")


class PageResponseBase(SchemaBase):
    """分页响应基类"""

    total: int = Field(description="总记录数")
    page: int = Field(description="当前页码")
    page_size: int = Field(description="每页条数")
