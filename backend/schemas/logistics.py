"""路网管理模块 Schemas（S3-T04）

定义物流节点与链路的请求/响应 Pydantic 模型，
供后台管理界面进行路网动态增删改查。
"""
from typing import List, Optional

from pydantic import BaseModel, Field, computed_field


# ====================================================================
# 节点相关
# ====================================================================
class LogisticsNodeBase(BaseModel):
    code: str = Field(..., max_length=32, description="节点编码（英文，全局唯一）")
    name_cn: str = Field(..., max_length=64, description="中文名称")
    name_en: Optional[str] = Field(None, max_length=64, description="英文名称")
    country: Optional[str] = Field(None, max_length=32, description="国家")
    region: str = Field("global", max_length=32, description="区域编码")
    node_type: str = Field("city", max_length=16, description="节点类型: port/airport/warehouse/city/rail_hub")
    lat: Optional[float] = Field(None, description="纬度")
    lng: Optional[float] = Field(None, description="经度")
    is_hub: bool = Field(False, description="是否为枢纽节点")
    is_active: bool = Field(True, description="是否启用")


class LogisticsNodeCreate(LogisticsNodeBase):
    pass


class LogisticsNodeUpdate(BaseModel):
    name_cn: Optional[str] = Field(None, max_length=64)
    name_en: Optional[str] = Field(None, max_length=64)
    country: Optional[str] = Field(None, max_length=32)
    region: Optional[str] = Field(None, max_length=32)
    node_type: Optional[str] = Field(None, max_length=16)
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_hub: Optional[bool] = None
    is_active: Optional[bool] = None


class LogisticsNodeResponse(LogisticsNodeBase):
    id: int

    class Config:
        from_attributes = True


class LogisticsNodeListResponse(BaseModel):
    total: int
    items: List[LogisticsNodeResponse]


# ====================================================================
# 链路相关
# ====================================================================
class LogisticsLinkAttrs(BaseModel):
    """链路公共属性（不含起终点编码，供 create/response 分别继承）"""
    transport_mode: str = Field(..., max_length=16, description="运输方式: land/rail/sea/air")
    base_cost_usd: float = Field(..., gt=0, description="基础成本（美元）")
    base_time_days: float = Field(..., gt=0, description="基础时效（天）")
    base_carbon_kg: float = Field(..., ge=0, description="基础碳排放（kg）")
    base_risk: float = Field(0.05, ge=0, le=1, description="基础风险值（0-1）")
    distance_km: Optional[float] = Field(None, ge=0, description="距离（公里）")
    is_active: bool = Field(True, description="是否启用")


class LogisticsLinkCreate(LogisticsLinkAttrs):
    from_node_code: str = Field(..., max_length=32, description="起点节点编码")
    to_node_code: str = Field(..., max_length=32, description="终点节点编码")


class LogisticsLinkUpdate(BaseModel):
    base_cost_usd: Optional[float] = Field(None, gt=0)
    base_time_days: Optional[float] = Field(None, gt=0)
    base_carbon_kg: Optional[float] = Field(None, ge=0)
    base_risk: Optional[float] = Field(None, ge=0, le=1)
    distance_km: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None


class LogisticsLinkResponse(LogisticsLinkAttrs):
    id: int
    from_node_code: str
    to_node_code: str

    class Config:
        from_attributes = True


class LogisticsLinkListResponse(BaseModel):
    total: int
    items: List[LogisticsLinkResponse]
