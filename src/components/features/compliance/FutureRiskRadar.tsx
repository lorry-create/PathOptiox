import React from 'react';
import { AlertTriangle, CloudLightning, Anchor, Route, Truck } from 'lucide-react';

interface RiskRadarData {
  id: string;
  hazard_type: string;
  probability: number;
  impact_region: string;
  estimated_loss: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

interface FutureRiskRadarProps {
  risks: RiskRadarData[];
  currentTimeLabel: string;
}

const FutureRiskRadar: React.FC<FutureRiskRadarProps> = ({ risks, currentTimeLabel }) => {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return { border: 'border-red-500/40', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]', text: 'text-red-400', bg: 'bg-red-500/10', badge: 'bg-red-500/20 text-red-400' };
      case 'HIGH': return { border: 'border-orange-500/40', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]', text: 'text-orange-400', bg: 'bg-orange-500/10', badge: 'bg-orange-500/20 text-orange-400' };
      case 'MODERATE': return { border: 'border-amber-500/30', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.15)]', text: 'text-amber-400', bg: 'bg-amber-500/10', badge: 'bg-amber-500/20 text-amber-400' };
      default: return { border: 'border-border-default/50', glow: '', text: 'text-text-muted', bg: 'bg-text-muted/10', badge: 'bg-border-default/30 text-text-muted' };
    }
  };

  const getHazardIcon = (type: string) => {
    if (type.includes('台风') || type.includes('气压') || type.includes('风暴')) return <CloudLightning size={14} />;
    if (type.includes('港口')) return <Anchor size={14} />;
    if (type.includes('航线')) return <Route size={14} />;
    if (type.includes('陆运')) return <Truck size={14} />;
    return <AlertTriangle size={14} />;
  };

  const getProbabilityBarColor = (prob: number) => {
    if (prob >= 80) return 'bg-red-500';
    if (prob >= 60) return 'bg-orange-500';
    if (prob >= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-3xl p-4 md:p-8 flex flex-col">
      <div className="flex items-center gap-3 mb-4 md:mb-8">
        <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <AlertTriangle size={16} className="text-red-400" />
        </div>
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">风险雷达</h3>
        <span className="ml-auto text-[9px] text-text-muted font-mono">{currentTimeLabel}</span>
      </div>

      <div className="space-y-3 flex-1">
        {risks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-text-muted text-xs">
            当前时段未检测到显著风险
          </div>
        ) : (
          risks.map((risk) => {
            const style = getSeverityStyle(risk.severity);
            return (
              <div
                key={risk.id}
                className={`relative rounded-2xl border ${style.border} ${style.glow} p-5 transition-all duration-500 ${risk.probability >= 80 ? 'animate-pulse' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={style.text}>{getHazardIcon(risk.hazard_type)}</span>
                    <span className="text-sm font-black text-text-primary">{risk.hazard_type}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${style.badge}`}>
                    {risk.severity}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-muted font-bold">影响区域</span>
                    <span className="text-text-secondary font-bold">{risk.impact_region}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-muted font-bold">预估损失</span>
                    <span className={`font-bold ${style.text}`}>{risk.estimated_loss}</span>
                  </div>
                </div>

                {/* Probability bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-text-muted font-bold">发生概率</span>
                    <span className="text-xs font-black text-text-primary">{risk.probability}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProbabilityBarColor(risk.probability)} rounded-full transition-all duration-1000 shadow-[0_0_6px_rgba(255,255,255,0.1)]`}
                      style={{ width: `${risk.probability}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom bar */}
      <div className="mt-6 pt-4 border-t border-border-default flex items-center justify-between">
        <span className="text-[10px] text-text-muted font-bold">共 {risks.length} 项风险指标</span>
        <span className="text-[9px] text-red-400 font-black uppercase tracking-widest">
          {risks.filter(r => r.severity === 'CRITICAL').length > 0 && '⚠ CRITICAL'}
        </span>
      </div>
    </div>
  );
};

export default FutureRiskRadar;
