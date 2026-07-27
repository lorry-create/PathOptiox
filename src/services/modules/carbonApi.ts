import { httpClient } from '../api/httpClient';

// ================================================================
// 类型定义
// ================================================================

export interface CarbonOverview {
  total_emission_kg: number;
  trend_pct: number;
  green_rate: number;
  green_rate_trend: number;
  offset_count_kg: number;
  offset_trend: number;
  esg_score: number;
  esg_trend: number;
  // 新增字段：填满顶部 4 个指标卡（碳排、能耗、抵消率、PUE）
  energy_consumption_kwh: number;   // 总能耗（kWh）
  energy_trend: number;             // 能耗环比（%）
  pue: number;                      // PUE 值（Power Usage Effectiveness）
  pue_trend: number;                // PUE 环比
}

export interface CarbonTrendPoint {
  date: string;
  sea: number;
  air: number;
  land: number;
  rail: number;
}

export interface CarbonNodeRank {
  node_id: string;
  node_name: string;
  emission_kg: number;
  trend_pct: number;
}

export interface CarbonTrendRequest {
  /**
   * 时间范围：对齐前端日/周/月切换按钮
   * - day: 近 24 小时按小时聚合
   * - week: 近 7 天按天聚合
   * - month: 近 30 天按天聚合
   */
  time_range: 'day' | 'week' | 'month';
  /**
   * 运输模态筛选：对齐前端运输模态筛选器
   * - all: 全部模态汇总
   * - sea / rail / air: 仅返回对应模态的数据
   */
  transport_mode: 'all' | 'sea' | 'rail' | 'air';
}

export interface ToggleGreenModeRequest {
  enable: boolean;
}

export interface ToggleGreenModeResponse {
  enabled: boolean;
}

export interface ESGReport {
  report_period: string;
  total_emission: number;
  scope1: number;
  scope2: number;
  scope3: number;
  reduction_target: number;
  actual_reduction: number;
  highlights: string[];
}

// ================================================================
// API
// ================================================================

export const carbonApi = {
  getOverview: () =>
    httpClient.get<CarbonOverview>('/carbon/overview', {
      showLoading: false,
    }),

  getTrend: (params: CarbonTrendRequest) =>
    httpClient.get<CarbonTrendPoint[]>('/carbon/trend', {
      params,
      showLoading: false,
    }),

  getNodes: () =>
    httpClient.get<CarbonNodeRank[]>('/carbon/nodes', {
      showLoading: false,
    }),

  toggleGreenMode: (enable: boolean) =>
    httpClient.post<ToggleGreenModeResponse>('/carbon/toggle-green-mode', { enable } as ToggleGreenModeRequest, {
      showLoading: true,
    }),

  getEsgReport: () =>
    httpClient.get<ESGReport>('/carbon/esg-report', {
      showLoading: false,
    }),
};
