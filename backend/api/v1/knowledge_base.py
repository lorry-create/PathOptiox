"""知识库管理模块路由（S3-T03：向量 RAG）

提供知识库条目的 CRUD 接口和向量检索接口，
供后台管理界面动态维护知识库。
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from schemas.knowledge_base import (
    KnowledgeBaseEntryCreate,
    KnowledgeBaseEntryResponse,
    KnowledgeBaseEntryUpdate,
    KnowledgeBaseListResponse,
    KnowledgeBaseSearchResponse,
    KnowledgeBaseStatsResponse,
)
from services.rag_service import rag_service


router = APIRouter(dependencies=[Depends(get_current_user)], tags=["知识库模块"])


# ====================================================================
# 知识库管理
# ====================================================================
@router.get("", response_model=KnowledgeBaseListResponse, summary="查询知识库列表")
def list_entries(
    category: Optional[str] = Query(None, description="分类筛选"),
    keyword: Optional[str] = Query(None, description="关键词搜索（标题+内容）"),
    skip: int = Query(0, ge=0, description="分页偏移"),
    limit: int = Query(50, ge=1, le=200, description="每页数量"),
    db: Session = Depends(get_db),
):
    """分页查询知识库条目"""
    total, items = rag_service.list_entries(
        db, category=category, keyword=keyword, skip=skip, limit=limit
    )
    return KnowledgeBaseListResponse(total=total, items=items)


@router.get("/stats", response_model=KnowledgeBaseStatsResponse, summary="知识库统计信息")
def get_stats():
    """返回向量索引统计信息（文档数、词汇量、分类列表）"""
    stats = rag_service.stats()
    return KnowledgeBaseStatsResponse(**stats)


@router.get("/{entry_id}", response_model=KnowledgeBaseEntryResponse, summary="获取条目详情")
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    """按 ID 获取知识库条目"""
    entry = rag_service.get_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="知识库条目不存在")
    return entry


@router.post("", response_model=KnowledgeBaseEntryResponse, status_code=201, summary="创建条目")
def create_entry(data: KnowledgeBaseEntryCreate, db: Session = Depends(get_db)):
    """创建新的知识库条目，创建后自动重建向量索引"""
    entry = rag_service.create_entry(
        db,
        title=data.title,
        content=data.content,
        category=data.category,
        source=data.source,
    )
    return entry


@router.put("/{entry_id}", response_model=KnowledgeBaseEntryResponse, summary="更新条目")
def update_entry(entry_id: int, data: KnowledgeBaseEntryUpdate, db: Session = Depends(get_db)):
    """更新知识库条目，更新后自动重建向量索引"""
    entry = rag_service.update_entry(
        db,
        entry_id,
        title=data.title,
        content=data.content,
        category=data.category,
        source=data.source,
    )
    if not entry:
        raise HTTPException(status_code=404, detail="知识库条目不存在")
    return entry


@router.delete("/{entry_id}", summary="删除条目")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    """软删除知识库条目，删除后自动重建向量索引"""
    success = rag_service.delete_entry(db, entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="知识库条目不存在")
    return {"success": True, "message": "条目已删除"}


# ====================================================================
# 向量检索
# ====================================================================
@router.post("/search", response_model=KnowledgeBaseSearchResponse, summary="向量检索")
async def search_knowledge(
    query: str = Query(..., description="查询文本"),
    top_k: int = Query(3, ge=1, le=10, description="返回数量"),
    min_score: float = Query(0.05, ge=0, le=1, description="最低相似度"),
    db: Session = Depends(get_db),
):
    """使用 TF-IDF + 余弦相似度进行向量检索

    - score 范围: [0, 1]，越高越相关
    - 结果按 score 降序排列
    """
    if not rag_service.stats()["initialized"]:
        rag_service.initialize(db)

    results = await rag_service.retrieve(query, top_k=top_k, min_score=min_score)
    return KnowledgeBaseSearchResponse(
        query=query,
        results=results,
        total=len(results),
    )
