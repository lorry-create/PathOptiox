"""API v1 路由聚合模块

统一导入并注册所有业务模块子路由，由 main.py 挂载到 /api 前缀下。
注意：路径前缀严格对齐前端 API 调用路径。
"""
from fastapi import APIRouter

from .auth import router as auth_router
from .order import router as order_router
from .optimization import router as optimization_router
from .carbon import router as carbon_router
from .alert import router as alert_router
from .training import router as training_router, models_router
from .task import router as task_router
from .dashboard import router as dashboard_router
from .chat import router as chat_router
from .predictive_sandbox import router as predictive_sandbox_router
from .simulation import router as simulation_router
from .system import router as system_router
from .logistics import router as logistics_router
from .knowledge_base import router as knowledge_base_router


api_router = APIRouter()

# 注册各业务模块子路由（路径前缀对齐前端调用，均不带尾部斜杠）
api_router.include_router(auth_router, prefix="/auth", tags=["认证模块"])
api_router.include_router(order_router, prefix="/orders", tags=["订单模块"])
# 前端调用 /optimize/route，故前缀为 /optimize
api_router.include_router(optimization_router, prefix="/optimize", tags=["路径优化模块"])
api_router.include_router(carbon_router, prefix="/carbon", tags=["碳排放模块"])
api_router.include_router(alert_router, prefix="/alerts", tags=["风险预警模块"])
api_router.include_router(training_router, prefix="/training", tags=["训练优化模块"])
api_router.include_router(task_router, prefix="/tasks", tags=["通用任务模块"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["仪表盘模块"])
api_router.include_router(chat_router, prefix="/chat", tags=["聊天客服模块"])
# /models 不属于 /training 前缀，前端直接调用 /api/models
api_router.include_router(models_router, tags=["网络模型"])
# 前端调用 /api/predictive-sandbox（无子前缀）
api_router.include_router(predictive_sandbox_router, prefix="/predictive-sandbox", tags=["预测沙箱模块"])
# 前端调用 /api/simulation/run
api_router.include_router(simulation_router, prefix="/simulation", tags=["仿真模块"])
# S2-T06: 系统配置模块（前端调用 /api/system/config）
api_router.include_router(system_router, prefix="/system", tags=["系统配置模块"])
# S3-T04: 路网管理模块（前端调用 /api/logistics/nodes, /api/logistics/links）
api_router.include_router(logistics_router, prefix="/logistics", tags=["路网管理模块"])
# S3-T03: 知识库管理模块（前端调用 /api/knowledge-base）
api_router.include_router(knowledge_base_router, prefix="/knowledge-base", tags=["知识库模块"])


__all__ = ["api_router"]
