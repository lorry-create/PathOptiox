// 全球供应链风险与不可抗力预警中心 — 类型定义
// 严格匹配后端 /api/dashboard/risk-metrics 返回的 JSON 结构

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
