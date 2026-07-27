import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

const LiveTracking: React.FC = () => {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
        <Navigation size={80} className="text-blue-500 transform rotate-45" />
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
          <Navigation size={14} />
        </div>
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">热点线路实时追踪</h3>
      </div>

      <div className="space-y-6 relative z-10">
        <TrackingStep
          from="Shanghai, CN"
          to="Hamburg, DE"
          progress={65}
          vessel="OCEAN_STAR_V4"
        />
        <TrackingStep
          from="Singapore, SG"
          to="Long Beach, US"
          progress={22}
          vessel="AP_LOGI_FLYER"
        />
      </div>
    </div>
  );
};

const TrackingStep = ({ from, to, progress, vessel }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center text-[10px] font-bold">
      <div className="flex items-center gap-2 text-text-secondary">
        <MapPin size={10} className="text-blue-400" />
        <span>{from} → {to}</span>
      </div>
      <span className="text-blue-400">{progress}%</span>
    </div>
    <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }} />
    </div>
    <div className="text-[9px] text-text-muted font-bold italic tracking-tighter uppercase">Carrier: {vessel}</div>
  </div>
);

export default LiveTracking;
