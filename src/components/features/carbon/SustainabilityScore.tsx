
import React from 'react';
import { Award } from 'lucide-react';
import { useChartTheme } from '@hooks/useChartTheme';

interface SustainabilityScoreProps {
  hasOptimized?: boolean;
}

const SustainabilityScore: React.FC<SustainabilityScoreProps> = ({ hasOptimized }) => {
  const chartTheme = useChartTheme();
  const score = hasOptimized ? 96 : 84;
  const radius = 45; // 稍微减小半径以确保描边不超出
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-bg-tertiary rounded-3xl p-4 md:p-6 border border-border-default flex flex-col sm:flex-row items-center justify-between gap-4 group shadow-xl">
      <div className="space-y-2 flex-1 text-center sm:text-left">
        <div className="flex items-center gap-2 text-emerald-400 justify-center sm:justify-start">
          <Award size={18} />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">AI 供应链 ESG 评级</h3>
        </div>
        <div className={`text-2xl font-black italic tracking-tighter ${hasOptimized ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'text-text-primary'}`}>
          等级: {hasOptimized ? 'S' : 'A+'}
        </div>
        <p className="text-[10px] text-text-muted font-bold leading-relaxed">
          多目标优化策略有效减少了 <span className="text-emerald-400">{hasOptimized ? '45%' : '22%'}</span> 的无效空运与绕路碳消耗。
        </p>
      </div>

      {/* 优化后的仪表盘容器 */}
      <div className="relative w-28 h-28 md:w-32 md:h-32 flex items-center justify-center shrink-0">
        {/* 背景光晕 */}
        <div className="absolute inset-4 bg-emerald-500/5 blur-[25px] rounded-full opacity-60" />
        
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 overflow-visible drop-shadow-[0_0_8px_rgba(16,185,129,0.1)]">
          {/* 背景轨道 */}
          <circle 
            cx="50" cy="50" r={radius} 
            stroke={chartTheme.axisStroke} strokeWidth="7" 
            fill="transparent" 
            strokeOpacity="0.4"
          />
          {/* 进度轨道 */}
          <circle 
            cx="50" cy="50" r={radius} 
            stroke="#10b981" strokeWidth="7" 
            fill="transparent" 
            className="transition-all duration-1000 ease-out" 
            strokeDasharray={circumference} 
            strokeDashoffset={offset} 
            strokeLinecap="round" 
          />
        </svg>
        
        {/* 居中文字排版 - 匹配用户提供的参考图 */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-text-primary leading-none tracking-tighter">
            {score}
          </span>
          <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.15em] mt-1.5 border-t border-border-default pt-1.5 w-8">
            POINTS
          </span>
        </div>
      </div>
    </div>
  );
};

export default SustainabilityScore;
