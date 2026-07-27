
import React from 'react';
import { ArrowRightLeft, CheckCircle2, Cpu } from 'lucide-react';

interface SyncStrategyCardProps {
  activeStrategy: string;
  onSelect: (id: string) => void;
}

const SyncStrategyCard: React.FC<SyncStrategyCardProps> = ({ activeStrategy, onSelect }) => {
  const strategies = [
    { id: 'realtime', title: '实时流式同步 (Real-time)', desc: '适合处于高强度训练期的模型，确保全球权重毫秒级对齐。', active: true },
    { id: 'batch', title: '周期性批处理 (Batch Hourly)', desc: '每小时聚合一次历史轨迹数据，大幅节省跨境带宽资源。', active: false },
    { id: 'offpeak', title: '低碳/闲时同步 (Off-peak)', desc: '仅在本地系统负载低于20%且能源价格低廉时进行全局融合。', active: false },
  ];

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl h-full flex flex-col gap-10">
      <div className="flex items-center gap-3 text-blue-400">
        <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <ArrowRightLeft size={20} />
        </div>
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">同步频率与冲突策略</h3>
      </div>

      <div className="space-y-4 flex-1">
        {strategies.map((strat) => (
          <div 
            key={strat.id}
            onClick={() => onSelect(strat.id)}
            className={`p-6 rounded-[32px] border transition-all duration-300 cursor-pointer relative group flex flex-col gap-3 ${
              activeStrategy === strat.id 
                ? 'bg-blue-600/10 border-blue-500/40 shadow-2xl ring-1 ring-blue-500/20' 
                : 'bg-bg-primary/30 border-border-default hover:border-border-default'
            }`}
          >
            <div className="flex justify-between items-start">
               <h4 className={`text-sm font-black ${activeStrategy === strat.id ? 'text-text-primary italic' : 'text-text-muted'} uppercase tracking-tight`}>
                 {strat.title}
               </h4>
               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                 activeStrategy === strat.id ? 'border-blue-500 bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'border-border-default'
               }`}>
                  {activeStrategy === strat.id && <CheckCircle2 size={14} className="text-text-primary" />}
               </div>
            </div>
            <p className={`text-[11px] leading-relaxed ${activeStrategy === strat.id ? 'text-text-secondary' : 'text-text-muted'} font-medium`}>
              {strat.desc}
            </p>
            {activeStrategy === strat.id && (
              <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_#3b82f6]" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-8 border-t border-border-default">
         <div className="bg-blue-500/5 border border-blue-500/20 rounded-[24px] p-6 flex gap-5 items-start group hover:bg-blue-500/10 transition-all duration-300 cursor-default">
            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400 shrink-0 shadow-lg group-hover:scale-110 transition-transform">
              <Cpu size={20} />
            </div>
            <div className="space-y-2">
              <h4 className="text-[11px] font-black text-text-primary uppercase tracking-[0.2em]">数据吞吐预估</h4>
              <p className="text-[10px] text-text-muted leading-relaxed font-bold italic">
                当前策略预计日均产生 <span className="text-blue-400 font-black">14.2 GB</span> 的出网流量。系统建议在 <span className="text-emerald-500">02:00 AM</span> 执行全量备份。
              </p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SyncStrategyCard;
