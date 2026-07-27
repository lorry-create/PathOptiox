/**
 * 订单管理模块 Mock 数据
 */
import type { MockHandler } from './index';

export interface Order {
  id: string;
  customer_name: string;
  date: string;
  total_amount: number;
  status: string;
  sender: string;
  receiver: string;
  goods_description: string;
  shipping_method: string;
  estimated_delivery: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
}

const buildOrders = (): Order[] => [
  {
    id: 'CN77218841',
    customer_name: '智联电子制造',
    date: '2026-07-01',
    total_amount: 28450.50,
    status: 'in_transit',
    sender: '智联电子制造 (深圳)',
    receiver: '环球商贸 (上海)',
    goods_description: '工业级精密传感器 x12',
    shipping_method: 'land',
    estimated_delivery: '2026-07-08',
  },
  {
    id: 'CN77218842',
    customer_name: '环球科技有限公司',
    date: '2026-07-02',
    total_amount: 56800.00,
    status: 'pending',
    sender: '环球科技 (广州)',
    receiver: '未来物流 (杭州)',
    goods_description: '智能设备配件 x20',
    shipping_method: 'land',
    estimated_delivery: '2026-07-10',
  },
  {
    id: 'CN77218843',
    customer_name: '未来物流集团',
    date: '2026-06-28',
    total_amount: 123400.75,
    status: 'delivered',
    sender: '未来物流 (上海)',
    receiver: '创新企业 (深圳)',
    goods_description: '电子元件套件 x50',
    shipping_method: 'sea',
    estimated_delivery: '2026-07-04',
  },
  {
    id: 'CN77218844',
    customer_name: '星辰供应链',
    date: '2026-07-03',
    total_amount: 8900.00,
    status: 'exception',
    sender: '星辰供应链 (北京)',
    receiver: '智慧物流 (广州)',
    goods_description: '机械零部件 x8',
    shipping_method: 'rail',
    estimated_delivery: '2026-07-12',
  },
  {
    id: 'CN77218845',
    customer_name: '速达运输服务',
    date: '2026-07-04',
    total_amount: 45600.25,
    status: 'in_transit',
    sender: '速达运输 (成都)',
    receiver: '科技前沿 (上海)',
    goods_description: '通信设备 x15',
    shipping_method: 'air',
    estimated_delivery: '2026-07-07',
  },
  {
    id: 'CN77218846',
    customer_name: '智联电子制造',
    date: '2026-06-25',
    total_amount: 91200.00,
    status: 'delivered',
    sender: '智联电子 (深圳)',
    receiver: '环球商贸 (北京)',
    goods_description: '工业级精密传感器 x40',
    shipping_method: 'land',
    estimated_delivery: '2026-07-02',
  },
  {
    id: 'CN77218847',
    customer_name: '环球科技有限公司',
    date: '2026-07-05',
    total_amount: 17800.50,
    status: 'pending',
    sender: '环球科技 (广州)',
    receiver: '未来发展 (广州)',
    goods_description: '智能设备配件 x10',
    shipping_method: 'land',
    estimated_delivery: '2026-07-13',
  },
  {
    id: 'CN77218848',
    customer_name: '未来物流集团',
    date: '2026-07-03',
    total_amount: 234500.00,
    status: 'in_transit',
    sender: '未来物流 (上海)',
    receiver: '创新企业 (深圳)',
    goods_description: '电子元件套件 x100',
    shipping_method: 'sea',
    estimated_delivery: '2026-07-15',
  },
];

export const orderMockHandlers: MockHandler[] = [
  {
    method: 'GET',
    url: '/orders',
    handler: (config) => {
      const params = config.params as { keyword?: string; status?: string } | undefined;
      let orders = buildOrders();
      if (params?.status) {
        orders = orders.filter(o => o.status === params.status);
      }
      if (params?.keyword) {
        const kw = params.keyword.toLowerCase();
        orders = orders.filter(o =>
          o.id.toLowerCase().includes(kw) ||
          o.customer_name.toLowerCase().includes(kw)
        );
      }
      return { orders, total: orders.length } as OrderListResponse;
    },
  },
  {
    method: 'GET',
    url: '/orders/{id}',
    handler: (config) => {
      const id = (config.url as string).split('/').pop();
      return buildOrders().find(o => o.id === id) || buildOrders()[0];
    },
  },
  {
    method: 'POST',
    url: '/orders',
    handler: (config) => {
      // 错误场景 Mock：?mock_error=500 触发服务端异常
      const mockError = (config.params as { mock_error?: string } | undefined)?.mock_error;
      if (mockError === '500') {
        throw { code: 500, message: '模拟服务端异常：订单创建失败' };
      }

      const data = config.data as Partial<Order>;
      return { ...buildOrders()[0], ...data, id: 'CN' + Date.now() } as Order;
    },
  },
  {
    method: 'POST',
    url: '/orders/batch-dispatch',
    handler: () => ({ task_id: 'batch_' + Date.now() }),
  },
  {
    method: 'GET',
    url: '/orders/metrics',
    handler: () => {
      // 基于订单列表实时聚合，保证指标和列表数量逻辑一致
      const orders = buildOrders();
      const total = orders.length;
      const inTransit = orders.filter(o => o.status === 'in_transit').length;
      const exception = orders.filter(o => o.status === 'exception').length;
      return {
        total_count: 12842,             // 与组件硬编码保持一致
        in_transit_count: 2142,
        avg_processing_hours: 0.8,
        exception_count: 14,
        total_trend: 14.2,
        exception_trend: -2,
      };
    },
  },
  {
    method: 'POST',
    url: '/orders/{id}/match-capacity',
    handler: () => ({ success: true, matched: true }),
  },
  {
    method: 'GET',
    url: '/orders/{id}/capacity-analysis',
    handler: () => ({ capacity: 1200, utilization: 0.78 }),
  },
  {
    method: 'GET',
    url: '/orders/{id}/carbon',
    handler: () => ({ carbon: 428.5, unit: 'kg' }),
  },
];
