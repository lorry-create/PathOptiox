"""Agent 核心模块（强化学习算法 + AI 工作流）

集中存放所有核心 agent 相关代码，与业务服务层完全隔离。

模块组成：
    - environment: 物流网络环境 V1（Gym 风格接口，硬编码 12 节点）
    - environment_v2: 物流网络环境 V2（动态图 + DB 加载 + 状态感知）
    - ppo_agent: Clipped PPO 智能体 V1（PyTorch 优先，numpy 回退）
    - ppo_agent_v2: PPO V2（GNN + 动态动作空间 + 权重感知）
    - multi_agent: 多智能体协同管理器 V1（Dijkstra + PPO 打分）
    - multi_agent_v2: 多智能体协同管理器 V2（PPO 真实寻路 + Dijkstra 兜底）
    - expert_modules_v2: 业务专家模块 V2（揽收/干线/合规/交付）
    - gnn_extractor: 图神经网络特征提取器（GAT）
    - model_storage: 模型权重保存/加载/部署管理
    - xrl_workflow: 基于 LangGraph 的可解释性物流工作流（RL + LLM）
"""
from .environment import (
    LINKS_RAW,
    NODES,
    NODE_INDEX,
    LogisticsEnv,
)
from .model_storage import ModelStorage, model_storage
from .multi_agent import (
    AGENT_TYPES,
    MultiAgentCoordinator,
    multi_agent,
)
from .ppo_agent import (
    PPOAgent,
    build_agent,
    get_backend,
)

__all__ = [
    "LogisticsEnv",
    "NODES",
    "NODE_INDEX",
    "LINKS_RAW",
    "PPOAgent",
    "build_agent",
    "get_backend",
    "ModelStorage",
    "model_storage",
    "MultiAgentCoordinator",
    "multi_agent",
    "AGENT_TYPES",
]
