/**
 * orderApi 单元测试
 *
 * 直接从模块文件导入，避免 barrel index.ts 加载 chat.ts 等使用 import.meta.env 的模块。
 * 通过 jest.mock 模拟 httpClient，验证各 API 方法调用参数正确。
 */
jest.mock('@services/api/httpClient', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  buildAuthHeaders: jest.fn(),
}));

import { httpClient } from '@services/api/httpClient';
import { orderApi } from '@services/modules/order';
import type { Order } from '@services/modules/order';

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('orderApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrders', () => {
    it('应调用 GET /orders 并返回订单列表', async () => {
      const mockResponse = {
        orders: [
          { id: 'ORD001', customer_name: '客户A', date: '2026-07-22', total_amount: 1500, status: 'pending' },
        ],
      };
      mockHttpClient.get.mockResolvedValue(mockResponse as never);

      const result = await orderApi.getOrders();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/orders', expect.objectContaining({
        params: undefined,
        showLoading: false,
        retry: 2,
      }));
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].id).toBe('ORD001');
    });

    it('应支持 filters 参数传递', async () => {
      mockHttpClient.get.mockResolvedValue({ orders: [] } as never);

      await orderApi.getOrders({ keyword: 'test', status: 'pending' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/orders', expect.objectContaining({
        params: { keyword: 'test', status: 'pending' },
      }));
    });

    it('应将旧格式 amount 字符串转换为 total_amount 数值', async () => {
      const mockResponse = {
        orders: [
          { id: 'ORD002', customer_name: '客户B', date: '2026-07-22', amount: '$1,234.56', status: 'pending' },
        ],
      };
      mockHttpClient.get.mockResolvedValue(mockResponse as never);

      const result = await orderApi.getOrders();

      expect(result.orders[0].total_amount).toBe(1234.56);
    });
  });

  describe('createOrder', () => {
    it('应调用 POST /orders 并传递订单数据', () => {
      const orderData = { customer_name: '新客户', date: '2026-07-22', total_amount: 500, status: 'pending' };

      orderApi.createOrder(orderData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/orders', orderData, expect.objectContaining({
        showLoading: true,
      }));
    });
  });

  describe('updateOrder', () => {
    it('应调用 PUT /orders/{id} 并传递更新数据', () => {
      const orderData = { status: 'completed' };

      orderApi.updateOrder('ORD001', orderData);

      expect(mockHttpClient.put).toHaveBeenCalledWith('/orders/ORD001', orderData, expect.objectContaining({
        showLoading: true,
      }));
    });
  });

  describe('deleteOrder', () => {
    it('应调用 DELETE /orders/{id}', () => {
      orderApi.deleteOrder('ORD001');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/orders/ORD001', expect.objectContaining({
        showLoading: true,
      }));
    });
  });

  describe('batchDispatch', () => {
    it('应调用 POST /orders/batch-dispatch 并传递订单 ID 数组', () => {
      const orderIds = ['ORD001', 'ORD002', 'ORD003'];

      orderApi.batchDispatch(orderIds);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/orders/batch-dispatch',
        { order_ids: orderIds },
        expect.objectContaining({ showLoading: true })
      );
    });
  });

  describe('getMetrics', () => {
    it('应调用 GET /orders/metrics', () => {
      orderApi.getMetrics();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/orders/metrics', expect.objectContaining({
        showLoading: false,
      }));
    });
  });
});
