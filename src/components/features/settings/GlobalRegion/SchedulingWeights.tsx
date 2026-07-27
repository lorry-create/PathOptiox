import React from 'react';
import { Sliders, Zap } from 'lucide-react';

/** 调度权重状态：由父组件 GlobalRegionView 持有并持久化到 system_config */
export interface SchedulingWeightsState {
  energy: number;     // ↔ scheduling_weight_energy
  latency: number;    // ↔ scheduling_weight_latency
  redundancy: number; // ↔ scheduling_weight_redundancy
  budget: number;     // ↔ scheduling_weight_budget
}

interface SchedulingWeightsProps {
  weights: SchedulingWeightsState;
  onChange: (next: SchedulingWeightsState) => void;
}

const SchedulingWeights: React.FC<SchedulingWeightsProps> = ({ weights, onChange }) => {
  const handleWeightChange = (key: keyof SchedulingWeightsState, val: number) => {
    onChange({ ...weights, [key]: val });
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl flex flex-col gap-8 h-full">
      <div className="flex items-center gap-3 text-cyan-400">
        <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
          <Sliders size={20} />
        </div>
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">全球调度偏好权重</h3>
      </div>

      <div className="space-y-10 flex-1">
        <WeightItem label="能效优先 (Energy)" value={weights.energy} color="bg-emerald-500" onChange={(v: number) => handleWeightChange('energy', v)} />
        <WeightItem label="延迟敏感 (Latency)" value={weights.latency} color="bg-cyan-400" onChange={(v: number) => handleWeightChange('latency', v)} />
        <WeightItem label="路径冗余 (Redundancy)" value={weights.redundancy} color="bg-blue-600" onChange={(v: number) => handleWeightChange('redundancy', v)} />
        <WeightItem label="成本控制 (Budget)" value={weights.budget} color="bg-amber-500" onChange={(v: number) => handleWeightChange('budget', v)} />
      </div>

      <div className="mt-4 p-6 bg-bg-primary/40 border border-border-default rounded-3xl space-y-3 shadow-inner">
        <div className="flex items-center gap-3">
          <Zap size={14} className="text-cyan-500" />
          <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">智能分流引擎</span>
        </div>
        <p className="text-[10px] text-text-muted leading-relaxed font-bold italic">
          "权重调整将实时影响 <span className="text-text-primary">DQN 模型</span> 的奖励函数。检测到异常流量时，系统会自动向高冗余路径倾斜。"
        </p>
      </div>
    </div>
  );
};

const WeightItem = ({ label, value, color, onChange }: any) => (
  <div className="space-y-4 group">
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest group-hover:text-text-primary transition-colors duration-300">{label}</span>
      <span className="text-sm font-black text-text-primary italic tracking-tighter">{value}%</span>
    </div>
    <div className="h-1.5 bg-bg-primary rounded-full relative flex items-center border border-border-default">
      <div className={`absolute h-full ${color} rounded-full shadow-[0_0_12px_rgba(0,0,0,0.4)] transition-all`} style={{ width: `${value}%` }} />
      <input 
        type="range" min="0" max="100" value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
      />
      <div 
        className="absolute w-4 h-4 bg-white border-2 border-border-default rounded-lg shadow-xl pointer-events-none transition-all duration-300" 
        style={{ left: `${value}%`, transform: 'translateX(-50%)' }} 
      />
    </div>
  </div>
);

export default SchedulingWeights;