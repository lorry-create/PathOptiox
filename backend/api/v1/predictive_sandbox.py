"""预测沙箱模块路由

前端调用路径为 /predictive-sandbox?offset_hours=N，路由器在 __init__.py 中
挂载于根前缀（无子前缀），最终路径为 /api/predictive-sandbox。
"""
from fastapi import APIRouter, Depends, Query

from dependencies import get_current_user
from schemas.predictive_sandbox import PredictionTimeData
from services.predictive_sandbox_service import predictive_sandbox_service


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=PredictionTimeData, summary="预测沙箱数据")
def get_prediction(
    offset_hours: int = Query(
        default=0, ge=0, le=168, description="时间偏移（小时，0/24/48/72）"
    ),
):
    """返回指定时间偏移的预测数据（对齐前端 predictiveSandboxApi）

    - risks: 风险雷达列表，severity 为大写 LOW/MODERATE/HIGH/CRITICAL
    - actions: 前置处置动作列表，status 为大写 QUEUED/EXECUTING/COMPLETED
    """
    return predictive_sandbox_service.get_prediction(offset_hours)
