import { httpClient } from '../api/httpClient';

// ================================================================
// 类型定义
// ================================================================

export interface P90Range {
  p90_lower: number;
  p90_upper: number;
}

export interface SimulationStrategy {
  cost: P90Range;
  time: P90Range;
  stability: number;
}

export interface SimulationRunRequest {
  mode: 'normal' | 'stress';
  rl_cost?: number;
  rl_time?: number;
  rl_carbon?: number;
}

export interface SimulationRunResponse {
  mode: string;
  base: SimulationStrategy;
  robust: SimulationStrategy;
  risk_reduction_pct: number;
  description: string;
}

// ================================================================
// API
// ================================================================

const BASE = '/simulation';

export const simulationApi = {
  runSimulation: (req: SimulationRunRequest): Promise<SimulationRunResponse> =>
    httpClient.post<SimulationRunResponse>(`${BASE}/run`, req),
};
