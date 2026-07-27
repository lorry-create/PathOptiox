
import React from 'react';
import { DatabaseZap, Server, Cloud, Database } from 'lucide-react';
import { useChartTheme } from '@hooks/useChartTheme';

interface SyncStatusCardProps {
  progress: number;
  isSyncing: boolean;
}

const SyncStatusCard: React.FC<SyncStatusCardProps> = ({ progress, isSyncing }) => {
  const chartTheme = useChartTheme();
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl space-y-8 relative overflow-hidden group">
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <DatabaseZap size={20} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">核心引擎同步状态</h3>
        </div>
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'} shadow-[0_0_10px_rgba(59,130,246,0.3)]`} />
           <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">
             {isSyncing ? '同步进行中 (SYNCING)' : '数据全域对齐 (CONSISTENT)'}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
        <div className="space-y-6">
           <div className="flex items-center gap-4 group/v cursor-default">
              <div className="w-14 h-14 bg-bg-elevated rounded-2xl flex items-center justify-center text-blue-400 border border-border-default group-hover/v:border-blue-500/30 transition-all duration-300 shadow-inner">
                <Server size={24} />
              </div>
              <div>
                <div className="text-[10px] text-text-muted font-black uppercase tracking-widest">本地训练节点权重</div>
                <div className="text-xl font-black text-text-primary italic tracking-tight">v4.8.2-Final-09</div>
              </div>
           </div>
           <div className="flex items-center gap-4 group/v cursor-default">
              <div className="w-14 h-14 bg-bg-elevated rounded-2xl flex items-center justify-center text-cyan-400 border border-border-default group-hover/v:border-cyan-500/30 transition-all duration-300 shadow-inner">
                <Cloud size={24} />
              </div>
              <div>
                <div className="text-[10px] text-text-muted font-black uppercase tracking-widest">云端全局权重副本</div>
                <div className="text-xl font-black text-text-primary italic tracking-tight">Synced 2m ago</div>
              </div>
           </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-bg-primary/40 rounded-[40px] border border-border-default p-8 shadow-inner relative">
           <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-4 bg-blue-500/5 blur-[25px] rounded-full opacity-60" />
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 overflow-visible drop-shadow-[0_0_12px_rgba(59,130,246,0.1)]">
                <circle cx="50" cy="50" r={radius} stroke={chartTheme.axisStroke} strokeWidth="8" fill="transparent" strokeOpacity="0.4" />
                <circle 
                  cx="50" cy="50" r={radius} 
                  stroke="#3b82f6" strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={circumference * (1 - progress / 100)} 
                  strokeLinecap="round" 
                  className="transition-all duration-300 ease-out" 
                />
              </svg>
              <span className="absolute text-3xl font-black text-text-primary italic drop-shadow-lg tracking-tighter">{Math.round(progress)}%</span>
           </div>
           <div className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mt-6">SHA-256 完整性校验</div>
        </div>
      </div>
      
      {/* 背景修饰图标 */}
      <div className="absolute -bottom-10 -right-10 opacity-[0.02] pointer-events-none transform rotate-12 scale-150">
        <Database size={300} />
      </div>
    </div>
  );
};

export default SyncStatusCard;
