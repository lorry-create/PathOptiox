"""系统配置 Pydantic 数据模型

S2-T06: system_config 表接入系统设置模块
- 提供 GET/PUT /api/system/config 接口的数据模型
- 采用 key-value 结构，支持批量读取与更新
"""
from typing import Dict, List, Optional

from pydantic import Field

from .common import SchemaBase


class SystemConfigItem(SchemaBase):
    """单个配置项"""

    config_key: str = Field(description="配置键")
    config_value: Optional[str] = Field(default=None, description="配置值(字符串)")
    description: Optional[str] = Field(default=None, description="配置说明")


class SystemConfigResponse(SchemaBase):
    """配置查询响应：返回全部配置项的字典 + 列表形式"""

    configs: Dict[str, str] = Field(
        default_factory=dict,
        description="配置键值对字典 { config_key: config_value }",
    )
    items: List[SystemConfigItem] = Field(
        default_factory=list,
        description="配置项列表（含 description）",
    )


class SystemConfigUpdateRequest(SchemaBase):
    """批量更新配置项请求

    只需传入需要更新的键值对，未传入的键保持不变。
    键不存在时自动创建，存在时更新值。
    """

    configs: Dict[str, str] = Field(
        default_factory=dict,
        description="需更新的配置键值对 { config_key: config_value }",
    )


class SystemConfigUpdateResponse(SchemaBase):
    """配置更新响应"""

    success: bool = Field(description="是否更新成功")
    updated_keys: List[str] = Field(
        default_factory=list, description="已更新的配置键列表"
    )
