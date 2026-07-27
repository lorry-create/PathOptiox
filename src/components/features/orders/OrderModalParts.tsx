import React from 'react';
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle2, Clock, X } from 'lucide-react';

// --- CarbonMonitoringModal sub-components ---

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  trend?: string;
  sub?: string;
  isPositiveTrend?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, trend, sub, isPositiveTrend }) => (
  <div className="bg-bg-elevated/40 border border-border-default rounded-3xl p-5 space-y-3">
    <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">{label}</div>
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl font-black text-text-primary italic tabular-nums">{value}</span>
      <span className="text-[10px] font-black text-text-muted uppercase">{unit}</span>
    </div>
    {trend && (
      <div className={`flex items-center gap-1.5 text-[9px] font-black ${isPositiveTrend ? 'text-emerald-400' : 'text-emerald-500'}`}>
        {isPositiveTrend ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {trend}
      </div>
    )}
    {sub && (
      <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{sub}</div>
    )}
  </div>
);

interface EmissionOrderItemProps {
  id: string;
  route: string;
  val: string;
  mode: string;
  icon: React.ReactNode;
  color: string;
}

export const EmissionOrderItem: React.FC<EmissionOrderItemProps> = ({ id, route, val, mode, icon, color }) => (
  <div className="bg-bg-tertiary border border-border-default rounded-2xl p-4 flex items-center justify-between group hover:border-border-default transition-all duration-300">
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-black text-text-primary italic">#{id}</div>
        <div className="text-[9px] text-text-muted font-bold mt-0.5">{route}</div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-sm font-black text-orange-400 tracking-tighter italic">{val}</div>
      <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-0.5">{mode}</div>
    </div>
  </div>
);

// --- CapacityAnalysisModal sub-components ---

interface KPICardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  isDown?: boolean;
  isWarning?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({ label, value, unit, trend, isDown, isWarning }) => (
  <div className={`bg-bg-tertiary border rounded-3xl p-6 space-y-4 ${isWarning ? 'border-red-500/40 bg-red-500/5' : 'border-border-default'}`}>
    <div className="flex items-center gap-2">
      {isWarning && <span className="text-[10px] text-red-500 animate-pulse">▲</span>}
      <span className={`text-[10px] font-black uppercase tracking-widest ${isWarning ? 'text-red-500' : 'text-text-muted'}`}>{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <span className={`text-3xl font-black tracking-tighter italic ${isWarning ? 'text-red-500' : 'text-text-primary'}`}>{value}</span>
      {unit && <span className="text-[10px] text-text-muted font-bold uppercase">{unit}</span>}
    </div>
    {trend !== undefined && (
      <div className={`flex items-center gap-2 text-xs font-black ${isDown ? 'text-emerald-500' : 'text-orange-500'}`}>
        {isDown ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
        <span>{trend}</span>
      </div>
    )}
  </div>
);

interface RelatedPointProps {
  title: string;
  desc: string;
  color: string;
  textColor: string;
}

export const RelatedPoint: React.FC<RelatedPointProps> = ({ title, desc, color, textColor }) => (
  <div className={`border-l-2 ${color} bg-bg-elevated/40 p-5 rounded-r-2xl space-y-2`}>
    <h5 className={`text-xs font-black ${textColor}`}>{title}</h5>
    <p className="text-[10px] text-text-muted font-medium">{desc}</p>
  </div>
);

interface LogItemProps {
  color: string;
  title: string;
  time: string;
  region: string;
  icon: React.ReactNode;
}

export const LogItem: React.FC<LogItemProps> = ({ color, title, time, region, icon }) => (
  <div className={`bg-bg-tertiary border-l-4 ${color} rounded-r-2xl p-6 space-y-4 group hover:bg-bg-tertiary/40 transition-colors duration-300`}>
    <div className="flex items-start gap-4">
      <div className="mt-0.5">{icon}</div>
      <div className="space-y-2">
        <h5 className="text-sm font-black text-text-secondary leading-snug">{title}</h5>
        <div className="flex gap-3 text-[9px] text-text-muted font-bold uppercase tracking-tighter">
          <span>{time}</span>
          <span>•</span>
          <span>{region}</span>
        </div>
      </div>
    </div>
  </div>
);
