import { useTheme } from './useTheme';

interface ChartThemeConfig {
  gridColor: string;
  axisStroke: string;
  axisTextColor: string;
  tooltipStyle: React.CSSProperties;
  colors: string[];
  areaGradientStart: string;
  areaGradientEnd: string;
}

export function useChartTheme(): ChartThemeConfig {
  const { isDark } = useTheme();

  if (isDark) {
    return {
      gridColor: 'rgba(148, 163, 184, 0.08)',
      axisStroke: '#4b5563',
      axisTextColor: '#64748b',
      tooltipStyle: {
        backgroundColor: '#1c2127',
        border: '1px solid rgba(59, 71, 84, 0.5)',
        borderRadius: '8px',
        color: '#ffffff',
      },
      areaGradientStart: 'rgba(19, 127, 236, 0.3)',
      areaGradientEnd: 'rgba(19, 127, 236, 0.02)',
      colors: [
        '#137fec',  // brand-primary — 主数据系列
        '#10b981',  // success — 正向指标
        '#f59e0b',  // warning — 注意指标
        '#ef4444',  // error — 异常指标
        '#8b5cf6',  // info — 辅助系列 1
        '#ec4899',  // secondary — 辅助系列 2
      ],
    };
  }

  return {
    gridColor: 'rgba(100, 116, 139, 0.12)',
    axisStroke: '#94A3B8',
    axisTextColor: '#94A3B8',
    tooltipStyle: {
      backgroundColor: '#ffffff',
      border: '1px solid #E2E8F0',
      borderRadius: '8px',
      color: '#0F172A',
    },
    areaGradientStart: 'rgba(37, 99, 235, 0.25)',
    areaGradientEnd: 'rgba(37, 99, 235, 0.02)',
    colors: [
      '#2563EB',  // brand-primary (加深以保证对比度)
      '#059669',  // success
      '#D97706',  // warning
      '#DC2626',  // error
      '#7c3aed',  // info
      '#ec4899',  // secondary
    ],
  };
}
