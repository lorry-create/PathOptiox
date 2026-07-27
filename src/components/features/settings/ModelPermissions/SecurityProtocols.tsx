
import React, { useState } from 'react';
import { ShieldAlert, Fingerprint, Globe, Key } from 'lucide-react';

const SecurityProtocols: React.FC = () => {
  const [protocols, setProtocols] = useState({
    mfa: true,
    geoFencing: false,
    sessionExpiry: true
  });

  const toggleProtocol = (protocol: string) => {
    setProtocols(prev => ({
      ...prev,
      [protocol]: !prev[protocol]
    }));
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl space-y-8">
      <div className="flex items-center gap-3 text-indigo-400 border-b border-border-default pb-6">
        <ShieldAlert size={20} />
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">高级访问安全协议</h3>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <ProtocolItem 
          icon={<Fingerprint size={18} />} 
          label="强制 MFA 验证" 
          desc="对所有 L1/L2 级别的操作开启生物识别或硬件 Key 验证" 
          active={protocols.mfa}
          onClick={() => toggleProtocol('mfa')}
        />
        <ProtocolItem 
          icon={<Globe size={18} />} 
          label="地理围栏限制 (Geo-fencing)" 
          desc="仅允许来自预设 IDC 办公网段的指令下发请求" 
          active={protocols.geoFencing}
          onClick={() => toggleProtocol('geoFencing')}
        />
        <ProtocolItem 
          icon={<Key size={18} />} 
          label="会话令牌自动过期" 
          desc="管理终端空闲超过 15 分钟将自动断开模型连接" 
          active={protocols.sessionExpiry}
          onClick={() => toggleProtocol('sessionExpiry')}
        />
      </div>
    </div>
  );
};

const ProtocolItem = ({ icon, label, desc, active, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`p-6 rounded-2xl border transition-all duration-300 flex items-center justify-between group cursor-pointer ${active ? 'bg-indigo-600/5 border-indigo-500/30' : 'bg-bg-primary/20 border-border-default'}`}
  >
    <div className="flex items-center gap-6">
      <div className={`p-3 rounded-xl border ${active ? 'bg-bg-elevated border-border-default text-indigo-400' : 'bg-bg-primary border-border-default text-text-muted'}`}>
        {icon}
      </div>
      <div className="space-y-1">
        <div className="text-[11px] font-black text-text-primary uppercase tracking-widest">{label}</div>
        <div className="text-[10px] font-bold text-text-muted leading-relaxed max-w-[280px]">{desc}</div>
      </div>
    </div>
    <div 
      className={`w-10 h-5 rounded-full p-1 flex items-center transition-colors duration-300 cursor-pointer ${active ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'bg-bg-tertiary'}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${active ? 'translate-x-5' : ''}`} />
    </div>
  </div>
);

export default SecurityProtocols;
