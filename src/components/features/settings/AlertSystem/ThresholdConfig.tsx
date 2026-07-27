
import React from 'react';
import { BellRing, Info } from 'lucide-react';

/** 预警阈值状态：由父组件 AlertSystemView 持有并持久化到 system_config */
export interface AlertThresholds {
  latency: number;      // ↔ alert_threshold_delay_hours
  congestion: number;    // ↔ alert_threshold_congestion_pct
  risk: number;          // ↔ alert_threshold_risk_score
  carbon: number;        // 本地状态，无对应配置键
}

interface ThresholdConfigProps {
  thresholds: AlertThresholds;
  onChange: (next: AlertThresholds) => void;
}

const ThresholdConfig: React.FC<ThresholdConfigProps> = ({ thresholds, onChange }) => {
  const update = (key: keyof AlertThresholds, v: number) =>
    onChange({ ...thresholds, [key]: v });

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl space-y-10">
      <div className="flex items-center justify-between border-b border-border-default pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
            <BellRing size={20} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">预警触发阈值 (Thresholds)</h3>
        </div>
        <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">自动优化建议</button>
      </div>

      <div className="space-y-12">
        <ThresholdSlider
          label="系统响应延迟 (Latency)"
          unit="ms"
          value={thresholds.latency}
          min={10} max={200}
          color="bg-cyan-500"
          onChange={(v: number) => update('latency', v)}
        />
        <ThresholdSlider
          label="港口拥堵系数 (Congestion)"
          unit="%"
          value={thresholds.congestion}
          min={0} max={100}
          color="bg-amber-500"
          onChange={(v: number) => update('congestion', v)}
        />
        <ThresholdSlider
          label="地缘政策风险 (Policy Risk)"
          unit="Index"
          value={thresholds.risk}
          min={0} max={100}
          color="bg-red-500"
          onChange={(v: number) => update('risk', v)}
        />
      </div>

      <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 flex gap-4 items-start">
         <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
         <p className="text-[10px] text-text-muted leading-relaxed font-bold italic">
           "当前设置基于 <span className="text-text-primary font-black">AI 历史负载模型</span>。降低延迟阈值可能会增加系统调度的重算频率，建议维持在 45ms 以上。"
         </p>
      </div>
    </div>
  );
};

const ThresholdSlider = ({ label, unit, value, min, max, color, onChange }: any) => (
  <div className="space-y-4 group">
    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
      <span className="text-text-muted group-hover:text-text-secondary transition-colors duration-300">{label}</span>
      <span className="text-text-primary italic tracking-tighter text-sm">{value} {unit}</span>
    </div>
    <div className="relative h-1.5 bg-bg-elevated rounded-full flex items-center border border-border-default shadow-inner">
      <div className={`absolute h-full ${color} rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-150`} style={{ width: `${((value - min) / (max - min)) * 100}%` }} />
      <input 
        type="range" min={min} max={max} value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
      />
      <div 
        className="absolute w-4 h-4 bg-white border-2 border-border-default rounded-lg shadow-xl pointer-events-none transition-all duration-150" 
        style={{ left: `${((value - min) / (max - min)) * 100}%`, transform: 'translateX(-50%)' }} 
      />
    </div>
  </div>
);

export default ThresholdConfig;
