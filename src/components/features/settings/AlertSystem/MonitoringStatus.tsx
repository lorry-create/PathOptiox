
import React from 'react';
import { Activity, ShieldAlert } from 'lucide-react';

const MonitoringStatus: React.FC = () => {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl h-full flex flex-col gap-8">
      <div className="flex items-center gap-3 text-emerald-400">
        <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Activity size={20} />
        </div>
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">实时监控态势</h3>
      </div>

      <div className="space-y-8 flex-1">
        <StatusZone label="系统延迟" current="24ms" limit="45ms" percent={53} status="Safe" />
        <StatusZone label="枢纽负载" current="92%" limit="85%" percent={100} status="Alert" color="bg-red-500" />
        <StatusZone label="带宽利用" current="4.2 Gbps" limit="10 Gbps" percent={42} status="Safe" />
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-[24px] p-6 flex gap-4 items-center">
         <div className="p-3 bg-red-500/20 rounded-2xl text-red-500 animate-pulse">
           <ShieldAlert size={24} />
         </div>
         <div className="space-y-1">
            <h4 className="text-[11px] font-black text-text-primary uppercase tracking-widest">检测到 1 个异常项</h4>
            <p className="text-[10px] text-red-400/80 font-bold italic leading-relaxed">
              上海港核心交换机负载超过阈值 7%。
            </p>
         </div>
      </div>
    </div>
  );
};

const StatusZone = ({ label, current, limit, percent, status, color = "bg-emerald-500" }: any) => (
  <div className="space-y-3 group">
    <div className="flex justify-between items-end">
      <div className="space-y-1">
        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{label}</span>
        <div className="text-lg font-black text-text-primary italic tracking-tighter tabular-nums">{current}</div>
      </div>
      <div className="text-right">
        <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'Alert' ? 'text-red-500' : 'text-emerald-500'}`}>{status}</span>
        <div className="text-[9px] text-text-muted font-bold uppercase mt-0.5">上限: {limit}</div>
      </div>
    </div>
    <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden border border-border-default">
      <div className={`h-full ${color} rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-all duration-1000`} style={{ width: `${percent}%` }} />
    </div>
  </div>
);

export default MonitoringStatus;
