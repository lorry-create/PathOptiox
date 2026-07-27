"""碳排放模块路由"""
from typing import List

from fastapi import APIRouter, Depends, Query

from dependencies import get_current_user
from schemas.carbon import (
    CarbonNodeRank,
    CarbonOverview,
    CarbonTrendPoint,
    ESGReport,
    ToggleGreenModeRequest,
    ToggleGreenModeResponse,
)
from services.carbon_service import carbon_service


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/overview", response_model=CarbonOverview, summary="碳排放概览")
def get_overview():
    """返回完整 12 字段碳排放概览数据"""
    return carbon_service.overview()


@router.get("/trend", response_model=List[CarbonTrendPoint], summary="碳排放趋势")
def get_trend(
    time_range: str = Query(default="day", description="时间范围(day/week/month)"),
    transport_mode: str = Query(default="all", description="运输方式(all/sea/rail/air)"),
):
    """根据 time_range 与 transport_mode 生成趋势点；非选中运输模态数值置 0"""
    return carbon_service.trend(time_range=time_range, transport_mode=transport_mode)


@router.get("/nodes", response_model=List[CarbonNodeRank], summary="节点能耗排行")
def get_nodes():
    """返回 8 条节点能耗排行数据"""
    return carbon_service.nodes()


@router.post("/toggle-green-mode", response_model=ToggleGreenModeResponse, summary="切换极绿调度")
def toggle_green_mode(req: ToggleGreenModeRequest):
    """切换极绿调度状态，切换后概览数据对应变化"""
    enabled = carbon_service.toggle_green_mode(req.enable)
    return ToggleGreenModeResponse(enabled=enabled)


@router.get("/esg-report", response_model=ESGReport, summary="ESG 报告")
def get_esg_report():
    """返回完整 ESG 报告数据"""
    return carbon_service.esg_report()
