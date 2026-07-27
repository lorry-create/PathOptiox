/**
 * 客户服务模块 Mock 数据
 * 注意：SSE 流式请求不走 Mock 拦截器，由 chatApi.streamMessage 内部处理
 */
import type { MockHandler } from './index';

export interface ChatResponse {
  response: string;
  order_id?: string;
}

const buildChatResponse = (message: string): ChatResponse => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('订单') || lowerMessage.includes('状态')) {
    return {
      response: '已为您查询到相关订单信息。当前活动订单 CN77218841 处于运输中状态，预计 7 月 8 日送达。如需进一步操作，请告知订单号。',
      order_id: 'CN77218841',
    };
  }
  if (lowerMessage.includes('路线') || lowerMessage.includes('优化')) {
    return {
      response: '路径优化引擎已就绪。当前推荐「稳健优先」方案，准时率 98%，综合成本 21,300 美元。如需切换方案，请说明偏好。',
    };
  }
  if (lowerMessage.includes('风险') || lowerMessage.includes('预警')) {
    return {
      response: '当前有 2 条未处置高风险预警：苏伊士运河拥堵、上海港台风。建议优先处理台风预警，是否立即查看详情？',
    };
  }
  return {
    response: '您好，我是 AI 客服助手。我可以帮您查询订单状态、优化运输路线、处理风险预警。请问有什么可以帮您？',
  };
};

export const chatMockHandlers: MockHandler[] = [
  {
    method: 'POST',
    url: '/chat',
    handler: (config) => {
      const data = config.data as { message: string };
      return buildChatResponse(data?.message || '');
    },
  },
];
