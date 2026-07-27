/**
 * 风险预警模块 Mock 数据
 */
import type { MockHandler } from './index';

export interface AlertItem {
  id: string;
  level: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  content: string;
  time: string;
  affected_route: string;
  affected_orders: string[];
  daily_loss: number;
  ai_suggestion: string;
  handled: boolean;
}

const buildAlerts = (): AlertItem[] => [
  {
    id: 'alert_001',
    level: 'critical',
    title: '苏伊士运河拥堵预警',
    content: '苏伊士运河北向通行等待时间超过 72 小时，预计影响 12 条航线',
    time: '2026-07-05 09:30',
    affected_route: 'singapore → rotterdam',
    affected_orders: ['CN77218841', 'CN77218848'],
    daily_loss: 45000,
    ai_suggestion: '建议绕行好望角，虽然增加 7 天时效，但可避免拥堵造成的连锁延误',
    handled: false,
  },
  {
    id: 'alert_002',
    level: 'high',
    title: '上海港台风预警',
    content: '台风「烟花」预计 48 小时内影响上海港，可能暂停作业',
    time: '2026-07-05 08:15',
    affected_route: 'shenzhen → shanghai',
    affected_orders: ['CN77218841', 'CN77218845'],
    daily_loss: 12800,
    ai_suggestion: '建议提前改道宁波港，并通知收货方调整交付预期',
    handled: false,
  },
  {
    id: 'alert_003',
    level: 'moderate',
    title: '欧盟海关新政策',
    content: '欧盟将于 7 月 15 日实施新的碳边境调节机制（CBAM）申报要求',
    time: '2026-07-04 16:00',
    affected_route: 'shenzhen → hamburg',
    affected_orders: ['CN77218848'],
    daily_loss: 0,
    ai_suggestion: '建议提前准备 CBAM 申报材料，避免清关延误',
    handled: false,
  },
  {
    id: 'alert_004',
    level: 'high',
    title: '航空燃油价格上涨',
    content: '航空燃油价格本周上涨 8.5%，空运成本上升',
    time: '2026-07-04 14:20',
    affected_route: 'hong_kong → dubai',
    affected_orders: ['CN77218845'],
    daily_loss: 3200,
    ai_suggestion: '建议时效不紧急的订单改用海铁联运方案',
    handled: true,
  },
  {
    id: 'alert_005',
    level: 'low',
    title: '汉堡港罢工预警',
    content: '汉堡港工会计划于 7 月 10 日举行 24 小时罢工',
    time: '2026-07-03 11:00',
    affected_route: 'rotterdam → hamburg',
    affected_orders: ['CN77218843'],
    daily_loss: 0,
    ai_suggestion: '建议在罢工前 48 小时调整目的港为不来梅哈芬',
    handled: true,
  },
];

export const alertMockHandlers: MockHandler[] = [
  {
    method: 'GET',
    url: '/alerts',
    handler: (config) => {
      const params = config.params as {
        level?: string;
        handled?: boolean;
        page?: number;
        page_size?: number;
      } | undefined;

      // 1. 过滤
      let alerts = buildAlerts();
      if (params?.level) {
        alerts = alerts.filter(a => a.level === params.level);
      }
      if (params?.handled !== undefined) {
        alerts = alerts.filter(a => a.handled === params.handled);
      }

      // 2. 分页
      const total = alerts.length;
      const page = Math.max(1, params?.page ?? 1);
      const pageSize = Math.max(1, params?.page_size ?? 10);
      const startIdx = (page - 1) * pageSize;
      const list = alerts.slice(startIdx, startIdx + pageSize);

      return {
        list,
        total,
        page,
        page_size: pageSize,
      };
    },
  },
  {
    method: 'GET',
    url: '/alerts/{id}',
    handler: (config) => {
      const id = (config.url as string).split('/').pop();
      return buildAlerts().find(a => a.id === id) || buildAlerts()[0];
    },
  },
  {
    method: 'POST',
    url: '/alerts/{id}/handle',
    handler: () => ({ success: true }),
  },
];
