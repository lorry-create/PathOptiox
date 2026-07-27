"""SQLAlchemy ORM 模型包

导入所有模型以便 Alembic 自动发现表结构。
"""
from .base import Base, BaseModel
from .order import Order
from .alert import Alert, AlertOrderRel
from .training_history import TrainingHistory
from .user import User
from .system_config import SystemConfig
# Phase A：路网结构模型（动态图结构重构）
from .logistics_network import (
    LogisticsNode,
    LogisticsLink,
    LinkPriceFactor,
    SceneFactor,
)
# S3-T03：RAG 知识库模型
from .knowledge_base import KnowledgeBaseEntry

__all__ = [
    "Base",
    "BaseModel",
    "Order",
    "Alert",
    "AlertOrderRel",
    "TrainingHistory",
    "User",
    "SystemConfig",
    # Phase A：路网结构模型
    "LogisticsNode",
    "LogisticsLink",
    "LinkPriceFactor",
    "SceneFactor",
    # S3-T03：RAG 知识库模型
    "KnowledgeBaseEntry",
]
