"""全局业务枚举定义

所有枚举值均为小写字符串，与前端 src/constants/enums.ts 字典完全对应。
禁止自行修改枚举值，否则前后端联调必出错。
"""
from enum import Enum


class OrderStatus(str, Enum):
    """订单状态：对齐前端 OrderStatus"""

    pending = "pending"
    in_transit = "in_transit"
    delivered = "delivered"
    exception = "exception"


class RiskLevel(str, Enum):
    """风险等级：对齐前端 RiskLevel"""

    low = "low"
    moderate = "moderate"
    high = "high"
    critical = "critical"


class TransportMode(str, Enum):
    """运输方式：对齐前端 TransportMode"""

    sea = "sea"
    air = "air"
    land = "land"
    rail = "rail"
    land_customs = "land_customs"


class SchemeId(str, Enum):
    """路径方案 ID：对齐前端 SchemeId"""

    cost = "cost"
    robust = "robust"
    speed = "speed"
    green = "green"


class TrainingStatus(str, Enum):
    """训练状态：对齐前端 TrainingStatus"""

    running = "running"
    paused = "paused"
    finished = "finished"


class TaskStatus(str, Enum):
    """通用任务状态：对齐前端 task.mock.ts MockTaskState.status"""

    pending = "pending"
    running = "running"
    paused = "paused"
    success = "success"
    failed = "failed"
