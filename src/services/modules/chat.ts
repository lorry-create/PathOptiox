import { httpClient, buildAuthHeaders } from '../api/httpClient';
import { isMockEnabled } from '@/mock';

// ================================================================
// 类型定义
// ================================================================

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  orderId?: string;
}

// F3 修复：ChatRequest 增加 history 与 context 字段，
// 与后端 schemas/chat.py 的 ChatRequest 一一对应
export interface ChatMessageItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  rag_enabled?: boolean;
  history?: ChatMessageItem[];
  context?: string;
}

export interface ChatResponse {
  response: string;
  order_id?: string;
}

// ================================================================
// Mock SSE 响应池：按关键词匹配返回内容（仅 mock 模式使用）
// ================================================================
const getMockStreamResponse = (message: string): string => {
  const lower = message.toLowerCase();
  if (lower.includes('订单') || lower.includes('状态')) {
    return '已为您查询到相关订单信息。当前活动订单 CN77218841 处于运输中状态，预计 7 月 8 日送达。如需进一步操作，请告知订单号。';
  }
  if (lower.includes('路线') || lower.includes('优化')) {
    return '路径优化引擎已就绪。当前推荐「稳健优先」方案，准时率 98%，综合成本 21,300 美元。如需切换方案，请说明偏好。';
  }
  if (lower.includes('风险') || lower.includes('预警')) {
    return '当前有 2 条未处置高风险预警：苏伊士运河拥堵、上海港台风。建议优先处理台风预警，是否立即查看详情？';
  }
  return '您好，我是 AI 客服助手。我可以帮您查询订单状态、优化运输路线、处理风险预警。请问有什么可以帮您？';
};

// ================================================================
// API
// ================================================================

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8010') + '/api';

export const chatApi = {
  // 普通消息发送（非流式）
  sendMessage: (
    message: string,
    options?: { history?: ChatMessageItem[]; context?: string; rag_enabled?: boolean }
  ) =>
    httpClient.post<ChatResponse>('/chat', {
      message,
      rag_enabled: options?.rag_enabled ?? true,
      history: options?.history,
      context: options?.context,
    } as ChatRequest, {
      showLoading: false,
      timeout: 30000,
      retry: 1,
    }),

  /**
   * 流式消息发送（SSE）— S1-T04 修复后调用 /chat/stream 真实 SSE 端点
   *
   * @param message 用户消息
   * @param onChunk 接收到文本片段时的回调
   * @param signal 可选的 AbortSignal，用于取消请求
   * @param options.history 多轮对话上下文
   * @param options.context 业务上下文（如订单 ID）
   * @param options.rag_enabled 是否启用 RAG 检索增强
   *
   * Mock 模式（VITE_USE_MOCK=true）下：不发起网络请求，
   * 使用 setInterval 模拟逐字输出，从预设回复池中按关键词匹配内容，
   * 每 50ms 输出一个字，结束后调用完成回调。
   */
  streamMessage: async (
    message: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
    options?: {
      history?: ChatMessageItem[];
      context?: string;
      rag_enabled?: boolean;
    }
  ): Promise<void> => {
    // ====== Mock 分支：逐字输出 ======
    if (isMockEnabled()) {
      const fullText = getMockStreamResponse(message);
      const chars = Array.from(fullText);
      for (const char of chars) {
        if (signal?.aborted) {
          throw new DOMException('请求已取消', 'AbortError');
        }
        onChunk(char);
        await new Promise<void>(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    // ====== 真实后端分支：SSE 流式读取 ======
    const headers = {
      ...buildAuthHeaders(),
      'Content-Type': 'application/json',
    };

    const body: ChatRequest = {
      message,
      rag_enabled: options?.rag_enabled ?? true,
      history: options?.history,
      context: options?.context,
    };

    const response = await fetch(`${BASE_URL}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`流式请求失败 (${response.status})`);
    }

    if (!response.body) {
      throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data) continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.text) {
            onChunk(parsed.text);
          } else if (parsed.response) {
            onChunk(parsed.response);
          } else if (parsed.error) {
            // 服务端推送错误信息
            console.error('[Chat SSE] 服务端错误:', parsed.error);
          }
        } catch {
          // 非 JSON 格式，直接作为文本处理
          onChunk(data);
        }
      }
    }
  },
};
