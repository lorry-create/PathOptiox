"""训练历史 ORM 模型

存储保存的模型版本信息，字段对齐 schemas/training.py 的 TrainingHistoryItem。
status 取值：saved / deployed / archived（非 TrainingStatus 枚举）。
S2-T01: created_by 外键已上移至 BaseModel（S2-T02 统一审计字段）。
S2-T03: 移除 created_at_str 列，统一使用 BaseModel.created_at（DateTime）。
       服务层在响应时将 created_at 格式化为 "YYYY-MM-DD HH:mm" 字符串。
S2-T04: status 增加 CHECK 约束。
"""
from sqlalchemy import Column, String, Float, CheckConstraint

from .base import BaseModel


class TrainingHistory(BaseModel):
    """训练历史表"""

    __tablename__ = "training_history"
    __table_args__ = (
        CheckConstraint(
            "status IN ('saved', 'deployed', 'archived')",
            name="ck_training_history_status",
        ),
        {"comment": "训练历史表"},
    )

    model_id = Column(String(64), unique=True, index=True, nullable=False, comment="模型ID")
    version_name = Column(String(100), nullable=False, comment="版本名称")
    # S2-T03: 移除 created_at_str，统一使用 BaseModel.created_at（DateTime）
    reward = Column(Float, nullable=False, default=0.0, comment="奖励值")
    # status 为高频过滤字段，添加索引以加速训练历史筛选
    status = Column(String(20), nullable=False, default="saved", index=True, comment="状态(saved/deployed/archived)")
