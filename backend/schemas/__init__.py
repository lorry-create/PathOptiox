"""Pydantic 数据模型包 (schemas)

统一导出所有业务模块的数据模型，方便外部 `from schemas import XxxModel` 导入。
"""
# 通用基础
from .common import SchemaBase, PageQueryBase, PageResponseBase

# 枚举
from .enums import (
    OrderStatus,
    RiskLevel,
    TransportMode,
    SchemeId,
    TrainingStatus,
    TaskStatus,
)

# 订单模块
from .order import (
    OrderBase,
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderListResponse,
    OrderMetricsData,
    BatchDispatchRequest,
    BatchDispatchResponse,
)

# 路径优化模块
from .optimization import (
    OptimizeRequest,
    StepDetail,
    SchemeItem,
    OptimizeExplanation,
    OptimizeResponse,
)

# 碳排放模块
from .carbon import (
    CarbonOverview,
    CarbonTrendPoint,
    CarbonNodeRank,
    ToggleGreenModeRequest,
    ToggleGreenModeResponse,
    ESGReport,
)

# 风险预警模块
from .alert import (
    AlertItem,
    AlertListResponse,
    AlertHandleRequest,
    AlertHandleResponse,
)

# 训练优化模块
from .training import (
    PpoParams,
    MarlParams,
    PredictParams,
    TrainingStartRequest,
    TrainingStartResponse,
    TrainingStatusResponse,
    TrainingSaveRequest,
    TrainingSaveResponse,
    TrainingDeployResponse,
    TrainingHistoryItem,
    NetworkModelItem,
    TrainingControlResponse,
)

# 通用任务模块
from .task import TaskInfo

# 仪表盘模块
from .dashboard import (
    DashboardMetrics,
    AgentLoadInfo,
    GlobalStatus,
    DashboardOverview,
    GlobalOptimizeResponse,
)

# 聊天模块
from .chat import ChatRequest, ChatResponse

# 风险仪表盘模块
from .risk_dashboard import (
    IntelligenceNews,
    RiskMetrics,
    RiskDashboardData,
)

# 预测沙箱模块
from .predictive_sandbox import (
    RiskRadar,
    PreemptiveAction,
    PredictionTimeData,
)

# 仿真模块
from .simulation import (
    P90Range,
    SimulationStrategy,
    SimulationRunRequest,
    SimulationRunResponse,
)

# 系统配置模块
from .system_config import (
    SystemConfigItem,
    SystemConfigResponse,
    SystemConfigUpdateRequest,
    SystemConfigUpdateResponse,
)


__all__ = [
    # 通用基础
    "SchemaBase",
    "PageQueryBase",
    "PageResponseBase",
    # 枚举
    "OrderStatus",
    "RiskLevel",
    "TransportMode",
    "SchemeId",
    "TrainingStatus",
    "TaskStatus",
    # 订单
    "OrderBase",
    "OrderCreate",
    "OrderUpdate",
    "OrderResponse",
    "OrderListResponse",
    "OrderMetricsData",
    "BatchDispatchRequest",
    "BatchDispatchResponse",
    # 路径优化
    "OptimizeRequest",
    "StepDetail",
    "SchemeItem",
    "OptimizeExplanation",
    "OptimizeResponse",
    # 碳排放
    "CarbonOverview",
    "CarbonTrendPoint",
    "CarbonNodeRank",
    "ToggleGreenModeRequest",
    "ToggleGreenModeResponse",
    "ESGReport",
    # 风险预警
    "AlertItem",
    "AlertListResponse",
    "AlertHandleRequest",
    "AlertHandleResponse",
    # 训练
    "PpoParams",
    "MarlParams",
    "PredictParams",
    "TrainingStartRequest",
    "TrainingStartResponse",
    "TrainingStatusResponse",
    "TrainingSaveRequest",
    "TrainingSaveResponse",
    "TrainingDeployResponse",
    "TrainingHistoryItem",
    "NetworkModelItem",
    "TrainingControlResponse",
    # 通用任务
    "TaskInfo",
    # 仪表盘
    "DashboardMetrics",
    "AgentLoadInfo",
    "GlobalStatus",
    "DashboardOverview",
    "GlobalOptimizeResponse",
    # 聊天
    "ChatRequest",
    "ChatResponse",
    # 风险仪表盘
    "IntelligenceNews",
    "RiskMetrics",
    "RiskDashboardData",
    # 预测沙箱
    "RiskRadar",
    "PreemptiveAction",
    "PredictionTimeData",
    # 仿真
    "P90Range",
    "SimulationStrategy",
    "SimulationRunRequest",
    "SimulationRunResponse",
    # 系统配置
    "SystemConfigItem",
    "SystemConfigResponse",
    "SystemConfigUpdateRequest",
    "SystemConfigUpdateResponse",
]
