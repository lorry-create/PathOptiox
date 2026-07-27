/**
 * 碳排放监控模块 Mock 数据
 */
import type { MockHandler } from './index';

export interface CarbonOverview {
  total_emission_kg: number;
  trend_pct: number;
  green_rate: number;
  green_rate_trend: number;
  offset_count_kg: number;
  offset_trend: number;
  esg_score: number;
  esg_trend: number;
  // 新增字段：能耗、PUE
  energy_consumption_kwh: number;
  energy_trend: number;
  pue: number;
  pue_trend: number;
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

const STORAGE_KEY_GREEN_MODE = 'mock_carbon_green_mode';

const buildOverview = (): CarbonOverview => ({
  total_emission_kg: 1284560,
  trend_pct: -8.4,
  green_rate: 32.5,
  green_rate_trend: 5.2,
  offset_count_kg: 418200,
  offset_trend: 12.6,
  esg_score: 87.5,
  esg_trend: 2.1,
  // 新增字段：填满顶部 4 个指标卡
  energy_consumption_kwh: 2456800,   // 总能耗（kWh）
  energy_trend: -5.8,                // 能耗环比下降 5.8%
  pue: 1.32,                         // PUE 值
  pue_trend: -2.1,                   // PUE 环比下降 2.1%
});

/**
 * 根据时间范围和运输模态生成趋势数据
 * @param timeRange day/week/month
 * @param transportMode all/sea/rail/air
 */
const buildTrend = (
  timeRange: 'day' | 'week' | 'month' = 'week',
  transportMode: 'all' | 'sea' | 'rail' | 'air' = 'all'
): CarbonTrendPoint[] => {
  const points: CarbonTrendPoint[] = [];
  const today = new Date('2026-07-05');

  // 根据时间范围决定数据点数量
  const pointCount = timeRange === 'day' ? 24 : timeRange === 'week' ? 7 : 30;
  // 仅指定模态时，其他模态置 0
  const filterMode = transportMode !== 'all';

  for (let i = pointCount - 1; i >= 0; i--) {
    const d = new Date(today);
    if (timeRange === 'day') {
      d.setHours(d.getHours() - i);
      points.push({
        date: `${d.getHours().toString().padStart(2, '0')}:00`,
        sea: filterMode && transportMode !== 'sea' ? 0 : 18000 + Math.random() * 8000,
        air: filterMode && transportMode !== 'air' ? 0 : 8000 + Math.random() * 4000,
        land: filterMode ? 0 : 5000 + Math.random() * 3000,
        rail: filterMode && transportMode !== 'rail' ? 0 : 2000 + Math.random() * 1500,
      });
    } else {
      d.setDate(d.getDate() - i);
      points.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        sea: filterMode && transportMode !== 'sea' ? 0 : 18000 + Math.random() * 8000,
        air: filterMode && transportMode !== 'air' ? 0 : 8000 + Math.random() * 4000,
        land: filterMode ? 0 : 5000 + Math.random() * 3000,
        rail: filterMode && transportMode !== 'rail' ? 0 : 2000 + Math.random() * 1500,
      });
    }
  }
  return points;
};

const buildNodeRanks = (): CarbonNodeRank[] => [
  { node_id: 'shanghai', node_name: '上海港', emission_kg: 184500, trend_pct: -5.2 },
  { node_id: 'shenzhen', node_name: '深圳港', emission_kg: 162300, trend_pct: -3.8 },
  { node_id: 'singapore', node_name: '新加坡港', emission_kg: 145800, trend_pct: 2.1 },
  { node_id: 'rotterdam', node_name: '鹿特丹港', emission_kg: 128400, trend_pct: -1.5 },
  { node_id: 'hong_kong', node_name: '香港港', emission_kg: 98700, trend_pct: -4.2 },
  { node_id: 'hamburg', node_name: '汉堡港', emission_kg: 87600, trend_pct: 1.8 },
  { node_id: 'dubai', node_name: '迪拜港', emission_kg: 76500, trend_pct: 3.4 },
  { node_id: 'guangzhou', node_name: '广州港', emission_kg: 65200, trend_pct: -2.6 },
];

const buildESGReport = (): ESGReport => ({
  report_period: '2026 Q2',
  total_emission: 1284560,
  scope1: 458200,
  scope2: 384500,
  scope3: 441860,
  reduction_target: 15,
  actual_reduction: 8.4,
  highlights: [
    '本季度通过极绿调度减少碳排放 8.4%，超出目标 3.4%',
    '海运段碳排放占比 58%，较上季度下降 2.3%',
    '新加坡港引入岸电系统，单港减排 12%',
    '新增 4 艘 LNG 动力船舶，预计全年减排 4500 吨',
  ],
});

// 极绿调度开关状态：从 localStorage 持久化读取
const loadGreenMode = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY_GREEN_MODE) === 'true';
  } catch {
    return false;
  }
};

const saveGreenMode = (enabled: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY_GREEN_MODE, String(enabled));
  } catch {
    // localStorage 不可用时静默降级
  }
};

let greenModeEnabled = loadGreenMode();

export const carbonMockHandlers: MockHandler[] = [
  {
    method: 'GET',
    url: '/carbon/overview',
    handler: () => buildOverview(),
  },
  {
    method: 'GET',
    url: '/carbon/trend',
    handler: (config) => {
      const params = config.params as {
        time_range?: 'day' | 'week' | 'month';
        transport_mode?: 'all' | 'sea' | 'rail' | 'air';
      } | undefined;
      return buildTrend(
        params?.time_range ?? 'week',
        params?.transport_mode ?? 'all'
      );
    },
  },
  {
    method: 'GET',
    url: '/carbon/nodes',
    handler: () => buildNodeRanks(),
  },
  {
    method: 'POST',
    url: '/carbon/toggle-green-mode',
    handler: (config) => {
      const data = config.data as { enable: boolean };
      greenModeEnabled = data?.enable ?? !greenModeEnabled;
      // 持久化到 localStorage，刷新页面后状态保持
      saveGreenMode(greenModeEnabled);
      return { enabled: greenModeEnabled };
    },
  },
  {
    method: 'GET',
    url: '/carbon/esg-report',
    handler: () => buildESGReport(),
  },
];
