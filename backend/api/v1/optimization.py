"""路径优化模块路由

前端调用路径为 /optimize/route，路由器在 __init__.py 中挂载于 /optimize 前缀。

直接返回 Service 层生成的完整 OptimizeResponse，包含 4 套对比方案（schemes）
与 LLM 决策解释（explanation）。前端 RouteOptimizationView.tsx 通过
res.data.schemes / res.data.explanation 读取完整数据，驱动 4 列对比表与
路径详情组件动态渲染。
"""
from fastapi import APIRouter, Depends

from dependencies import get_current_user
from schemas.optimization import OptimizeRequest, OptimizeResponse
from services.optimization_service import optimization_service


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/route", response_model=OptimizeResponse, summary="路径优化")
async def optimize_route(req: OptimizeRequest) -> OptimizeResponse:
    """接收请求参数，返回包含 4 套方案的完整 OptimizeResponse

    响应结构：
    - schemes: 4 套方案列表（cost / robust / speed / green），每套含
      route_nodes / transport_modes / steps_detail / total_* / stability_score 等字段
    - explanation: LLM 生成的决策解释（conclusion / route_logic / prediction_usage / target_match）

    risk_id / order_id 参数透传不影响结果（算法为固定模拟值）。
    """
    resp = await optimization_service.optimize(req)
    return resp
