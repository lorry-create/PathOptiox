import { httpClient } from '../api/httpClient';

// ================================================================
// 类型定义
// ================================================================

export interface DashboardMetrics {
  active_orders: number;
  active_orders_trend: number;
  on_time_rate: number;
  on_time_trend: number;
  total_emission_kg: number;
  emission_trend: number;
  risk_count: number;
  risk_trend: number;
}

export interface AgentLoadInfo {
  agent_id: string;
  name: string;
  load: number;
  status: 'idle' | 'active' | 'busy';
}

export interface GlobalStatus {
  network_health: number;
  avg_latency_ms: number;
  active_tasks: number;
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  agent_load: AgentLoadInfo[];
  global_status: GlobalStatus;
}

export interface GlobalOptimizeResponse {
  task_id: string;
}

// ================================================================
// API
// ================================================================

export const dashboardApi = {
  getOverview: () =>
    httpClient.get<DashboardOverview>('/dashboard/overview', {
      showLoading: false,
    }),

  globalOptimize: () =>
    httpClient.post<GlobalOptimizeResponse>('/dashboard/global-optimize', {}, {
      showLoading: true,
    }),
};
