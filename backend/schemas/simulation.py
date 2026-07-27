"""仿真模块 Pydantic 数据模型

字段严格对齐前端 simulationApi.ts 契约。
- SimulationRunRequest.mode: 'normal' | 'stress'
- SimulationRunResponse 包含 base/robust 两套策略对比
- P90Range 表示 P90 置信区间上下界
"""
from typing import Literal

from pydantic import Field

from .common import SchemaBase


class P90Range(SchemaBase):
    """P90 置信区间"""

    p90_lower: float = Field(description="P90 下界")
    p90_upper: float = Field(description="P90 上界")


class SimulationStrategy(SchemaBase):
    """仿真策略结果（成本/时效 P90 区间 + 稳定性）"""

    cost: P90Range = Field(description="成本 P90 区间")
    time: P90Range = Field(description="时效 P90 区间")
    stability: float = Field(description="稳定性评分(0-1)")


class SimulationRunRequest(SchemaBase):
    """仿真运行请求"""

    mode: Literal["normal", "stress"] = Field(default="normal", description="仿真模式")
    rl_cost: float = Field(default=0.0, description="成本权重(0-1)")
    rl_time: float = Field(default=0.0, description="时效权重(0-1)")
    rl_carbon: float = Field(default=0.0, description="碳排放权重(0-1)")


class SimulationRunResponse(SchemaBase):
    """仿真运行响应"""

    mode: str = Field(description="仿真模式")
    base: SimulationStrategy = Field(description="基础策略结果")
    robust: SimulationStrategy = Field(description="稳健策略结果")
    risk_reduction_pct: float = Field(description="风险降低百分比")
    description: str = Field(description="结果描述")
