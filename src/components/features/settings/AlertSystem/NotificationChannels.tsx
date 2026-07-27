
import React, { useState } from 'react';
import { Mail, MessageSquare, Terminal, Webhook, Settings2 } from 'lucide-react';

const NotificationChannels: React.FC = () => {
  const [channels, setChannels] = useState({
    email: true,
    slack: true,
    webhook: false,
    console: true
  });

  const toggleChannel = (channel: string) => {
    setChannels(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  };

  const handleManageAPIKeys = () => {
    // 这里可以添加管理API集成密钥的逻辑
    alert('管理API集成密钥功能已触发');
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl space-y-8">
      <div className="flex items-center gap-3 text-cyan-400 border-b border-border-default pb-6">
        <Webhook size={20} />
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">通知路由与终端</h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ChannelItem 
          icon={<Mail size={18} />} 
          label="管理员邮箱 (Direct Mail)" 
          desc="critical-alerts@pathoptix.io" 
          active={channels.email}
          onClick={() => toggleChannel('email')}
        />
        <ChannelItem 
          icon={<MessageSquare size={18} />} 
          label="Slack / Discord 集成" 
          desc="#ops-monitoring-global" 
          active={channels.slack}
          onClick={() => toggleChannel('slack')}
        />
        <ChannelItem 
          icon={<Webhook size={18} />} 
          label="自定义 Webhook" 
          desc="POST: https://api.internal.sys/v1/notify" 
          active={channels.webhook}
          onClick={() => toggleChannel('webhook')}
        />
        <ChannelItem 
          icon={<Terminal size={18} />} 
          label="系统控制台弹窗" 
          desc="Dashboard UI Overlay" 
          active={channels.console}
          onClick={() => toggleChannel('console')}
        />
      </div>

      <button 
        onClick={handleManageAPIKeys}
        className="w-full py-4 bg-bg-elevated border border-border-default rounded-2xl text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-text-primary hover:border-border-input transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
      >
        <Settings2 size={14} /> 管理 API 集成密钥
      </button>
    </div>
  );
};

const ChannelItem = ({ icon, label, desc, active, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between group cursor-pointer ${active ? 'bg-bg-primary/40 border-border-default hover:border-cyan-500/30' : 'bg-bg-primary/10 border-border-default'}`}
  >
    <div className="flex items-center gap-5">
      <div className={`p-3 rounded-xl border ${active ? 'bg-bg-secondary border-border-default text-cyan-400 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'bg-bg-primary border-border-default text-text-muted'}`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black text-text-muted uppercase tracking-widest group-hover:text-text-secondary transition-colors duration-300">{label}</div>
        <div className="text-xs font-bold text-text-muted italic mt-0.5">{desc}</div>
      </div>
    </div>
    <div 
      className={`w-10 h-5 rounded-full p-1 flex items-center transition-colors duration-300 cursor-pointer ${active ? 'bg-emerald-500' : 'bg-bg-tertiary'}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${active ? 'translate-x-5' : ''}`} />
    </div>
  </div>
);

export default NotificationChannels;
