"""训练优化模块 Pydantic 数据模型

字段严格对齐前端 trainingApi.ts 契约（PPO/MARL/Predict 参数权威定义来源）。
注意：PredictParams 字段名以 trainingApi.ts 为准（feature_policy / source_historical），
非文档笔误的 feature_customs / source_history。
"""
from typing import List

from pydantic import Field

from .common import SchemaBase
from .enums import TrainingStatus


class PpoParams(SchemaBase):
    """PPO 参数（13 个字段）"""

    learning_rate: float = Field(description="学习率")
    clip_epsilon: float = Field(description="裁剪系数")
    entropy_coef: float = Field(description="熵正则系数")
    gamma: float = Field(description="折扣因子")
    gae_lambda: float = Field(description="GAE lambda")
    batch_size: int = Field(description="批大小")
    epochs: int = Field(description="每轮更新次数")
    value_loss_coef: float = Field(description="价值损失系数")
    use_dqn: bool = Field(description="是否启用 DQN 替代 PPO")
    reward_cost: float = Field(description="成本奖励权重")
    reward_time: float = Field(description="时效奖励权重")
    reward_carbon: float = Field(description="碳排放奖励权重")
    reward_risk: float = Field(description="风险奖励权重")


class MarlParams(SchemaBase):
    """多智能体参数（9 个字段）"""

    num_agents: int = Field(description="智能体数量")
    communication_rounds: int = Field(description="通信轮数")
    shared_memory: bool = Field(description="是否共享记忆")
    coop_algorithm: str = Field(description="合作算法(maddpg/coma/qmix)")
    global_reward_weight: float = Field(description="全局奖励权重")
    agent_pickup: bool = Field(description="取货智能体开关")
    agent_trunk: bool = Field(description="干线智能体开关")
    agent_compliance: bool = Field(description="合规智能体开关")
    agent_delivery: bool = Field(description="送达智能体开关")


class PredictParams(SchemaBase):
    """预测参数（12 个字段）

    字段名以 trainingApi.ts 为准：
    - feature_policy（非 feature_customs）
    - source_historical（非 source_history）
    """

    sequence_length: int = Field(description="序列长度")
    hidden_size: int = Field(description="隐藏层大小")
    num_layers: int = Field(description="网络层数")
    forecast_days: int = Field(description="预测天数")
    feature_weather: bool = Field(description="天气特征开关")
    feature_port_congestion: bool = Field(description="港口拥堵特征开关")
    feature_fuel_price: bool = Field(description="燃油价格特征开关")
    feature_policy: bool = Field(description="政策特征开关")
    source_historical: bool = Field(description="历史数据源开关")
    source_realtime: bool = Field(description="实时数据源开关")
    source_external: bool = Field(description="外部数据源开关")
    fusion_method: str = Field(description="融合方法(concat/attention/gating)")


class TrainingStartRequest(SchemaBase):
    """训练启动请求"""

    network_model: str = Field(description="网络模型ID")
    ppo_params: PpoParams = Field(description="PPO 参数")
    marl_params: MarlParams = Field(description="MARL 参数")
    predict_params: PredictParams = Field(description="预测参数")


class TrainingStartResponse(SchemaBase):
    """训练启动响应"""

    task_id: str = Field(description="训练任务ID")


class TrainingStatusResponse(SchemaBase):
    """训练状态响应（8 个字段）"""

    task_id: str = Field(description="任务ID")
    progress: float = Field(description="进度(0-1)")
    current_episode: int = Field(description="当前轮次")
    total_episodes: int = Field(description="总轮次")
    reward: float = Field(description="当前奖励值")
    loss: float = Field(description="当前损失值")
    status: TrainingStatus = Field(description="训练状态")
    logs: List[str] = Field(description="日志列表")


class TrainingSaveRequest(SchemaBase):
    """保存模型请求"""

    version_name: str = Field(description="版本名称")


class TrainingSaveResponse(SchemaBase):
    """保存模型响应"""

    model_id: str = Field(description="模型ID")


class TrainingDeployResponse(SchemaBase):
    """部署模型响应"""

    success: bool = Field(description="是否部署成功")


class TrainingHistoryItem(SchemaBase):
    """训练历史条目

    status 取值：saved / deployed / archived（非 TrainingStatus 枚举）
    """

    model_id: str = Field(description="模型ID")
    version_name: str = Field(description="版本名称")
    created_at: str = Field(description="创建时间 YYYY-MM-DD HH:mm")
    reward: float = Field(description="奖励值")
    status: str = Field(description="状态(saved/deployed/archived)")


class NetworkModelItem(SchemaBase):
    """网络模型条目"""

    id: str = Field(description="模型ID")
    name: str = Field(description="模型名称")
    description: str = Field(description="模型描述")
    created_at: str = Field(description="创建时间 YYYY-MM-DD")


class TrainingControlResponse(SchemaBase):
    """训练暂停/恢复控制响应"""

    task_id: str = Field(description="任务ID")
    status: str = Field(description="状态(running/paused)")
