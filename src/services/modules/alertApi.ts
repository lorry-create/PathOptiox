import { httpClient } from '../api/httpClient';

// ================================================================
// 类型定义
// ================================================================

export type AlertLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface AlertItem {
  id: string;
  level: AlertLevel;
  title: string;
  content: string;
  time: string;
  affected_route: string;
  affected_orders: string[];
  daily_loss: number;
  ai_suggestion: string;
  handled: boolean;
}

export interface AlertListRequest {
  level?: AlertLevel;
  handled?: boolean;
  /** 页码，从 1 开始，默认 1 */
  page?: number;
  /** 每页数量，默认 10 */
  page_size?: number;
}

export interface AlertHandleRequest {
  method: 'ignore' | 'reroute' | 'notify' | 'delay';
  remark?: string;
}

export interface AlertHandleResponse {
  success: boolean;
}

/**
 * 预警列表分页响应结构
 */
export interface AlertListResponse {
  list: AlertItem[];
  total: number;
  page: number;
  page_size: number;
}

// ================================================================
// API
// ================================================================

export const alertApi = {
  getAlerts: (params?: AlertListRequest) =>
    httpClient.get<AlertListResponse>('/alerts', {
      params,
      showLoading: false,
    }),

  getAlertById: (alertId: string) =>
    httpClient.get<AlertItem>(`/alerts/${alertId}`, {
      showLoading: true,
    }),

  handleAlert: (alertId: string, params: AlertHandleRequest) =>
    httpClient.post<AlertHandleResponse>(`/alerts/${alertId}/handle`, params, {
      showLoading: true,
    }),
};
