/**
 * Mock 数据统一入口
 * @description 当 VITE_USE_MOCK=true 时，httpClient 拦截器通过此模块匹配接口返回 Mock 数据
 */

import type { AxiosRequestConfig } from 'axios';

export interface MockHandler {
  method: string;
  url: string;
  handler: (config: AxiosRequestConfig) => unknown;
}

// 导入各模块 Mock 处理器
import { optimizeMockHandlers } from './optimize.mock';
import { orderMockHandlers } from './order.mock';
import { trainingMockHandlers } from './training.mock';
import { carbonMockHandlers } from './carbon.mock';
import { alertMockHandlers } from './risk.mock';
import { dashboardMockHandlers } from './dashboard.mock';
import { chatMockHandlers } from './chat.mock';
import { taskMockHandlers } from './task.mock';

export const mockHandlers: MockHandler[] = [
  ...optimizeMockHandlers,
  ...orderMockHandlers,
  ...trainingMockHandlers,
  ...carbonMockHandlers,
  ...alertMockHandlers,
  ...dashboardMockHandlers,
  ...chatMockHandlers,
  ...taskMockHandlers,
];

/**
 * 匹配 Mock 处理器
 * @param method HTTP 方法
 * @param url 请求 URL（相对路径，如 /optimize/route 或 /orders/CN123）
 * @returns 匹配到的处理器或 null
 */
export function matchMockHandler(method: string, url: string): MockHandler | null {
  const normalizedMethod = method.toUpperCase();
  const normalizedUrl = (url || '').replace(/\/+$/, ''); // 去除尾部斜杠
  return mockHandlers.find(h => {
    if (h.method !== normalizedMethod) return false;
    // 支持 {param} 路径参数通配
    const pattern = h.url.replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(normalizedUrl);
  }) || null;
}

/**
 * 是否启用 Mock
 */
export function isMockEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK === 'true';
}
