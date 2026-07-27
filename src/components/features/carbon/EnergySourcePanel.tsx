
import React from 'react';
import { Ship, TrainFront, Plane, Globe } from 'lucide-react';

interface EnergySourcePanelProps {
  activeMode?: string;
  onModeChange?: (mode: string) => void;
  hasOptimized?: boolean;
}

const MODES = [
  { id: 'Ocean', icon: <Ship size={14} />, label: '海运大本营 (Ocean)', percent: 45, color: 'bg-teal-500' },
  { id: 'Rail',  icon: <TrainFront size={14} />, label: '铁路多式联运 (Rail)', percent: 20, color: 'bg-amber-500' },
  { id: 'Air',   icon: <Plane size={14} />, label: '航空货运 (Air)', percent: 35, color: 'bg-slate-500' },
];

const EnergySourcePanel: React.FC<EnergySourcePanelProps> = ({ activeMode = 'ALL', onModeChange, hasOptimized }) => {
  const modePercentages: Record<string, number> = hasOptimized
    ? { Ocean: 53, Rail: 35, Air: 12 }
    : { Ocean: 45, Rail: 20, Air: 35 };

  return (
    <div className="bg-bg-tertiary rounded-3xl p-6 border border-border-default flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest">干线运输模态碳排占比</h3>
        <span className="text-[10px] font-bold text-emerald-400">ESG 合规</span>
      </div>

      {/* "全部" 复位按钮 */}
      <button
        onClick={() => onModeChange?.('ALL')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
          activeMode === 'ALL'
            ? 'bg-bg-tertiary text-text-primary border border-border-default'
            : 'bg-transparent text-text-muted border border-border-default hover:text-text-secondary hover:border-border-default'
        }`}
      >
        <Globe size={12} />
        全部模态概览
      </button>

      <div className="space-y-2">
        {MODES.map((m) => {
          const isActive = activeMode === m.id;
          const pct = modePercentages[m.id];
          return (
            <div
              key={m.id}
              onClick={() => onModeChange?.(m.id)}
              className={`rounded-xl p-3 cursor-pointer transition-all ${
                isActive
                  ? 'bg-bg-tertiary/80 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                  : 'bg-transparent border border-transparent hover:bg-bg-tertiary/40 hover:border-border-default'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] font-bold mb-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className={isActive ? 'text-emerald-400' : ''}>{m.icon}</span>
                  <span className={isActive ? 'text-text-primary font-black' : ''}>{m.label}</span>
                  {isActive && (
                    <span className="ml-1 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span className={isActive ? 'text-text-primary font-black' : 'text-text-muted'}>{pct}%</span>
              </div>
              <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full ${m.color} rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.2)]`}
                  style={{ width: `${pct}%`, opacity: isActive ? 1 : 0.6 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-border-default flex justify-between">
        <div className="text-center">
          <div className="text-xs font-black text-text-primary">{hasOptimized ? '88%' : '65%'}</div>
          <div className="text-[8px] text-text-muted uppercase font-bold">绿色运力总计</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-black text-emerald-400">Low</div>
          <div className="text-[8px] text-text-muted uppercase font-bold">碳风险等级</div>
        </div>
      </div>
    </div>
  );
};

export default EnergySourcePanel;
