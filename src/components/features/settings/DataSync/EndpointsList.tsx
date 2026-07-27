
import React from 'react';
import { HardDrive } from 'lucide-react';

const EndpointsList: React.FC = () => {
  const endpoints = [
    { label: "Primary Storage Cluster (OSS-HK-01)", url: "oss-ap-hongkong.pathoptix.io", status: "Connected" },
    { label: "Archive Glacier Node (US-W-04)", url: "glacier.us-west-2.amazonaws.com", status: "Standby" },
    { label: "Edge Buffer (SH-09)", url: "edge.shanghai.pathoptix.io", status: "Active" },
  ];

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-border-default pb-4">
        <div className="flex items-center gap-3">
          <HardDrive size={18} className="text-text-muted" />
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">后端数据端点 (Endpoints)</h3>
        </div>
        <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">管理存储池</button>
      </div>
      <div className="space-y-4">
        {endpoints.map((ep, idx) => (
          <div key={idx} className="flex items-center justify-between p-5 bg-bg-primary/40 border border-border-default rounded-[24px] hover:border-blue-500/30 transition-all duration-300 group shadow-sm">
            <div className="space-y-1">
              <div className="text-[10px] text-text-muted font-black uppercase tracking-widest group-hover:text-text-secondary transition-colors duration-300">{ep.label}</div>
              <div className="text-xs font-mono text-text-muted italic tracking-tighter">{ep.url}</div>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border border-white/5 transition-all ${
              ep.status === 'Connected' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
              ep.status === 'Active' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' :
              'bg-bg-elevated text-text-muted'
            }`}>{ep.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EndpointsList;
