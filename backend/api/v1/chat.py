"""聊天客服模块路由

包含普通聊天与 SSE 流式聊天两个接口。

S1-T04 / F1 修复：
- /chat/stream 现使用真实 LLM 流式输出（async generator 逐 token yield）
- 不再使用伪 SSE（先取完整回复再 sleep 50ms 逐字符 yield）
- 支持 history/context 字段（F3 修复后由 ChatRequest 透传）
"""
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from dependencies import get_current_user
from schemas.chat import ChatRequest, ChatResponse
from services.chat_service import chat_service


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("", response_model=ChatResponse, summary="普通聊天")
async def chat(req: ChatRequest):
    """关键词匹配 + RAG 检索增强 + LLM 真实回复（失败降级关键词）"""
    return await chat_service.chat(
        message=req.message,
        rag_enabled=req.rag_enabled,
        history=req.history,
        context=req.context,
    )


@router.post("/stream", summary="流式聊天（SSE）")
async def chat_stream(req: ChatRequest):
    """SSE 流式聊天：逐 token 输出 LLM 响应

    F1 修复后：
    - 真实 LLM 流式：使用 Qwen astream 异步生成器逐 token yield
    - 降级场景：未配置 DashScope 或 LLM 调用失败时，
      使用关键词匹配结果，按字符逐个 yield 保持 SSE 体验

    响应格式：SSE 事件流，每条事件为 `data: {token}\\n\\n`
    token 可能是单个字符、词或子句，取决于 LLM 分词粒度。
    """
    async def event_generator():
        try:
            async for token in chat_service.stream_reply_tokens(
                message=req.message,
                rag_enabled=req.rag_enabled,
                history=req.history,
                context=req.context,
            ):
                # SSE 数据行：data: <token>\n\n
                # 为兼容前端 JSON.parse 与纯文本解析两种模式，
                # 包装为 {"text": "..."} JSON 后再编码
                payload = json.dumps({"text": token}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
        except Exception as e:
            # 异常时通过 SSE 推送错误信息
            err_payload = json.dumps(
                {"error": f"流式生成失败: {e}"}, ensure_ascii=False
            )
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # 禁用 nginx 缓冲，确保 SSE 实时推送
        },
    )
