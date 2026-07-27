import { httpClient } from '../api/httpClient';

export interface RiskRadar {
  id: string;
  hazard_type: string;
  probability: number;
  impact_region: string;
  estimated_loss: string;
  severity: string;
}

export interface PreemptiveAction {
  id: string;
  target_order: string;
  strategy: string;
  cost_saved: string;
  status: 'QUEUED' | 'EXECUTING' | 'COMPLETED';
}

export interface PredictionTimeData {
  offset_hours: number;
  label: string;
  narrative: string;
  risks: RiskRadar[];
  actions: PreemptiveAction[];
}

export const predictiveSandboxApi = {
  getPrediction: (offsetHours: number): Promise<PredictionTimeData> =>
    httpClient.get<PredictionTimeData>(`/predictive-sandbox?offset_hours=${offsetHours}`, {
      showLoading: true,
      retry: 2,
    }),
};
