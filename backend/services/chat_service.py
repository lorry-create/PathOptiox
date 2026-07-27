"""聊天客服模块业务服务层

S1-T04 / F1 / F3 修复后：
- 关键词匹配回复（兜底）
- 启用 rag_enabled 时，调用 rag_service 检索知识库片段并追加到回复末尾
- 配置 DASHSCOPE_API_KEY 后，调用 Qwen 真实 LLM 生成回复
- stream_reply_tokens 为异步生成器，逐 token 输出 LLM 响应（真实 SSE 流式）

字段说明：
- message:    用户消息
- rag_enabled: 是否追加 RAG 知识库参考段
- history:    多轮对话上下文（F3 修复后传入）
- context:    业务上下文（如订单 ID）
"""
import logging
from typing import AsyncGenerator, List, Optional

from config import settings
from schemas.chat import ChatMessageItem, ChatResponse
from services.rag_service import rag_service

logger = logging.getLogger(__name__)


class ChatService:
    """聊天服务（关键词 + RAG + LLM 流式）"""

    # ===== 关键词匹配（兜底回复） =====
    def _keyword_reply(self, message: str) -> tuple[str, Optional[str]]:
        """关键词匹配返回（reply, order_id）"""
        msg = message.lower() if message else ""
        order_id: Optional[str] = None

        if any(k in msg for k in ["订单", "order", "物流状态", "发货"]):
            order_id = "CN77218841"
            reply = (
                "已为您查询订单信息。订单 CN77218841 当前状态为「运输中」，"
                "预计 2026-07-08 送达。货物由深圳发往上海，当前位于海运段。"
                "如需查看完整物流轨迹，请在订单管理页面点击对应订单。"
            )
        elif any(k in msg for k in ["路线", "route", "路径", "优化", "方案"]):
            reply = (
                "路径优化已为您生成 4 套候选方案：成本优先、稳健优先、时效优先、绿色优先。"
                "推荐方案在成本、时效、碳排放、风险四维目标上取得最优平衡。"
                "您可在路径优化页面查看各方案详细分段信息与决策解释。"
            )
        elif any(k in msg for k in ["风险", "risk", "预警", "异常", "告警"]):
            reply = (
                "当前有 2 条未处置风险预警：苏伊士运河通行受限（高风险）、"
                "港口拥堵红色预警（紧急）。建议尽快处置以降低损失。"
                "AI 已生成处置建议，可在风险预警页面查看详情并一键处置。"
            )
        elif any(k in msg for k in ["碳排放", "carbon", "esg", "绿色"]):
            reply = (
                "当前总碳排放 1,284,560 kg，环比下降 8.4%。绿色运输占比 32.5%，"
                "ESG 评分 87.5。可启用极绿调度模式进一步降低碳排放。"
            )
        else:
            reply = (
                "您好，我是 PathOptix 智能客服。我可以帮您查询订单状态、"
                "路径优化方案、风险预警与碳排放数据。请告诉我您的需求。"
            )

        return reply, order_id

    # ===== LLM 构造与调用 =====
    def _build_llm(self):
        """构造 DashScope ChatOpenAI 实例（qwen-turbo，启用流式）"""
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            api_key=settings.DASHSCOPE_API_KEY,
            model="qwen-turbo",
            temperature=0.6,
            max_tokens=600,
            streaming=True,
        )

    def _build_llm_messages(
        self,
        message: str,
        history: Optional[List[ChatMessageItem]],
        context: Optional[str],
        rag_snippet: str,
    ):
        """组装传给 Qwen 的消息列表（system + history + user）"""
        from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

        system_content = (
            "你是 PathOptix 国际物流智能客服，擅长用简洁专业的中文回答订单、路径优化、"
            "风险预警、碳排放等问题。回答 100-200 字，避免编造数据。"
        )
        if rag_snippet:
            system_content += f"\n\n【知识库参考】\n{rag_snippet}"
        if context:
            system_content += f"\n\n【业务上下文】用户当前关注的订单/页面：{context}"

        messages = [SystemMessage(content=system_content)]
        # 多轮上下文
        if history:
            # 限制最近 6 条避免 token 膨胀
            for h in history[-6:]:
                if h.role == "user":
                    messages.append(HumanMessage(content=h.content))
                elif h.role == "assistant":
                    messages.append(AIMessage(content=h.content))
        messages.append(HumanMessage(content=message))
        return messages

    # ===== 普通聊天 =====
    async def chat(
        self,
        message: str,
        rag_enabled: bool = True,
        history: Optional[List[ChatMessageItem]] = None,
        context: Optional[str] = None,
    ) -> ChatResponse:
        """普通聊天：优先调用 LLM，失败降级关键词匹配 + RAG 检索增强。"""
        # 1. RAG 检索（如启用）
        rag_snippet = ""
        if rag_enabled:
            try:
                docs = await rag_service.retrieve(message, top_k=3)
                if docs:
                    rag_snippet = "\n".join(
                        f"• {d['title']}：{d['content'][:80]}…" for d in docs
                    )
            except Exception as e:
                logger.warning("RAG 检索失败，跳过知识库参考段: %s", e)

        # 2. 优先调用 LLM
        if settings.DASHSCOPE_API_KEY:
            try:
                llm = self._build_llm()
                messages = self._build_llm_messages(message, history, context, rag_snippet)
                response = await llm.ainvoke(messages)
                content = (
                    response.content
                    if isinstance(response.content, str)
                    else str(response.content)
                )
                order_id = "CN77218841" if "订单" in message or "order" in message.lower() else None
                return ChatResponse(response=content, order_id=order_id)
            except Exception as e:
                err_msg = str(e)
                if "Arrearage" in err_msg or "overdue-payment" in err_msg:
                    logger.error("DashScope 账户欠费，降级到关键词匹配: %s", e)
                else:
                    logger.warning("LLM 调用失败，降级到关键词匹配: %s", e)

        # 3. 关键词兜底
        reply, order_id = self._keyword_reply(message)
        if rag_snippet:
            reply = reply + "\n\n📚 知识库参考：\n" + rag_snippet
        return ChatResponse(response=reply, order_id=order_id)

    # ===== 流式聊天（异步生成器逐 token 输出） =====
    async def stream_reply(self, message: str, rag_enabled: bool = True) -> str:
        """流式聊天：返回完整回复文本（兼容旧路由层逐字输出）"""
        resp = await self.chat(message, rag_enabled)
        return resp.response

    async def stream_reply_tokens(
        self,
        message: str,
        rag_enabled: bool = True,
        history: Optional[List[ChatMessageItem]] = None,
        context: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """真实 SSE 流式：逐 token 输出 LLM 响应

        - 配置了 DASHSCOPE_API_KEY 时，使用 Qwen astream 真实流式输出
        - 未配置或调用失败时，降级到关键词匹配，并按字逐个 yield（保持 SSE 体验）
        """
        # 1. RAG 检索
        rag_snippet = ""
        if rag_enabled:
            try:
                docs = await rag_service.retrieve(message, top_k=3)
                if docs:
                    rag_snippet = "\n".join(
                        f"• {d['title']}：{d['content'][:80]}…" for d in docs
                    )
            except Exception as e:
                logger.warning("RAG 检索失败: %s", e)

        # 2. 真实 LLM 流式
        if settings.DASHSCOPE_API_KEY:
            try:
                llm = self._build_llm()
                messages = self._build_llm_messages(message, history, context, rag_snippet)
                async for chunk in llm.astream(messages):
                    token = (
                        chunk.content
                        if isinstance(chunk.content, str)
                        else str(chunk.content)
                    )
                    if token:
                        yield token
                return
            except Exception as e:
                err_msg = str(e)
                if "Arrearage" in err_msg or "overdue-payment" in err_msg:
                    logger.error("DashScope 账户欠费，降级到关键词逐字流式: %s", e)
                else:
                    logger.warning("LLM 流式调用失败，降级到关键词逐字流式: %s", e)

        # 3. 关键词兜底：按字符逐个 yield（保持 SSE 体验）
        reply, _ = self._keyword_reply(message)
        if rag_snippet:
            reply = reply + "\n\n📚 知识库参考：\n" + rag_snippet
        for ch in reply:
            yield ch


chat_service = ChatService()
