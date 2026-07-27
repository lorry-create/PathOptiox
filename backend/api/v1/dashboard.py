"""仪表盘模块路由

包含全局概览、全局重调度、风险仪表盘三个接口。
- /dashboard/overview: 全局概览
- /dashboard/global-optimize: 全局重调度
- /dashboard/risk-metrics: 风险仪表盘聚合数据（对齐前端 riskDashboardApi）
"""
from fastapi import APIRouter, Depends

from dependencies import get_current_user
from schemas.dashboard import DashboardOverview, GlobalOptimizeResponse
from schemas.risk_dashboard import RiskDashboardData
from services.dashboard_service import dashboard_service
from services.risk_dashboard_service import risk_dashboard_service


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/overview", response_model=DashboardOverview, summary="全局概览")
def get_overview():
    """返回指标卡 + 智能体负载 + 全局状态"""
    return dashboard_service.overview()


@router.post("/global-optimize", response_model=GlobalOptimizeResponse, summary="全局重调度")
async def global_optimize():
    """创建全局重调度任务，立即返回 task_id

    S3-T05：服务层启动 asyncio 后台 Worker 真实推进进度，
    本端点仅创建任务并立即返回 task_id，前端通过 GET /api/tasks/{task_id} 轮询进度。
    """
    task_id = await dashboard_service.global_optimize()
    return GlobalOptimizeResponse(task_id=task_id)


@router.get(
    "/risk-metrics",
    response_model=RiskDashboardData,
    summary="风险仪表盘数据",
)
def get_risk_metrics():
    """返回风险情报列表 + 风险指标聚合（对齐前端 riskDashboardApi）

    - news: 情报列表，risk_level 为大写枚举 CRITICAL/HIGH/MODERATE
    - metrics: 风险指标聚合（congestion_index/weather_disruption/patency_rate 等）
    """
    return risk_dashboard_service.get_risk_metrics()
