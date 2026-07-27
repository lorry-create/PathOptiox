
import React, { useEffect, useState } from 'react';
import { useChartTheme } from '@hooks/useChartTheme';
import type { ComputeState, SchemeId } from './RouteOptimizationView';

interface SensitivityChartProps {
  isStress?: boolean;
  compute?: ComputeState;
  selectedScheme?: SchemeId;
  onSchemeChange?: (id: SchemeId) => void;
}

// 4 条曲线与方案对应关系
interface CurveDef {
  id: SchemeId;
  label: string;
  color: string;
  // 三场景的 y 坐标 (常规 / 高拥堵 / 极端地缘)
  points: [number, number, number];
  dashed?: string;
  riskLabel: string;
  riskColor: string;
}

const CURVES: CurveDef[] = [
  { id: 'robust', label: '鲁棒性路径 (Robustness)', color: '#10b981', points: [80, 90, 100], riskLabel: '高稳定性', riskColor: 'text-emerald-500' },
  { id: 'cost', label: '成本最优 (Cost-Optimized)', color: '#3b82f6', points: [100, 120, 160], dashed: '4 4', riskLabel: '高风险', riskColor: 'text-blue-500' },
  { id: 'speed', label: '时效优先 (Speed-Focused)', color: '#f59e0b', points: [70, 110, 140], dashed: '2 2', riskLabel: '中风险', riskColor: 'text-amber-500' },
  { id: 'green', label: '环保路径 (Eco-Friendly)', color: '#8b5cf6', points: [90, 100, 110], riskLabel: '低风险', riskColor: 'text-purple-500' },
];

const SensitivityChart: React.FC<SensitivityChartProps> = ({ compute, selectedScheme, onSchemeChange }) => {
  const chartTheme = useChartTheme();
  const [pulseKey, setPulseKey] = useState(0);

  const currentEp = compute?.ppoFrames.length ? compute.ppoFrames[compute.ppoFrames.length - 1].episode : 0;
  const isComputing = compute?.status === 'computing';

  useEffect(() => {
    if (isComputing && currentEp > 0 && currentEp % 200 === 0) {
      setPulseKey(k => k + 1);
    }
  }, [currentEp, isComputing]);

  // 计算中曲线随回合轻微下沉 (韧性衰减模拟)
  const decayOffset = isComputing ? Math.min(15, currentEp / 100) : 0;
  const computingLabel = isComputing ? ` · 同步中 R${currentEp}` : '';

  const handleCurveClick = (id: SchemeId) => {
    onSchemeChange?.(id);
  };

  return (
    <div className="bg-bg-tertiary/60 backdrop-blur-xl rounded-[24px] p-6 border border-border-default shadow-2xl flex flex-col min-h-[300px]">
      <div className="mb-8">
        <h3 className="text-xs font-black text-text-primary uppercase tracking-[0.15em]">
          场景敏感度分析
          {isComputing && <span className="ml-2 text-[9px] text-blue-400 font-bold animate-pulse">PPO 同步</span>}
        </h3>
        <p className="text-[9px] text-text-muted font-bold mt-1 uppercase tracking-[0.05em] leading-relaxed">
          环境剧烈变动时的韧性衰减曲线{computingLabel}
        </p>
      </div>

      <div className="relative mb-6 h-[200px]">
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[8px] text-text-primary font-black pr-2">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>

        <div className="ml-6 h-full">
          <svg width="100%" height="100%" viewBox="0 0 300 200" key={pulseKey}>
            {/* 网格线 */}
            <line x1="0" y1="20" x2="300" y2="20" stroke={chartTheme.gridColor} strokeDasharray="1 10" />
            <line x1="0" y1="100" x2="300" y2="100" stroke={chartTheme.gridColor} strokeDasharray="1 10" />
            <line x1="0" y1="180" x2="300" y2="180" stroke={chartTheme.gridColor} strokeDasharray="1 10" />

            {/* 场景标签 */}
            <text x="50" y="195" fill={chartTheme.axisTextColor} fontSize="10" fontWeight="bold">常规运营</text>
            <text x="150" y="195" fill={chartTheme.axisTextColor} fontSize="10" fontWeight="bold">高拥堵场景</text>
            <text x="250" y="195" fill={chartTheme.axisTextColor} fontSize="10" fontWeight="bold">极端地缘风险</text>

            {/* 4 条曲线 (可点击) */}
            {CURVES.map(curve => {
              const isSelected = selectedScheme === curve.id;
              const y0 = curve.points[0] + (curve.id === 'robust' ? decayOffset * 0.3 : curve.id === 'cost' ? decayOffset : 0);
              const y1 = curve.points[1] + (curve.id === 'robust' ? decayOffset * 0.5 : curve.id === 'cost' ? decayOffset * 1.2 : 0);
              const y2 = curve.points[2] + (curve.id === 'robust' ? decayOffset * 0.7 : curve.id === 'cost' ? decayOffset * 1.5 : 0);
              const sw = isSelected ? 3 : 1.5;
              return (
                <g
                  key={curve.id}
                  onClick={() => handleCurveClick(curve.id)}
                  className="cursor-pointer transition-all duration-300"
                  opacity={isSelected ? 1 : 0.85}
                >
                  {/* 透明加宽命中区域 */}
                  <path d={`M50,${y0} L150,${y1} L250,${y2}`} stroke="transparent" strokeWidth="14" fill="none" />
                  <path
                    d={`M50,${y0} L150,${y1} L250,${y2}`}
                    stroke={curve.color}
                    strokeWidth={sw}
                    fill="none"
                    strokeDasharray={curve.dashed}
                    className="transition-all duration-300"
                    style={{ filter: isSelected ? `drop-shadow(0 0 4px ${curve.color})` : 'none' }}
                  />
                  <circle cx="50" cy={y0} r={isSelected ? 4 : 3} fill={curve.color} className="transition-all duration-300" />
                  <circle cx="150" cy={y1} r={isSelected ? 4 : 3} fill={curve.color} className="transition-all duration-300" />
                  <circle cx="250" cy={y2} r={isSelected ? 4 : 3} fill={curve.color} className="transition-all duration-300" />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 图例 (可点击) */}
      <div className="space-y-2">
        {CURVES.map(curve => {
          const isSelected = selectedScheme === curve.id;
          const dashClass = curve.dashed === '4 4' ? 'border-b border-dashed' : curve.dashed === '2 2' ? 'border-b border-dotted' : '';
          return (
            <button
              key={curve.id}
              onClick={() => handleCurveClick(curve.id)}
              className={`w-full flex items-center justify-between bg-bg-elevated/40 p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${isSelected ? 'border-blue-500/40 ring-1 ring-blue-500/20 bg-blue-500/5' : 'border-border-default/50 hover:bg-bg-elevated/60'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-1 rounded-full ${dashClass}`} style={{ backgroundColor: curve.color, borderColor: curve.color }} />
                <span className={`text-[9px] font-black uppercase tracking-tighter ${isSelected ? 'text-text-primary' : 'text-text-muted'}`}>{curve.label}</span>
              </div>
              <span className={`text-[9px] font-black uppercase ${curve.riskColor}`}>{curve.riskLabel}</span>
            </button>
          );
        })}
      </div>

      {/* 底部结论 */}
      <div className="mt-4 pt-3 border-t border-border-default/50">
        <p className="text-[9px] text-text-muted leading-relaxed">
          鲁棒性方案在极端风险下性能衰减仅12%，稳定性显著优于成本最优方案（衰减48%）
        </p>
      </div>
    </div>
  );
};

export default SensitivityChart;
