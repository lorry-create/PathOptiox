"""聊天客服模块 Pydantic 数据模型

S1-T04 / F3 修复：ChatRequest 增加 history 与 context 字段，
允许前端携带对话上下文与业务上下文（如订单 ID），
供 LLM 进行多轮对话与业务感知回复。
"""
from typing import List, Optional

from pydantic import Field

from .common import SchemaBase


class ChatMessageItem(SchemaBase):
    """单条对话消息（用于 history 字段）"""

    role: str = Field(description="角色：user / assistant")
    content: str = Field(description="消息内容")


class ChatRequest(SchemaBase):
    """聊天请求

    F3 修复：原 schema 仅含 message 与 rag_enabled，
    导致前端传入的 history / context 被静默丢弃。
    现显式声明这两个字段，并允许前端在 SSE 流式与普通调用中复用同一 schema。
    """

    message: str = Field(description="用户消息")
    rag_enabled: bool = Field(default=True, description="是否启用 RAG 检索增强")
    history: Optional[List[ChatMessageItem]] = Field(
        default=None, description="历史对话（多轮上下文）"
    )
    context: Optional[str] = Field(
        default=None, description="业务上下文（如订单 ID、当前页面）"
    )


class ChatResponse(SchemaBase):
    """聊天响应"""

    response: str = Field(description="AI 回复内容")
    order_id: Optional[str] = Field(default=None, description="关联订单ID")
