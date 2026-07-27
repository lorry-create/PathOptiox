/**
 * 路径优化模块 Mock 数据
 */
import type { MockHandler } from './index';

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

export interface OptimizeResponse {
  schemes: SchemeItem[];
  explanation: {
    conclusion: string;
    route_logic: string;
    prediction_usage: string;
    target_match: string;
  };
}

const buildSchemes = (): SchemeItem[] => [
  {
    id: 'cost',
    label: '成本优先',
    route_nodes: ['shenzhen', 'shanghai', 'singapore', 'rotterdam', 'hamburg'],
    transport_modes: ['land', 'sea', 'sea', 'sea'],
    total_time_days: 32,
    total_cost_usd: 18450,
    total_carbon_kg: 42800,
    stability_score: 0.82,
    on_time_rate: 0.91,
    steps_detail: [
      { from: 'shenzhen', to: 'shanghai', transport_mode: 'land', time_days: 2, cost_usd: 1200, carbon_kg: 980, risk_level: 'low', agent: 'land_agent' },
      { from: 'shanghai', to: 'singapore', transport_mode: 'sea', time_days: 7, cost_usd: 4200, carbon_kg: 8500, risk_level: 'low', agent: 'sea_agent' },
      { from: 'singapore', to: 'rotterdam', transport_mode: 'sea', time_days: 18, cost_usd: 9800, carbon_kg: 22400, risk_level: 'moderate', agent: 'sea_agent' },
      { from: 'rotterdam', to: 'hamburg', transport_mode: 'sea', time_days: 5, cost_usd: 3250, carbon_kg: 10920, risk_level: 'low', agent: 'sea_agent' },
    ],
  },
  {
    id: 'robust',
    label: '稳健优先',
    route_nodes: ['shenzhen', 'hong_kong', 'singapore', 'dubai', 'hamburg'],
    transport_modes: ['land', 'sea', 'sea', 'sea'],
    total_time_days: 35,
    total_cost_usd: 21300,
    total_carbon_kg: 48500,
    stability_score: 0.95,
    on_time_rate: 0.98,
    steps_detail: [
      { from: 'shenzhen', to: 'hong_kong', transport_mode: 'land', time_days: 1, cost_usd: 800, carbon_kg: 620, risk_level: 'low', agent: 'land_agent' },
      { from: 'hong_kong', to: 'singapore', transport_mode: 'sea', time_days: 6, cost_usd: 4500, carbon_kg: 9100, risk_level: 'low', agent: 'sea_agent' },
      { from: 'singapore', to: 'dubai', transport_mode: 'sea', time_days: 10, cost_usd: 6800, carbon_kg: 14600, risk_level: 'low', agent: 'sea_agent' },
      { from: 'dubai', to: 'hamburg', transport_mode: 'sea', time_days: 18, cost_usd: 9200, carbon_kg: 24180, risk_level: 'moderate', agent: 'sea_agent' },
    ],
  },
  {
    id: 'speed',
    label: '时效优先',
    route_nodes: ['shenzhen', 'hong_kong', 'dubai', 'frankfurt', 'hamburg'],
    transport_modes: ['land', 'air', 'air', 'land'],
    total_time_days: 8,
    total_cost_usd: 38900,
    total_carbon_kg: 28600,
    stability_score: 0.88,
    on_time_rate: 0.96,
    path_warning: '空运段受航空管制影响，可能延误 1-2 天',
    steps_detail: [
      { from: 'shenzhen', to: 'hong_kong', transport_mode: 'land', time_days: 1, cost_usd: 800, carbon_kg: 620, risk_level: 'low', agent: 'land_agent' },
      { from: 'hong_kong', to: 'dubai', transport_mode: 'air', time_days: 2, cost_usd: 14500, carbon_kg: 12400, risk_level: 'moderate', agent: 'air_agent' },
      { from: 'dubai', to: 'frankfurt', transport_mode: 'air', time_days: 3, cost_usd: 18600, carbon_kg: 13800, risk_level: 'moderate', agent: 'air_agent' },
      { from: 'frankfurt', to: 'hamburg', transport_mode: 'land', time_days: 2, cost_usd: 5000, carbon_kg: 1780, risk_level: 'low', agent: 'land_agent' },
    ],
  },
  {
    id: 'green',
    label: '绿色优先',
    route_nodes: ['shenzhen', 'guangzhou', 'singapore', 'colombo', 'hamburg'],
    transport_modes: ['rail', 'sea', 'sea', 'sea'],
    total_time_days: 38,
    total_cost_usd: 19800,
    total_carbon_kg: 28400,
    stability_score: 0.86,
    on_time_rate: 0.92,
    steps_detail: [
      { from: 'shenzhen', to: 'guangzhou', transport_mode: 'rail', time_days: 1, cost_usd: 600, carbon_kg: 320, risk_level: 'low', agent: 'rail_agent' },
      { from: 'guangzhou', to: 'singapore', transport_mode: 'sea', time_days: 6, cost_usd: 4200, carbon_kg: 6800, risk_level: 'low', agent: 'sea_agent' },
      { from: 'singapore', to: 'colombo', transport_mode: 'sea', time_days: 8, cost_usd: 5400, carbon_kg: 9200, risk_level: 'low', agent: 'sea_agent' },
      { from: 'colombo', to: 'hamburg', transport_mode: 'sea', time_days: 23, cost_usd: 9600, carbon_kg: 12080, risk_level: 'moderate', agent: 'sea_agent' },
    ],
  },
];

const buildOptimizeResponse = (): OptimizeResponse => ({
  schemes: buildSchemes(),
  explanation: {
    conclusion: '综合权衡成本、时效、碳排放与稳定性，推荐采用「稳健优先」方案，其准时率达 98%，且对极端天气具备较强抗性。',
    route_logic: '基于多智能体强化学习（MARL）+ Dijkstra 路网搜索，结合实时天气、港口拥堵、海关通关数据动态评估每条边的综合成本。',
    prediction_usage: '调用 LSTM 时序预测模型对新加坡-鹿特丹航段的未来 7 天延误概率进行预测，结果为 12.3%，处于可控区间。',
    target_match: '当前任务目标权重为 成本0.4/时效0.3/碳排0.2/风险0.1，与「稳健优先」方案的得分分布最匹配。',
  },
});

export const optimizeMockHandlers: MockHandler[] = [
  {
    method: 'POST',
    url: '/optimize/route',
    handler: (config) => {
      // 接收 risk_id / order_id 关联参数（Mock 透传，不影响返回结果）
      // 后端可基于这两个 ID 加载风险上下文或订单详情，影响路径规划
      const data = config.data as {
        weight_cost: number;
        weight_time: number;
        weight_carbon: number;
        weight_risk: number;
        network_model: string;
        scene: string;
        risk_id?: string;
        order_id?: string;
      } | undefined;

      // 错误场景 Mock：?mock_error=500 触发服务端异常
      const mockError = (config.params as { mock_error?: string } | undefined)?.mock_error;
      if (mockError === '500') {
        throw { code: 500, message: '模拟服务端异常：路径优化引擎内部错误' };
      }

      return buildOptimizeResponse();
    },
  },
];
