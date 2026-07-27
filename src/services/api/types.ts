import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  code?: number;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retry?: number;
  retryDelay?: number;
  cancelToken?: AbortSignal;
  showLoading?: boolean;
}

export interface HttpRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  options?: RequestOptions;
}

export interface ApiError {
  code: number;
  message: string;
  url?: string;
  requestData?: unknown;
}

export interface LoadingState {
  isLoading: boolean;
  count: number;
}

export type RequestInterceptor = (
  config: AxiosRequestConfig
) => AxiosRequestConfig | Promise<AxiosRequestConfig>;

export type ResponseInterceptor = (
  response: AxiosResponse
) => Response | Promise<Response>;
