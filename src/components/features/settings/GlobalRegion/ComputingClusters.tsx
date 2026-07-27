import React from 'react';
import { Activity, Cpu } from 'lucide-react';

const clusters = [
  { name: "亚太集群 (APAC)", nodes: 120, status: "Online", color: "text-emerald-500", bg: "bg-emerald-500/10", active: true },
  { name: "北美集群 (NA)", nodes: 42, status: "Backup", color: "text-blue-500", bg: "bg-blue-500/10", active: true },
  { name: "欧非集群 (EMEA)", nodes: 0, status: "Offline", color: "text-red-500", bg: "bg-red-500/10", active: false },
  { name: "南美节点 (LATAM)", nodes: 12, status: "Idle", color: "text-text-muted", bg: "bg-bg-tertiary", active: false },
];

const ComputingClusters: React.FC = () => {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl space-y-6">
      <div className="flex items-center gap-3 text-text-muted">
        <div className="p-2.5 bg-bg-elevated border border-border-default rounded-xl">
          <Cpu size={18} />
        </div>
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">算力集群分布</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {clusters.map((cluster, idx) => (
          <div 
            key={idx} 
            className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 group ${
              cluster.active ? 'bg-bg-primary/40 border-border-default hover:border-border-input' : 'bg-bg-primary/10 border-border-default opacity-60'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cluster.bg} ${cluster.color} border border-white/5 shadow-lg group-hover:scale-110 transition-transform`}>
                <Activity size={18} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-black text-text-secondary">{cluster.name}</div>
                <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">活跃: <span className="text-text-primary">{cluster.nodes}</span></div>
              </div>
            </div>
            <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-white/5 bg-bg-elevated shadow-sm ${cluster.color}`}>
              {cluster.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComputingClusters;