"""系统配置模块路由

S2-T06: system_config 表接入系统设置模块
- GET /api/system/config：返回全部系统配置
- PUT /api/system/config：批量更新系统配置
S3-T02: GET /api/system/cache-stats：缓存命中率监控
"""
from fastapi import APIRouter, Depends

from dependencies import get_current_user
from schemas.system_config import (
    SystemConfigResponse,
    SystemConfigItem,
    SystemConfigUpdateRequest,
    SystemConfigUpdateResponse,
)
from services.cache_service import cache_service
from services.system_config_service import system_config_service


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/config", response_model=SystemConfigResponse, summary="查询系统配置")
def get_config():
    """返回全部系统配置项（字典 + 列表形式）"""
    items = system_config_service.list_all()
    configs = {item.config_key: item.config_value or "" for item in items}
    return SystemConfigResponse(configs=configs, items=items)


@router.put(
    "/config",
    response_model=SystemConfigUpdateResponse,
    summary="批量更新系统配置",
)
def update_config(req: SystemConfigUpdateRequest):
    """批量更新系统配置项

    - 只需传入需要更新的键值对，未传入的键保持不变
    - 键不存在时自动创建，存在时更新值
    """
    updated_keys = system_config_service.update_many(req.configs)
    return SystemConfigUpdateResponse(success=True, updated_keys=updated_keys)


@router.get("/cache-stats", summary="缓存状态监控")
def get_cache_stats():
    """S3-T02: 返回 Redis 缓存命中率等统计信息"""
    return cache_service.stats()
