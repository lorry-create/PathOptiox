/**
 * 统一数值格式化工具
 * @description 数字、碳排放量、评分的统一格式化，避免组件中硬编码格式化逻辑
 */

/**
 * 格式化数字（带千分位，无货币符号）
 * @param value 数值
 * @param decimals 小数位数，默认 0
 * @returns 形如 "12,345"
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 格式化碳排放量
 * @param kg 碳排放千克数
 * @returns 形如 "1,234.5 kg"
 */
export function formatCarbon(kg: number): string {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return '0 kg';
  return `${formatNumber(kg, 1)} kg`;
}

/**
 * 将 0-1 的比率值转换为 0-100 的整数评分
 * @description 后端返回的稳定性评分、准时率等字段为 0-1 的小数（如 0.91），
 * 前端展示时统一通过此函数转换为 0-100 的整数（如 91 分）。
 * 对业务组件透明，避免组件中硬编码 * 100 转换逻辑。
 * @param ratio 0-1 的小数（如 0.91）
 * @returns 0-100 的整数（如 91）
 */
export function formatScore(ratio: number): number {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return 0;
  // 兼容已为 0-100 的输入（避免重复放大）
  if (ratio > 1) return Math.round(ratio);
  return Math.round(ratio * 100);
}
