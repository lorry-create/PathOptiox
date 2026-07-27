/**
 * 仪表盘模块 Mock 数据
 */
import type { MockHandler } from './index';

export interface DashboardOverview {
  metrics: {
    active_orders: number;
    active_orders_trend: number;
    on_time_rate: number;
    on_time_trend: number;
    total_emission_kg: number;
    emission_trend: number;
    risk_count: number;
    risk_trend: number;
  };
  agent_load: {
    agent_id: string;
    name: string;
    load: number;
    status: 'idle' | 'active' | 'busy';
  }[];
  global_status: {
    network_health: number;
    avg_latency_ms: number;
    active_tasks: number;
  };
}

const buildOverview = (): DashboardOverview => ({
  metrics: {
    active_orders: 156,
    active_orders_trend: 5.2,
    on_time_rate: 96.8,
    on_time_trend: 1.3,
    total_emission_kg: 1284560,
    emission_trend: -8.4,
    risk_count: 3,
    risk_trend: -2,
  },
  agent_load: [
    { agent_id: 'land_agent', name: '陆运智能体', load: 0.68, status: 'active' },
    { agent_id: 'sea_agent', name: '海运智能体', load: 0.82, status: 'busy' },
    { agent_id: 'air_agent', name: '空运智能体', load: 0.35, status: 'active' },
    { agent_id: 'rail_agent', name: '铁路智能体', load: 0.45, status: 'active' },
    { agent_id: 'risk_agent', name: '风险智能体', load: 0.71, status: 'active' },
    { agent_id: 'carbon_agent', name: '碳排智能体', load: 0.28, status: 'idle' },
  ],
  global_status: {
    network_health: 0.94,
    avg_latency_ms: 128,
    active_tasks: 12,
  },
});

export const dashboardMockHandlers: MockHandler[] = [
  {
    method: 'GET',
    url: '/dashboard/overview',
    handler: () => buildOverview(),
  },
  {
    method: 'POST',
    url: '/dashboard/global-optimize',
    handler: () => ({ task_id: 'global_' + Date.now() }),
  },
];
