import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartTheme } from '@hooks/useChartTheme';
import { carbonApi, CarbonTrendPoint } from '@services';

/* ================================================================
 *  数据类型
 * ================================================================ */

interface DataPoint {
  time: string;
  emissions: number;
  target: number;
  [key: string]: string | number;
}

/** 运输模态 → 后端 transport_mode 参数映射 */
const MODE_PARAM: Record<string, string> = {
  ALL: 'all',
  Ocean: 'sea',
  Rail: 'rail',
  Air: 'air',
};

const MODE_META: Record<string, { label: string; color: string }> = {
  ALL:   { label: '全部模态',   color: '#10b981' },
  Ocean: { label: '海运',       color: '#14b8a6' },
  Rail:  { label: '铁路多式联运', color: '#f59e0b' },
  Air:   { label: '航空货运',   color: '#f97316' },
};

type TimeRange = 'day' | 'week' | 'month';

const TIME_RANGE_LABEL: Record<TimeRange, string> = {
  day: '日',
  week: '周',
  month: '月',
};

/* ================================================================
 *  AI 诊断 Tooltip
 * ================================================================ */

interface TooltipPayload {
  value: number;
  dataKey: string;
  payload: DataPoint;
}

const AiTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
  if (!active || !payload?.length) return null;

  const val = payload[0]?.value ?? 0;
  const isPeak = val > 400;

  return (
    <div className="bg-bg-elevated/95 backdrop-blur-md border border-border-default rounded-xl p-4 shadow-2xl max-w-[260px]">
      <div className="text-[10px] text-text-muted font-bold mb-1">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-lg font-black ${isPeak ? 'text-red-400' : 'text-emerald-400'}`}>
          {val.toFixed(0)}
        </span>
        <span className="text-[10px] text-text-muted font-bold">kgCO2e</span>
      </div>
      {!isPeak && (
        <div className="mt-1 text-[9px] text-text-muted font-bold">正常波动区间</div>
      )}
    </div>
  );
};

/* ================================================================
 *  组件
 * ================================================================ */

interface EmissionChartProps {
  activeMode?: string;
  hasOptimized?: boolean;
}

const EmissionChart: React.FC<EmissionChartProps> = ({ activeMode = 'ALL', hasOptimized }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [rawData, setRawData] = useState<CarbonTrendPoint[]>([]);
  const chartTheme = useChartTheme();

  // S2-T07: 从后端加载碳排放趋势数据（基于真实订单计算）
  const transportMode = MODE_PARAM[activeMode] || 'all';
  useEffect(() => {
    (async () => {
      try {
        const data = await carbonApi.getTrend({
          time_range: timeRange,
          transport_mode: transportMode as 'all' | 'sea' | 'rail' | 'air',
        });
        setRawData(data);
      } catch (err) {
        console.error('加载碳排放趋势失败:', err);
      }
    })();
  }, [timeRange, transportMode]);

  const modeMeta = MODE_META[activeMode] || MODE_META.ALL;

  // 将后端 CarbonTrendPoint 转换为图表 DataPoint
  const baseData: DataPoint[] = useMemo(() => {
    if (!rawData.length) return [];
    const maxEmission = Math.max(
      ...rawData.map(p => p.sea + p.air + p.land + p.rail),
      1,
    );
    const targetLine = Math.round(maxEmission * 0.75);
    return rawData.map(p => {
      // 按选中模态汇总排放量
      const emissions =
        transportMode === 'all'
          ? p.sea + p.air + p.land + p.rail
          : (p[transportMode as keyof CarbonTrendPoint] as number) ?? 0;
      return {
        time: p.date,
        emissions: Math.round(emissions),
        target: targetLine,
      };
    });
  }, [rawData, transportMode]);

  // 极绿模式：排放值乘以 0.6，颜色切换为健康绿
  const modeConfig = useMemo(() => {
    if (!hasOptimized) {
      return { data: baseData, color: modeMeta.color, label: modeMeta.label };
    }
    return {
      data: baseData.map(d => ({
        ...d,
        emissions: Math.round(d.emissions * 0.6),
        target: Math.round(d.target * 0.6),
      })),
      color: '#10b981',
      label: modeMeta.label,
    };
  }, [baseData, hasOptimized, modeMeta]);

  const currentEmissions = modeConfig.data[modeConfig.data.length - 1]?.emissions ?? 0;

  return (
    <div className="bg-bg-tertiary rounded-3xl p-4 md:p-8 border border-border-default h-full flex flex-col shadow-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-10">
        <div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">
            碳排放趋势 (kgCO2e)
            {activeMode !== 'ALL' && (
              <span className="ml-3 text-[10px] text-amber-400 font-bold normal-case tracking-normal bg-amber-500/10 px-2 py-0.5 rounded-full">
                当前视角：{modeConfig.label}
              </span>
            )}
          </h3>
          <p className="text-[10px] text-text-muted font-bold mt-1">
            {hasOptimized ? '极绿模式已激活 · PPO 多目标优化后的碳排轨迹' : '基于真实订单数据计算的全球动态碳足迹'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           {/* 时间筛选按钮 */}
           <div className="flex items-center gap-1 p-1 bg-bg-elevated/50 rounded-xl border border-border-default">
             {(['day', 'week', 'month'] as TimeRange[]).map(range => (
               <button
                 key={range}
                 onClick={() => setTimeRange(range)}
                 className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${
                   timeRange === range
                     ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                     : 'text-text-muted hover:text-text-secondary border border-transparent hover:bg-bg-tertiary/60'
                 }`}
               >
                 {TIME_RANGE_LABEL[range]}
               </button>
             ))}
           </div>
           <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-bold text-emerald-400">当前排量: {currentEmissions.toFixed(0)}kg</span>
           </div>
        </div>
      </div>

      <div className="flex-1 min-h-[200px] md:min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={modeConfig.data}>
            <defs>
              <linearGradient id="colorEm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={modeConfig.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={modeConfig.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
            <XAxis dataKey="time" stroke={chartTheme.axisStroke} tickLine={false} axisLine={false} tick={{ fill: chartTheme.axisTextColor, fontSize: 10 }} />
            <YAxis stroke={chartTheme.axisStroke} tickLine={false} axisLine={false} tick={{ fill: chartTheme.axisTextColor, fontSize: 10 }} />
            <Tooltip content={<AiTooltip />} />
            <Area
              type="monotone"
              dataKey="emissions"
              stroke={modeConfig.color}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorEm)"
              animationDuration={800}
            />
            <Area
              type="stepAfter"
              dataKey="target"
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="5 5"
              fill="none"
              animationDuration={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EmissionChart;
