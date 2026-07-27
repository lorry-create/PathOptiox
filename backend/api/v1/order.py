"""订单模块路由

注意：静态路径（/metrics、/batch-dispatch）必须声明在动态路径 /{id} 之前，
否则会被 {id} 参数捕获。
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from dependencies import get_current_user
from schemas.order import (
    BatchDispatchRequest,
    BatchDispatchResponse,
    OrderCreate,
    OrderListResponse,
    OrderMetricsData,
    OrderResponse,
    OrderUpdate,
)
from services.order_service import order_service


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=OrderListResponse, summary="查询订单列表")
def list_orders(
    keyword: Optional[str] = Query(default=None, description="关键词(订单ID/客户名)"),
    status: Optional[str] = Query(default=None, description="订单状态过滤"),
):
    """支持 keyword、status 过滤"""
    orders = order_service.list_orders(keyword=keyword, status=status)
    return OrderListResponse(orders=orders, total=len(orders))


@router.get("/metrics", response_model=OrderMetricsData, summary="订单指标统计")
def get_metrics():
    """根据内存订单数据实时统计"""
    return order_service.metrics()


@router.post("/batch-dispatch", response_model=BatchDispatchResponse, summary="批量调度")
async def batch_dispatch(req: BatchDispatchRequest):
    """创建批量调度任务，立即返回 task_id。

    修复后：本接口为 async，会在内部启动后台 asyncio Worker 推进真实进度，
    接口本身仍立即返回 task_id（不阻塞）。Worker 每 0.5s 推进 5%，5s 完成。
    """
    task_id = await order_service.batch_dispatch(req.order_ids)
    return BatchDispatchResponse(task_id=task_id)


@router.post("", response_model=OrderResponse, summary="创建订单")
def create_order(req: OrderCreate, current_user=Depends(get_current_user)):
    """创建新订单（S2-T02: 记录 created_by）"""
    return order_service.create_order(req, creator_user_id=current_user.id)


@router.get("/{order_id}", response_model=OrderResponse, summary="查询订单详情")
def get_order(order_id: str):
    """根据 ID 返回订单详情，不存在返回 404"""
    order = order_service.get_order(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return order


@router.put("/{order_id}", response_model=OrderResponse, summary="更新订单")
def update_order(order_id: str, req: OrderUpdate, current_user=Depends(get_current_user)):
    """更新订单信息（S2-T02: 记录 updated_by）"""
    order = order_service.update_order(order_id, req, updater_user_id=current_user.id)
    if order is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return order


@router.delete("/{order_id}", summary="删除订单（软删除）")
def delete_order(order_id: str):
    """软删除订单（S2-T02: 设置 is_deleted=True）"""
    ok = order_service.delete_order(order_id)
    if not ok:
        raise HTTPException(status_code=404, detail="订单不存在")
    return {"success": True}


@router.post("/{order_id}/match-capacity", summary="运力匹配")
def match_capacity(order_id: str):
    """模拟运力匹配"""
    result = order_service.match_capacity(order_id)
    if result is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return result


@router.get("/{order_id}/capacity-analysis", summary="运力分析")
def capacity_analysis(order_id: str):
    """返回模拟运力分析数据"""
    result = order_service.capacity_analysis(order_id)
    if result is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return result


@router.get("/{order_id}/carbon", summary="订单碳排放")
def order_carbon(order_id: str):
    """返回模拟碳排放数据"""
    result = order_service.order_carbon(order_id)
    if result is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return result
