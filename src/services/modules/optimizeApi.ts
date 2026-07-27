import { httpClient } from '../api/httpClient';

// ================================================================
// 类型定义（与后端 OptimizeResponse Schema 对齐）
// ================================================================

export interface StepDetail {
  from: string;
  to: string;
  transport_mode: string;
  time_days: number;
  cost_usd: number;
  carbon_kg: number;
  risk_level: string;
  agent: string;
}

export interface SchemeItem {
  id: string;
  label: string;
  route_nodes: string[];
  transport_modes: string[];
  total_time_days: number;
  total_cost_usd: number;
  total_carbon_kg: number;
  stability_score: number;
  on_time_rate: number;
  steps_detail: StepDetail[];
  path_warning?: string;
}

export interface OptimizeExplanation {
  conclusion: string;
  route_logic: string;
  prediction_usage: string;
  target_match: string;
}

export interface OptimizeResponse {
  schemes: SchemeItem[];
  explanation: OptimizeExplanation;
}

export interface OptimizeRequest {
  start_node: string;
  end_node: string;
  /**
   * 权重字段：组件层使用 0-100 整数滑块
   * API 层（optimizeRoute 方法内部）会自动归一化为 0-1 小数后发送给后端
   */
  weight_cost: number;
  weight_time: number;
  weight_carbon: number;
  weight_risk?: number;      // 可选：运输风险权重（组件层未传时默认 25）
  network_model?: string;    // 可选：物流网络模型ID（默认 net_global_v3）
  scene?: string;            // 可选：场景 normal/stress/policy（默认 normal）
  /**
   * 业务关联 ID（可选）
   * - risk_id: 风险预警一键重规划时传入，关联风险事件
   * - order_id: 客服端异常诊断时传入，关联订单
   * 后端可基于这两个 ID 加载上下文，影响路径规划逻辑
   */
  risk_id?: string;
  order_id?: string;
}

// ================================================================
// API
// ================================================================

export const optimizeApi = {
  optimizeRoute: async (params: OptimizeRequest): Promise<OptimizeResponse> => {
    // 权重自动归一化：组件层使用 0-100 整数，发送给后端前转为 0-1 小数
    // 对业务组件透明，避免组件层手动做单位转换
    // weight_risk 可选，组件层未传时默认 25（归一化后 0.25）
    const payload = {
      ...params,
      weight_cost: params.weight_cost / 100,
      weight_time: params.weight_time / 100,
      weight_carbon: params.weight_carbon / 100,
      weight_risk: (params.weight_risk ?? 25) / 100,
    };

    // 后端直接返回 OptimizeResponse：{ schemes: SchemeItem[], explanation: OptimizeExplanation }
    // httpClient 已对 {code, msg, data} 包装做过统一解包，这里直接拿到 OptimizeResponse
    const resp = await httpClient.post<OptimizeResponse>(
      '/optimize/route',
      payload,
      {
        timeout: 120000,
        showLoading: false,
        retry: 0,
      }
    );

    return resp;
  },
};
