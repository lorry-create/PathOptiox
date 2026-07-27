import React from 'react';
import { Anchor, Activity } from 'lucide-react';

const hubs = [
  { name: "上海港 (CN SHG)", load: 94, status: "Critical", color: "text-red-500", bg: "bg-red-500/10" },
  { name: "新加坡港 (SG SIN)", load: 42, status: "Stable", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { name: "鹿特丹港 (NL RTM)", load: 76, status: "Warning", color: "text-amber-500", bg: "bg-amber-500/10" },
  { name: "洛杉矶港 (US LAX)", load: 55, status: "Stable", color: "text-emerald-500", bg: "bg-emerald-500/10" },
];

const HubManagement: React.FC = () => {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl space-y-8 relative overflow-hidden">
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
            <Anchor size={20} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">核心枢纽状态</h3>
        </div>
        <div className="text-[10px] text-text-muted font-black uppercase tracking-widest animate-pulse">实时健康度检测中...</div>
      </div>

      <div className="space-y-4 relative z-10">
        {hubs.map((hub, idx) => (
          <div key={idx} className="bg-bg-primary/40 border border-border-default rounded-2xl p-5 group hover:border-cyan-500/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="text-[10px] font-black text-text-muted uppercase tracking-widest group-hover:text-text-secondary transition-colors duration-300">{hub.name}</div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${hub.bg} ${hub.color} border border-white/5 uppercase`}>
                {hub.status}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black">
                <span className="text-text-muted">实时负载强度</span>
                <span className="text-text-primary italic">{hub.load}%</span>
              </div>
              <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden border border-border-default shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${hub.load > 90 ? 'bg-red-500' : hub.load > 70 ? 'bg-amber-500' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} 
                  style={{ width: `${hub.load}%` }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HubManagement;