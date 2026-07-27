"""rag_service.py - 向量 RAG 检索服务（S3-T03）

将原关键词匹配替换为 **TF-IDF + 余弦相似度** 的向量空间模型检索。

核心改造：
1. 知识库从硬编码常量迁移到 SQLite 数据库（knowledge_base 表）
2. 检索从关键词覆盖率 → TF-IDF 向量余弦相似度
3. 支持知识库动态增删改查（通过 API 管理）
4. 向量索引在内存中维护，数据变更后自动重建

向量模型说明：
- 使用字符级 2-gram + 词级 token 构建词汇表
- TF-IDF 加权计算文档向量
- 余弦相似度度量相关性
- 纯 numpy 实现，无需额外 ML 依赖

未来可无缝升级为语义 embedding：
- 只需替换 `_compute_embedding()` 方法为 sentence-transformers / OpenAI embedding
- 检索接口（retrieve / top_k / min_score）保持不变
"""
from __future__ import annotations

import asyncio
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy.orm import Session

from database import SessionLocal
from models.knowledge_base import KnowledgeBaseEntry

logger = logging.getLogger(__name__)


# ================================================================
# 分词工具（中英文混合）
# ================================================================

_EN_TOKEN_RE = re.compile(r"[A-Za-z0-9]+")
_CN_CHAR_RE = re.compile(r"[\u4e00-\u9fff]")


def _tokenize(text: str) -> List[str]:
    """混合分词：英文按词切分 + 中文 2-gram + 单字。

    同时产出词级 token 和字符级 2-gram，兼顾中英文检索效果。
    """
    if not text:
        return []

    tokens: List[str] = []

    # 英文/数字词（统一小写）
    for m in _EN_TOKEN_RE.finditer(text):
        tokens.append(m.group(0).lower())

    # 中文字符序列
    cn_chars: List[str] = _CN_CHAR_RE.findall(text)
    # 中文 2-gram
    for i in range(len(cn_chars) - 1):
        tokens.append(cn_chars[i] + cn_chars[i + 1])
    # 中文单字（短查询场景补充）
    tokens.extend(cn_chars)

    return tokens


# ================================================================
# RAG 服务（TF-IDF + 余弦相似度）
# ================================================================

class RagService:
    """向量 RAG 检索服务（TF-IDF 向量空间模型）。

    内存中维护 TF-IDF 向量矩阵，数据持久化到 SQLite。
    知识库变更后自动重建向量索引。
    """

    def __init__(self) -> None:
        self._vocab: Dict[str, int] = {}  # token -> index
        self._idf: np.ndarray = np.array([])  # inverse document frequency
        self._doc_vectors: np.ndarray = np.array([])  # (n_docs, vocab_size) TF-IDF 矩阵
        self._doc_meta: List[Dict[str, Any]] = []  # 文档元数据
        self._doc_norms: np.ndarray = np.array([])  # 预计算文档向量范数
        self._initialized = False

    # ==================================================================
    # 初始化与索引重建
    # ==================================================================
    def initialize(self, db: Optional[Session] = None) -> None:
        """从数据库加载知识库并构建向量索引。

        幂等：已初始化后再次调用会重建索引。
        """
        if db is None:
            db = SessionLocal()
            own_db = True
        else:
            own_db = False

        try:
            entries = (
                db.query(KnowledgeBaseEntry)
                .filter(KnowledgeBaseEntry.is_deleted.is_(False))  # noqa: E712
                .all()
            )
            self._build_index(entries)
            self._initialized = True
            logger.info(f"RAG 向量索引构建完成: {len(entries)} 条文档, {len(self._vocab)} 个词汇")
        finally:
            if own_db:
                db.close()

    def _build_index(self, entries: List[KnowledgeBaseEntry]) -> None:
        """从知识库条目构建 TF-IDF 向量索引。"""
        if not entries:
            self._vocab = {}
            self._idf = np.array([])
            self._doc_vectors = np.array([])
            self._doc_meta = []
            self._doc_norms = np.array([])
            return

        # Step 1: 收集所有 token 构建词汇表
        doc_tokens: List[List[str]] = []
        vocab_set = set()

        for entry in entries:
            text = entry.title + " " + entry.content
            tokens = _tokenize(text)
            doc_tokens.append(tokens)
            vocab_set.update(tokens)

        self._vocab = {token: idx for idx, token in enumerate(sorted(vocab_set))}
        vocab_size = len(self._vocab)
        n_docs = len(entries)

        # Step 2: 计算 TF 矩阵 (n_docs, vocab_size)
        tf_matrix = np.zeros((n_docs, vocab_size), dtype=np.float32)
        doc_freq = np.zeros(vocab_size, dtype=np.float32)

        for i, tokens in enumerate(doc_tokens):
            token_counts: Dict[str, int] = {}
            for t in tokens:
                token_counts[t] = token_counts.get(t, 0) + 1
            for token, count in token_counts.items():
                if token in self._vocab:
                    j = self._vocab[token]
                    tf_matrix[i, j] = count  # raw term frequency
                    doc_freq[j] += 1  # 含该 token 的文档数

        # Step 3: 计算 IDF（smooth IDF: log((N+1)/(df+1)) + 1）
        self._idf = np.log((n_docs + 1) / (doc_freq + 1)) + 1.0

        # Step 4: TF-IDF = TF * IDF
        self._doc_vectors = tf_matrix * self._idf[np.newaxis, :]

        # Step 5: 预计算文档向量范数（用于余弦相似度）
        self._doc_norms = np.linalg.norm(self._doc_vectors, axis=1)
        # 避免除零
        self._doc_norms[self._doc_norms == 0] = 1.0

        # Step 6: 存储文档元数据
        self._doc_meta = [
            {
                "id": entry.id,
                "title": entry.title,
                "category": entry.category,
                "content": entry.content,
                "source": entry.source,
            }
            for entry in entries
        ]

    def rebuild_index(self, db: Optional[Session] = None) -> None:
        """重建向量索引（知识库增删改后调用）"""
        self.initialize(db)

    # ==================================================================
    # 向量检索
    # ==================================================================
    async def retrieve(
        self,
        query: str,
        top_k: int = 3,
        min_score: float = 0.05,
    ) -> List[Dict[str, Any]]:
        """异步向量检索：返回与 query 最相关的 top_k 条知识库片段。

        使用 TF-IDF + 余弦相似度计算相关性。
        score 范围: [0, 1]，1 表示完全相同。

        参数:
            query:     用户查询文本
            top_k:     返回的最大条目数
            min_score: 最小相似度阈值（低于此分数的条目不返回）

        返回:
            [{id, title, content, category, score}] 按 score 降序排列
        """
        # 让出事件循环
        await asyncio.sleep(0)

        if not self._initialized:
            self.initialize()

        return self._retrieve_sync(query, top_k, min_score)

    def _retrieve_sync(
        self,
        query: str,
        top_k: int,
        min_score: float,
    ) -> List[Dict[str, Any]]:
        """同步检索核心（便于单元测试）。"""
        if not self._initialized or len(self._doc_meta) == 0:
            return []

        # 计算查询向量
        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        query_tf = np.zeros(len(self._vocab), dtype=np.float32)
        for t in query_tokens:
            if t in self._vocab:
                query_tf[self._vocab[t]] += 1.0

        # 查询 TF-IDF 向量
        query_vector = query_tf * self._idf
        query_norm = np.linalg.norm(query_vector)

        if query_norm == 0:
            return []

        # 余弦相似度 = (doc · query) / (||doc|| * ||query||)
        # 利用预计算的 doc_norms 向量化计算
        dot_products = self._doc_vectors.dot(query_vector)
        similarities = dot_products / (self._doc_norms * query_norm)

        # 过滤阈值
        valid_mask = similarities >= min_score
        if not np.any(valid_mask):
            return []

        # 获取有效索引及对应分数
        valid_indices = np.where(valid_mask)[0]
        valid_scores = similarities[valid_mask]

        # 按分数降序排列，取 top_k
        top_indices_in_valid = np.argsort(-valid_scores)[:top_k]
        top_indices = valid_indices[top_indices_in_valid]

        results = []
        for idx in top_indices:
            meta = self._doc_meta[int(idx)]
            score = float(similarities[int(idx)])
            results.append({
                **meta,
                "score": round(score, 4),
            })

        return results

    # ==================================================================
    # 知识库管理（CRUD）
    # ==================================================================
    def list_entries(
        self,
        db: Session,
        category: Optional[str] = None,
        keyword: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[int, List[KnowledgeBaseEntry]]:
        """分页查询知识库条目"""
        query = db.query(KnowledgeBaseEntry).filter(KnowledgeBaseEntry.is_deleted.is_(False))  # noqa: E712
        if category:
            query = query.filter(KnowledgeBaseEntry.category == category)
        if keyword:
            like = f"%{keyword}%"
            query = query.filter(
                KnowledgeBaseEntry.title.like(like) | KnowledgeBaseEntry.content.like(like)
            )
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return total, items

    def get_entry(self, db: Session, entry_id: int) -> Optional[KnowledgeBaseEntry]:
        """按 ID 获取条目"""
        return (
            db.query(KnowledgeBaseEntry)
            .filter(KnowledgeBaseEntry.id == entry_id, KnowledgeBaseEntry.is_deleted.is_(False))  # noqa: E712
            .first()
        )

    def create_entry(
        self,
        db: Session,
        title: str,
        content: str,
        category: str = "general",
        source: Optional[str] = None,
    ) -> KnowledgeBaseEntry:
        """创建知识库条目并重建索引"""
        entry = KnowledgeBaseEntry(
            title=title,
            content=content,
            category=category,
            source=source,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        self.rebuild_index(db)
        return entry

    def update_entry(
        self,
        db: Session,
        entry_id: int,
        title: Optional[str] = None,
        content: Optional[str] = None,
        category: Optional[str] = None,
        source: Optional[str] = None,
    ) -> Optional[KnowledgeBaseEntry]:
        """更新知识库条目并重建索引"""
        entry = self.get_entry(db, entry_id)
        if not entry:
            return None
        if title is not None:
            entry.title = title
        if content is not None:
            entry.content = content
        if category is not None:
            entry.category = category
        if source is not None:
            entry.source = source
        db.commit()
        db.refresh(entry)
        self.rebuild_index(db)
        return entry

    def delete_entry(self, db: Session, entry_id: int) -> bool:
        """软删除知识库条目并重建索引"""
        entry = self.get_entry(db, entry_id)
        if not entry:
            return False
        entry.is_deleted = True
        db.commit()
        self.rebuild_index(db)
        return True

    # ==================================================================
    # 统计信息
    # ==================================================================
    def stats(self) -> Dict[str, Any]:
        """返回向量索引统计信息"""
        return {
            "initialized": self._initialized,
            "doc_count": len(self._doc_meta),
            "vocab_size": len(self._vocab),
            "categories": sorted(set(m["category"] for m in self._doc_meta)) if self._doc_meta else [],
        }


# ================================================================
# 模块级单例
# ================================================================

rag_service = RagService()
