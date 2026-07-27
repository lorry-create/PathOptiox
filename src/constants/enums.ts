/**
 * 全局业务枚举映射字典
 * @description 统一定义后端枚举值到前端展示文案、颜色、图标的映射
 * 所有组件复用该字典，禁止硬编码中文状态
 */

// ================================================================
// 订单状态枚举
// ================================================================
export type OrderStatus = 'pending' | 'in_transit' | 'delivered' | 'exception';

export interface OrderStatusMeta {
  label: string;
  colorClass: string;
}

export const ORDER_STATUS_MAP: Record<OrderStatus, OrderStatusMeta> = {
  pending: {
    label: '待处理',
    colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  in_transit: {
    label: '运输中',
    colorClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  delivered: {
    label: '已送达',
    colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  exception: {
    label: '异常',
    colorClass: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
};

// ================================================================
// 风险等级枚举
// ================================================================
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface RiskLevelMeta {
  label: string;
  colorClass: string;
}

export const RISK_LEVEL_MAP: Record<RiskLevel, RiskLevelMeta> = {
  low: {
    label: '低风险',
    colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  moderate: {
    label: '中等风险',
    colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  high: {
    label: '高风险',
    colorClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  },
  critical: {
    label: '紧急',
    colorClass: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
};

// ================================================================
// 运输方式枚举
// ================================================================
export type TransportMode = 'sea' | 'air' | 'land' | 'rail' | 'land_customs';

export interface TransportModeMeta {
  label: string;
  icon: string;
}

export const TRANSPORT_MODE_MAP: Record<TransportMode, TransportModeMeta> = {
  sea: { label: '海运', icon: 'directions_boat' },
  air: { label: '空运', icon: 'flight' },
  land: { label: '陆运', icon: 'local_shipping' },
  rail: { label: '铁路', icon: 'train' },
  land_customs: { label: '陆运通关', icon: 'local_shipping' },
};

// ================================================================
// 路径方案枚举
// ================================================================
export type SchemeId = 'cost' | 'robust' | 'speed' | 'green';

export interface SchemeMeta {
  label: string;
  themeColor: string;
}

export const SCHEME_MAP: Record<SchemeId, SchemeMeta> = {
  cost: { label: '成本优先', themeColor: 'blue' },
  robust: { label: '稳健优先', themeColor: 'purple' },
  speed: { label: '时效优先', themeColor: 'orange' },
  green: { label: '绿色优先', themeColor: 'emerald' },
};

// ================================================================
// 训练状态枚举
// ================================================================
export type TrainingStatus = 'running' | 'paused' | 'finished';

export interface TrainingStatusMeta {
  label: string;
  colorClass: string;
}

export const TRAINING_STATUS_MAP: Record<TrainingStatus, TrainingStatusMeta> = {
  running: {
    label: '训练中',
    colorClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  paused: {
    label: '已暂停',
    colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  finished: {
    label: '已完成',
    colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
};

// ================================================================
// 工具函数
// ================================================================

/**
 * 根据订单状态获取展示元数据
 */
export function getOrderStatusMeta(status: string): OrderStatusMeta {
  return ORDER_STATUS_MAP[status as OrderStatus] ?? {
    label: status,
    colorClass: 'bg-bg-tertiary/50 text-text-muted border-border-input',
  };
}

/**
 * 根据风险等级获取展示元数据
 */
export function getRiskLevelMeta(level: string): RiskLevelMeta {
  return RISK_LEVEL_MAP[level as RiskLevel] ?? {
    label: level,
    colorClass: 'bg-bg-tertiary/50 text-text-muted border-border-input',
  };
}

/**
 * 根据运输方式获取展示元数据
 */
export function getTransportModeMeta(mode: string): TransportModeMeta {
  return TRANSPORT_MODE_MAP[mode as TransportMode] ?? {
    label: mode,
    icon: 'help_outline',
  };
}

/**
 * 根据方案 ID 获取展示元数据
 */
export function getSchemeMeta(id: string): SchemeMeta {
  return SCHEME_MAP[id as SchemeId] ?? {
    label: id,
    themeColor: 'slate',
  };
}
