"""知识库 ORM 模型（S3-T03：向量 RAG）

用于存储 RAG 知识库条目，支持动态增删改查。
向量索引在服务层内存中维护，数据持久化到 SQLite。
"""
from sqlalchemy import Column, Index, String, Text

from .base import BaseModel


class KnowledgeBaseEntry(BaseModel):
    """知识库条目

    每条知识库条目包含标题、分类和正文内容。
    向量表示由 RagService 在内存中计算和维护。
    """

    __tablename__ = "knowledge_base"
    __table_args__ = (
        Index("ix_kb_category", "category"),
        Index("ix_kb_title", "title"),
        {"comment": "RAG 知识库条目表"},
    )

    title = Column(String(200), nullable=False, comment="条目标题")
    category = Column(String(64), nullable=False, default="general", index=True, comment="分类")
    content = Column(Text, nullable=False, comment="正文内容")
    source = Column(String(200), nullable=True, comment="来源（可选）")

    def __repr__(self) -> str:
        return f"<KnowledgeBaseEntry(id={self.id}, title={self.title!r}, category={self.category!r})>"
