"""仿真模块路由

前端调用路径为 /simulation/run，路由器在 __init__.py 中挂载于 /simulation 前缀。
"""
from fastapi import APIRouter, Depends

from dependencies import get_current_user
from schemas.simulation import SimulationRunRequest, SimulationRunResponse
from services.simulation_service import simulation_service


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/run", response_model=SimulationRunResponse, summary="仿真运行")
def run_simulation(req: SimulationRunRequest):
    """执行仿真运行，返回 base/robust 两套策略对比（对齐前端 simulationApi）

    - base: 基础策略结果（无 RL 优化）
    - robust: 稳健策略结果（启用 RL 优化）
    - risk_reduction_pct: 风险降低百分比
    """
    return simulation_service.run(req)
