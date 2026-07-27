import { httpClient } from '../api/httpClient';

// ================================================================
// 类型定义
// ================================================================

export interface Order {
  id: string;
  customer_name: string;
  date: string;
  total_amount: number;       // 新格式：数值类型（旧格式为 amount: string）
  status: string;
  // 旧格式兼容字段（后端未改造前使用）
  amount?: string;
  status_color?: string;
  // 新增详情字段
  sender?: string;
  receiver?: string;
  goods_description?: string;
  shipping_method?: string;
  estimated_delivery?: string;
}

export interface OrderListResponse {
  orders: Order[];
  total?: number;
}

export interface OrderFilters {
  keyword?: string;
  status?: string;
  dateRange?: string;
}

export interface BatchDispatchResponse {
  task_id: string;
}

/**
 * 订单指标统计数据
 * @description 用于 OrderMetrics 组件顶部 4 个指标卡
 */
export interface OrderMetricsData {
  total_count: number;          // 总订单量
  in_transit_count: number;     // 运输中订单数
  avg_processing_hours: number; // 平均处理时效（小时）
  exception_count: number;      // 异常延误数
  total_trend: number;          // 总订单环比（%）
  exception_trend: number;      // 异常环比（数值变化，负数表示下降）
}

// ================================================================
// 工具函数：兼容旧格式数据
// ================================================================

function normalizeOrder(order: Order): Order {
  // 如果后端返回的是旧格式 amount: string，转换为 total_amount: number
  if (order.amount !== undefined && order.total_amount === undefined) {
    const numStr = String(order.amount).replace(/[$,]/g, '');
    order.total_amount = parseFloat(numStr) || 0;
  }
  return order;
}

// ================================================================
// API
// ================================================================

export const orderApi = {
  // 全局约定：所有接口路径不带尾部斜杠
  // httpClient 请求拦截器会自动去除尾部斜杠，此处保持 /orders 不带斜杠
  getOrders: async (filters?: OrderFilters): Promise<OrderListResponse> => {
    const result = await httpClient.get<OrderListResponse>('/orders', {
      params: filters,
      showLoading: false,
      retry: 2,
    });
    // 兼容旧格式数据
    if (result?.orders) {
      result.orders = result.orders.map(normalizeOrder);
    }
    return result;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const order = await httpClient.get<Order>(`/orders/${orderId}`, { showLoading: true });
    return normalizeOrder(order);
  },

  createOrder: (orderData: Partial<Order>) =>
    httpClient.post<Order>('/orders', orderData, { showLoading: true }),

  updateOrder: (orderId: string, orderData: Partial<Order>) =>
    httpClient.put<Order>(`/orders/${orderId}`, orderData, { showLoading: true }),

  deleteOrder: (orderId: string) =>
    httpClient.delete<void>(`/orders/${orderId}`, { showLoading: true }),

  matchCapacity: (orderId: string) =>
    httpClient.post<{ success: boolean; matched: boolean }>(
      `/orders/${orderId}/match-capacity`,
      {},
      { showLoading: true }
    ),

  analyzeCapacity: (orderId: string) =>
    httpClient.get<{ capacity: number; utilization: number }>(
      `/orders/${orderId}/capacity-analysis`,
      { showLoading: true }
    ),

  getCarbonEmission: (orderId: string) =>
    httpClient.get<{ carbon: number; unit: string }>(
      `/orders/${orderId}/carbon`,
      { showLoading: true }
    ),

  batchDispatch: (orderIds: string[]) =>
    httpClient.post<BatchDispatchResponse>('/orders/batch-dispatch', { order_ids: orderIds }, {
      showLoading: true,
    }),

  /**
   * 获取订单指标统计
   * @description 用于 OrderMetrics 组件顶部 4 个指标卡（总订单/运输中/平均时效/异常延误）
   * 后端应基于订单列表实时聚合，保证指标和列表数据一致
   */
  getMetrics: () =>
    httpClient.get<OrderMetricsData>('/orders/metrics', {
      showLoading: false,
    }),
};
