import { httpClient } from '../api/httpClient';

export interface IntelligenceNews {
  id: number;
  title: string;
  risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE';
  region: string;
  timestamp: string;
}

export interface RiskMetrics {
  congestion_index: number;
  weather_disruption: number;
  patency_rate: number;
  affected_routes: number;
  updated_at: string;
}

export interface RiskDashboardData {
  news: IntelligenceNews[];
  metrics: RiskMetrics | null;
}

export const riskDashboardApi = {
  getRiskMetrics: (): Promise<RiskDashboardData> =>
    httpClient.get<RiskDashboardData>('/dashboard/risk-metrics', {
      showLoading: true,
      retry: 2,
    }),
};
