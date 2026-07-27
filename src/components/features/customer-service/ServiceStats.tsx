
import React from 'react';
import { Clock, CheckCircle, Users, MessageCircle } from 'lucide-react';

const ServiceStats: React.FC = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
      <StatBox 
        icon={<Clock size={20} />} 
        label="首次响应时间" 
        value="1.2m" 
        trend="-15%" 
        color="text-cyan-400" 
      />
      <StatBox 
        icon={<CheckCircle size={20} />} 
        label="工单解决率" 
        value="98.4%" 
        trend="+2.1%" 
        color="text-emerald-400" 
      />
      <StatBox 
        icon={<Users size={20} />} 
        label="当前排队人数" 
        value="12" 
        trend="-4" 
        color="text-amber-500" 
      />
      <StatBox 
        icon={<MessageCircle size={20} />} 
        label="AI 自动回复率" 
        value="74%" 
        trend="+12%" 
        color="text-purple-400" 
      />
    </div>
  );
};

const StatBox = ({ icon, label, value, trend, color }: any) => (
  <div className="bg-bg-secondary border border-border-default rounded-2xl md:rounded-3xl p-4 md:p-6 hover:border-border-input transition-all duration-300 group overflow-hidden relative">
    <div className="flex justify-between items-start mb-3 md:mb-4">
      <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl bg-bg-primary border border-border-default ${color}`}>
        {icon}
      </div>
      <span className={`text-[9px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded bg-bg-primary border border-border-default ${trend.startsWith('+') ? 'text-emerald-400' : 'text-amber-400'}`}>
        {trend}
      </span>
    </div>
    <div className="space-y-1">
      <div className="text-xl md:text-3xl font-black text-text-primary tracking-tighter">{value}</div>
      <div className="text-[8px] md:text-[10px] text-text-muted font-black uppercase tracking-widest">{label}</div>
    </div>
    <div className={`absolute -right-4 -bottom-4 w-12 h-12 blur-2xl opacity-5 ${color.replace('text', 'bg')}`} />
  </div>
);

export default ServiceStats;
