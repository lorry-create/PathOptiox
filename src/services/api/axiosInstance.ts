import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from './types';
import { extractErrorMessage } from './httpClient';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8010') + '/api';

// localStorage 中存储 access_token 的 key（与 auth.ts / LoginView 保持一致）
const TOKEN_KEY = 'access_token';

export const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // ====== 请求拦截器：从 localStorage 读取真实 JWT 注入 Authorization 头 ======
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem(TOKEN_KEY);
      // 仅当存在 token 时附加，避免覆盖公开接口（如 /auth/login）的请求头
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // ====== 响应拦截器：401 清除登录态并跳转登录视图，其他错误统一记录 ======
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      const status = error.response?.status;
      const url = error.config?.url;
      const method = error.config?.method?.toUpperCase();

      if (status === 401) {
        // 【临时禁用登录验证】不再清除 token 也不派发 auth:logout 事件
        // 原逻辑：Token 失效或缺失时清除本地登录态，通知 App 切换到登录视图
        // if (!url?.includes('/auth/login')) {
        //   localStorage.removeItem(TOKEN_KEY);
        //   window.dispatchEvent(new CustomEvent('auth:logout'));
        // }
        console.warn(`[Auth] 401 Unauthorized (login disabled, ignored) — ${method} ${url}`);
      }

      if (status === 404) {
        console.error(
          `[Route] 404 Not Found — ${method} ${BASE_URL}${url}\n` +
          `→ 请检查后端是否注册了该路由。\n` +
          `→ 提示：后端使用 redirect_slashes=False，注意尾部斜杠是否匹配。`
        );
      }

      if (!error.response) {
        console.error(
          `[Network] 无法连接后端 — ${method} ${BASE_URL}${url}\n` +
          `→ 请确认后端服务已启动: uvicorn main:app --reload --port 8010`
        );
      }

      const apiError: ApiError = {
        code: status || -1,
        message: extractErrorMessage(error),
        url: error.config?.url,
        requestData: error.config?.data,
      };

      return Promise.reject(apiError);
    }
  );

  return instance;
};

export const axiosInstance = createAxiosInstance();
