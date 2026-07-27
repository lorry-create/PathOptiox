import axios, { AxiosRequestConfig, AxiosError, CancelTokenSource } from 'axios';
import { axiosInstance } from './axiosInstance';
import { loadingStateManager } from './loadingState';
import { ApiError, RequestOptions } from './types';
import { matchMockHandler, isMockEnabled } from '@/mock';

export const extractErrorMessage = (error: AxiosError): string => {
  // 按优先级提取错误信息，兼容后端多版本错误格式
  if (error.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data as Record<string, unknown>;

    // 1. FastAPI 标准格式：{ detail: "..." } 或 { detail: [{ msg: "..." }] }
    if (data.detail) {
      if (typeof data.detail === 'string') return String(data.detail);
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        const first = data.detail[0] as Record<string, unknown>;
        if (first?.msg) return String(first.msg);
      }
    }

    // 2. 旧版路径优化格式：{ msg: "..." }
    if (data.msg && typeof data.msg === 'string') return String(data.msg);

    // 3. 通用 message 字段
    if (data.message && typeof data.message === 'string') return String(data.message);

    // 4. 仅有 code 字段
    if (data.code && typeof data.code === 'number') {
      return `请求失败 (code: ${data.code})`;
    }
  }

  // 网络层错误
  if (error.message.includes('timeout')) return '请求超时，请稍后重试';
  if (error.message.includes('Network Error')) return '网络连接失败，请检查后端服务是否已启动 (localhost:8010)';

  // 兜底默认提示
  return `请求失败 (${error.response?.status || '未知'})`;
};

export interface RequestConfig extends AxiosRequestConfig {
  showLoading?: boolean;
  retry?: number;
  retryDelay?: number;
}

export class HttpClient {
  private pendingRequests: Map<string, CancelTokenSource> = new Map();
  private defaultRetryCount: number = 3;
  private defaultRetryDelay: number = 1000;

  private generateRequestKey(config: RequestConfig): string {
    return `${config.method?.toUpperCase() || 'GET'}:${config.url || ''}:${JSON.stringify(config.params || {})}`;
  }

  public async request<T = unknown>(config: RequestConfig): Promise<T> {
    // 全局统一去除 URL 尾部斜杠，保证 Mock 匹配与真实后端请求路径一致
    // 后端 redirect_slashes=False 时，带斜杠的路径会直接 404
    if (config.url && config.url.length > 1 && config.url.endsWith('/')) {
      config.url = config.url.replace(/\/+$/, '');
    }

    const requestKey = this.generateRequestKey(config);
    const cancelTokenSource = axios.CancelToken.source();
    this.pendingRequests.set(requestKey, cancelTokenSource);

    const finalConfig: RequestConfig = {
      ...config,
      cancelToken: cancelTokenSource.token,
    };

    if (config.showLoading !== false) {
      loadingStateManager.increment();
    }

    try {
      // Mock 拦截：当 VITE_USE_MOCK=true 时，匹配接口路径返回 Mock 数据
      if (isMockEnabled()) {
        const method = (config.method || 'GET').toUpperCase();
        const url = config.url || '';
        const handler = matchMockHandler(method, url);
        if (handler) {
          // 模拟网络延迟，避免 UI 状态闪烁
          await this.delay(200);
          return handler.handler(config) as T;
        }
      }

      // 重试策略区分请求方法：
      // - 显式配置 config.retry 优先级最高
      // - 未显式配置时：GET 默认重试 3 次，POST/PUT/DELETE/PATCH 默认不重试（避免非幂等重复提交）
      const method = (config.method || 'GET').toUpperCase();
      const isIdempotent = method === 'GET';
      const retryCount = config.retry !== undefined
        ? config.retry
        : (isIdempotent ? this.defaultRetryCount : 0);
      const retryDelay = config.retryDelay ?? this.defaultRetryDelay;
      let lastError: ApiError | null = null;

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          if (attempt > 0) {
            await this.delay(retryDelay * attempt);
          }
          const response = await axiosInstance.request<T>(finalConfig);
          return response.data;
        } catch (error) {
          if (this.isCancelError(error)) {
            throw { code: -1, message: '请求已取消' } as ApiError;
          }
          lastError = this.normalizeError(error);
          if (!this.isRetryableError(lastError) || attempt === retryCount) {
            throw lastError;
          }
        }
      }
      throw lastError;
    } catch (error) {
      throw error;
    } finally {
      this.pendingRequests.delete(requestKey);
      if (config.showLoading !== false) {
        loadingStateManager.decrement();
      }
    }
  }

  public cancelRequest(requestKey: string): void {
    const cancelTokenSource = this.pendingRequests.get(requestKey);
    if (cancelTokenSource) {
      cancelTokenSource.cancel('请求已被手动取消');
      this.pendingRequests.delete(requestKey);
    }
  }

  public cancelAllRequests(): void {
    this.pendingRequests.forEach((source) => {
      source.cancel('所有请求已被取消');
    });
    this.pendingRequests.clear();
    loadingStateManager.reset();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isCancelError(error: unknown): boolean {
    return axios.isCancel(error);
  }

  private isRetryableError(error: ApiError): boolean {
    if (!error.code) return false;
    // 移除 500 状态码的自动重试，避免对服务端业务错误进行无效重试
    return [408, 429, 502, 503, 504].includes(error.code);
  }

  private normalizeError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        code: axiosError.response?.status || -1,
        message: extractErrorMessage(axiosError),
        url: axiosError.config?.url,
      };
    }
    return {
      code: -1,
      message: error instanceof Error ? error.message : '未知错误',
    };
  }

  public get<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  public post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  public put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  public delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  public patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }
}

export const httpClient = new HttpClient();

// localStorage 中存储 access_token 的 key（与 axiosInstance / auth.ts 保持一致）
const TOKEN_KEY = 'access_token';

/**
 * 构建包含 Bearer Token 的请求头。
 * 从 localStorage 读取真实 JWT，供原生 fetch（如 AIChatPanel SSE 流式请求）统一使用。
 * axios 实例的请求拦截器已处理 token 注入，此处仅用于绕过 axios 的原生 fetch 场景。
 */
export function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
