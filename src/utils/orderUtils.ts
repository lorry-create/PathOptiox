// 订单相关的共享工具函数

/** 中文 → 英文状态映射 */
const STATUS_TO_EN: Record<string, string> = {
  '待分配': 'pending',
  '处理中': 'processing',
  '运输中': 'shipping',
  '已妥投': 'completed',
  '异常延误': 'delayed',
};

/** 英文 → 中文状态映射 */
const STATUS_TO_CN: Record<string, string> = {
  pending: '待分配',
  processing: '处理中',
  shipping: '运输中',
  completed: '已妥投',
  delayed: '异常延误',
};

/** 状态 → 颜色映射 */
const STATUS_COLOR: Record<string, string> = {
  pending: 'purple',
  processing: 'blue',
  shipping: 'blue',
  completed: 'gray',
  delayed: 'orange',
};

/** 英文状态值 → 中文显示文本 */
export const getStatusText = (status: string): string =>
  STATUS_TO_CN[status] || '待分配';

/** 中文状态文本 → 英文状态值 */
export const mapStatusToValue = (status: string): string =>
  STATUS_TO_EN[status] || 'pending';

/** 英文状态值 → 颜色 */
export const getStatusColor = (status: string): string =>
  STATUS_COLOR[status] || 'purple';

/** 生成订单 ID: ORD-YYYY-XXXX */
export const generateOrderId = (): string => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${year}-${randomNum}`;
};
