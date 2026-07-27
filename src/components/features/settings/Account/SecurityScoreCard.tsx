import React from 'react';
import { Shield, ChevronRight } from 'lucide-react';
import { useChartTheme } from '@hooks/useChartTheme';

const SecurityScoreCard: React.FC = () => {
  const chartTheme = useChartTheme();
  const score = 94;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
            <Shield size={18} />
          </div>
          <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">账户安全评分</h4>
        </div>
        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded-full uppercase border border-emerald-500/20 tracking-tighter">极高风险防御已开启</span>
      </div>

      <div className="flex items-center gap-8 bg-bg-primary/40 p-6 rounded-[24px] border border-border-default shadow-inner">
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          <div className="absolute inset-2 bg-emerald-500/5 blur-2xl rounded-full opacity-60" />
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <circle cx="50" cy="50" r={radius} stroke={chartTheme.axisStroke} strokeWidth="8" fill="transparent" strokeOpacity="0.4" />
            <circle 
              cx="50" cy="50" r={radius} 
              stroke="#10b981" strokeWidth="8" fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={offset} 
              strokeLinecap="round" 
              className="transition-all duration-1000 ease-out animate-pulse"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-black text-text-primary italic leading-none tracking-tighter drop-shadow-md">{score}</span>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-black text-emerald-400 uppercase italic">Excellent Protection</p>
            <p className="text-[10px] text-text-muted leading-relaxed font-bold italic">
              "您的账户目前处于高度保护状态。建议开启物理硬件 Key 验证以达到 100 分。"
            </p>
          </div>
          <button className="text-[10px] font-black text-cyan-400 hover:text-text-primary transition-colors duration-300 uppercase tracking-[0.2em] flex items-center gap-1.5 group/btn">
            查看详细安全报告 <ChevronRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityScoreCard;