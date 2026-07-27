"""路网管理模块路由（S3-T04：动态图结构重构）

提供物流节点与链路的 CRUD 接口，供后台管理界面动态维护路网。
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from schemas.logistics import (
    LogisticsLinkCreate,
    LogisticsLinkListResponse,
    LogisticsLinkResponse,
    LogisticsLinkUpdate,
    LogisticsNodeCreate,
    LogisticsNodeListResponse,
    LogisticsNodeResponse,
    LogisticsNodeUpdate,
)
from services.logistics_service import logistics_network_service


router = APIRouter(dependencies=[Depends(get_current_user)], tags=["路网管理模块"])


# ====================================================================
# 节点管理
# ====================================================================
@router.get("/nodes", response_model=LogisticsNodeListResponse, summary="查询节点列表")
def list_nodes(
    region: Optional[str] = Query(None, description="区域筛选"),
    node_type: Optional[str] = Query(None, description="节点类型筛选"),
    is_active: Optional[bool] = Query(None, description="是否启用"),
    skip: int = Query(0, ge=0, description="分页偏移"),
    limit: int = Query(100, ge=1, le=500, description="每页数量"),
    db: Session = Depends(get_db),
):
    """分页查询物流节点，支持区域/类型/启用状态筛选"""
    total, items = logistics_network_service.list_nodes(
        db, region=region, node_type=node_type, is_active=is_active, skip=skip, limit=limit
    )
    return LogisticsNodeListResponse(total=total, items=items)


@router.get("/nodes/{code}", response_model=LogisticsNodeResponse, summary="获取节点详情")
def get_node(code: str, db: Session = Depends(get_db)):
    """按编码获取节点详情"""
    node = logistics_network_service.get_node_by_code(db, code)
    if not node:
        raise HTTPException(status_code=404, detail=f"节点不存在: {code}")
    return node


@router.post("/nodes", response_model=LogisticsNodeResponse, status_code=201, summary="创建节点")
def create_node(data: LogisticsNodeCreate, db: Session = Depends(get_db)):
    """创建新的物流节点，编码全局唯一"""
    try:
        node = logistics_network_service.create_node(db, data)
        return node
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/nodes/{code}", response_model=LogisticsNodeResponse, summary="更新节点")
def update_node(code: str, data: LogisticsNodeUpdate, db: Session = Depends(get_db)):
    """更新节点信息"""
    node = logistics_network_service.update_node(db, code, data)
    if not node:
        raise HTTPException(status_code=404, detail=f"节点不存在: {code}")
    return node


@router.delete("/nodes/{code}", summary="删除节点")
def delete_node(code: str, db: Session = Depends(get_db)):
    """软删除节点（is_deleted=True, is_active=False）"""
    success = logistics_network_service.delete_node(db, code)
    if not success:
        raise HTTPException(status_code=404, detail=f"节点不存在: {code}")
    return {"success": True, "message": "节点已删除"}


# ====================================================================
# 链路管理
# ====================================================================
@router.get("/links", response_model=LogisticsLinkListResponse, summary="查询链路列表")
def list_links(
    from_node_code: Optional[str] = Query(None, description="起点节点编码"),
    to_node_code: Optional[str] = Query(None, description="终点节点编码"),
    transport_mode: Optional[str] = Query(None, description="运输方式"),
    is_active: Optional[bool] = Query(None, description="是否启用"),
    skip: int = Query(0, ge=0, description="分页偏移"),
    limit: int = Query(200, ge=1, le=1000, description="每页数量"),
    db: Session = Depends(get_db),
):
    """分页查询运输链路，支持起终点/运输方式/启用状态筛选"""
    total, items = logistics_network_service.list_links(
        db,
        from_node_code=from_node_code,
        to_node_code=to_node_code,
        transport_mode=transport_mode,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )
    return LogisticsLinkListResponse(total=total, items=items)


@router.post("/links", response_model=LogisticsLinkResponse, status_code=201, summary="创建链路")
def create_link(data: LogisticsLinkCreate, db: Session = Depends(get_db)):
    """创建新的运输链路，同一起终点+运输方式唯一"""
    try:
        link = logistics_network_service.create_link(db, data)
        return link
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/links", response_model=LogisticsLinkResponse, summary="更新链路")
def update_link(
    from_node_code: str = Query(..., description="起点节点编码"),
    to_node_code: str = Query(..., description="终点节点编码"),
    transport_mode: str = Query(..., description="运输方式"),
    data: LogisticsLinkUpdate = ...,
    db: Session = Depends(get_db),
):
    """更新链路成本/时效/碳排放等属性"""
    link = logistics_network_service.update_link(
        db, from_node_code, to_node_code, transport_mode, data
    )
    if not link:
        raise HTTPException(status_code=404, detail="链路不存在")
    return link


@router.delete("/links", summary="删除链路")
def delete_link(
    from_node_code: str = Query(..., description="起点节点编码"),
    to_node_code: str = Query(..., description="终点节点编码"),
    transport_mode: str = Query(..., description="运输方式"),
    db: Session = Depends(get_db),
):
    """软删除链路（is_active=False）"""
    success = logistics_network_service.delete_link(
        db, from_node_code, to_node_code, transport_mode
    )
    if not success:
        raise HTTPException(status_code=404, detail="链路不存在")
    return {"success": True, "message": "链路已删除"}
