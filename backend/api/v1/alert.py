"""风险预警模块路由"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from dependencies import get_current_user
from schemas.alert import (
    AlertHandleRequest,
    AlertHandleResponse,
    AlertItem,
    AlertListResponse,
)
from services.alert_service import alert_service


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=AlertListResponse, summary="查询预警列表")
def list_alerts(
    level: Optional[str] = Query(default=None, description="风险等级过滤"),
    handled: Optional[bool] = Query(default=None, description="是否已处置过滤"),
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=10, ge=1, description="每页条数"),
):
    """支持 level、handled 过滤，page/page_size 分页"""
    return alert_service.list_alerts(
        level=level, handled=handled, page=page, page_size=page_size
    )


@router.get("/{alert_id}", response_model=AlertItem, summary="查询预警详情")
def get_alert(alert_id: str):
    """返回预警详情"""
    alert = alert_service.get_alert(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="预警不存在")
    return alert


@router.post("/{alert_id}/handle", response_model=AlertHandleResponse, summary="处置预警")
def handle_alert(alert_id: str, req: AlertHandleRequest, current_user=Depends(get_current_user)):
    """标记预警已处置，更新 handled 字段为 true，记录处置人（S2-T01: handled_by）"""
    ok = alert_service.handle_alert(alert_id, handler_user_id=current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="预警不存在")
    return AlertHandleResponse(success=True)
