"""知识库模块 Schemas（S3-T03：向量 RAG）"""
from typing import List, Optional

from pydantic import BaseModel, Field


class KnowledgeBaseEntryBase(BaseModel):
    title: str = Field(..., max_length=200, description="条目标题")
    content: str = Field(..., description="正文内容")
    category: str = Field("general", max_length=64, description="分类")
    source: Optional[str] = Field(None, max_length=200, description="来源")


class KnowledgeBaseEntryCreate(KnowledgeBaseEntryBase):
    pass


class KnowledgeBaseEntryUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    category: Optional[str] = Field(None, max_length=64)
    source: Optional[str] = Field(None, max_length=200)


class KnowledgeBaseEntryResponse(KnowledgeBaseEntryBase):
    id: int

    class Config:
        from_attributes = True


class KnowledgeBaseListResponse(BaseModel):
    total: int
    items: List[KnowledgeBaseEntryResponse]


class KnowledgeBaseSearchResponse(BaseModel):
    query: str
    results: List[dict]
    total: int


class KnowledgeBaseStatsResponse(BaseModel):
    initialized: bool
    doc_count: int
    vocab_size: int
    categories: List[str]
