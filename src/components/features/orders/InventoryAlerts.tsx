import React from 'react';
import { Database, AlertTriangle } from 'lucide-react';

const InventoryAlerts: React.FC = () => {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-amber-500"><Database size={18} /></div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">库存周转预警</h3>
        </div>
      </div>

      <div className="space-y-4">
        <AlertItem label="SKU-8204-CH" warehouse="华东一号仓" level="L-CRITICAL" color="text-red-500" val={8} />
        <AlertItem label="SKU-1022-US" warehouse="LA-EDGE-HUB" level="M-WARNING" color="text-amber-500" val={24} />
        <AlertItem label="SKU-4402-EU" warehouse="ROTTERDAM_04" level="NORMAL" color="text-emerald-400" val={72} />
      </div>
    </div>
  );
};

const AlertItem = ({ label, warehouse, level, color, val }: any) => (
  <div className="p-4 bg-bg-primary border border-border-default rounded-2xl flex items-center justify-between group hover:border-border-input transition-all duration-300">
    <div className="flex items-center gap-4">
      <div className={`w-1.5 h-8 rounded-full ${color.replace('text', 'bg')}`} />
      <div>
        <div className="text-xs font-black text-text-primary">{label}</div>
        <div className="text-[10px] text-text-muted font-bold uppercase">{warehouse}</div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-xs font-black text-text-primary">{val}%</div>
      <div className={`text-[9px] font-black uppercase tracking-widest ${color}`}>{level}</div>
    </div>
  </div>
);

export default InventoryAlerts;
