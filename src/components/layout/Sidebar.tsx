
import React from 'react';
import { LayoutDashboard, Route, Terminal, BarChart2, Settings, Box, Zap, Leaf, ShieldCheck, ShoppingCart, MessageSquare, ShieldAlert, Globe } from 'lucide-react';
import Tooltip from '@ui/Tooltip';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isCollapsed?: boolean;
  isMobileOverlay?: boolean;
  isMobileVisible?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  isCollapsed = false,
  isMobileOverlay = false,
  isMobileVisible = false,
  onMobileClose,
}) => {
  const handleViewChange = (view: string) => {
    onViewChange(view);
    if (isMobileOverlay && onMobileClose) {
      onMobileClose();
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: '仪表盘' },
    { id: 'route', icon: <Route size={20} />, label: '路径优化' },
    { id: 'opti', icon: <Zap size={20} />, label: '训练优化' },
    { id: 'carbon', icon: <Leaf size={20} />, label: '碳排放监控' },
    { id: 'compliance', icon: <Globe size={20} />, label: '全球供应链风险预警' },
    { id: 'orders', icon: <ShoppingCart size={20} />, label: '订单管理' },
    { id: 'customer_service', icon: <MessageSquare size={20} />, label: '客户服务' },
  ];

  return (
    <div className={`bg-bg-primary border-r border-border-default flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out shadow-sm z-30 ${
      isMobileOverlay
        ? `fixed top-0 left-0 h-full w-80 z-50 ${isMobileVisible ? 'translate-x-0' : '-translate-x-full'}`
        : isCollapsed ? 'w-16 overflow-visible' : 'w-80 overflow-hidden'
    }`}>
      <div className={`flex items-center ${isCollapsed ? 'justify-center p-4' : 'p-8 gap-4'}`}>
        <div className={`bg-cyan-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] ${
          isCollapsed ? 'w-9 h-9' : 'w-10 h-10'
        }`}>
          <Box className="text-black" size={isCollapsed ? 20 : 24} />
        </div>
        {!isCollapsed && (
          <span className="text-xl font-black tracking-tighter text-text-primary uppercase italic">PathOptix</span>
        )}
      </div>

      <nav className={`flex-1 mt-2 px-4 space-y-1.5 scrollbar-hide ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleViewChange(item.id)}
            className={`relative w-full flex items-center ${isCollapsed ? 'justify-center px-3 py-3' : 'gap-4 px-5 py-4'} rounded-xl transition-all duration-300 group ${
              activeView === item.id
                ? 'bg-bg-secondary border border-brand-primary/10 text-brand-primary shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary/30'
            }`}
          >
            {isCollapsed ? (
              <Tooltip content={item.label} position="right">
                <span className={activeView === item.id ? 'text-brand-primary' : 'text-text-muted group-hover:text-text-secondary'}>
                  {item.icon}
                </span>
              </Tooltip>
            ) : (
              <span className={activeView === item.id ? 'text-brand-primary' : 'text-text-muted group-hover:text-text-secondary'}>
                {item.icon}
              </span>
            )}
            {!isCollapsed && (
              <span className="font-bold text-base">{item.label}</span>
            )}
            {activeView === item.id && (
              isCollapsed ? (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-brand-primary" />
              ) : (
                <div className="ml-auto w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(34,211,238,1)]" />
              )
            )}
          </button>
        ))}

        {!isCollapsed ? (
          <div className="mt-10 px-5 pb-3 text-[10px] uppercase tracking-[0.2em] text-text-muted font-black">系统管理</div>
        ) : (
          <div className="mt-6 mx-auto w-8 h-px bg-border-default" />
        )}
        
        <button 
          onClick={() => handleViewChange('settings')}
          className={`relative w-full flex items-center ${isCollapsed ? 'justify-center px-3 py-3' : 'gap-4 px-5 py-4'} rounded-xl transition-all duration-300 mb-1 group ${
            activeView === 'settings' 
              ? 'bg-bg-secondary border border-brand-primary/10 text-brand-primary shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]' 
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary/30'
          }`}
        >
          {isCollapsed ? (
            <Tooltip content="系统设置" position="right">
              <span className={activeView === 'settings' ? 'text-brand-primary' : 'text-text-muted group-hover:text-text-secondary'}>
                <Settings size={20} />
              </span>
            </Tooltip>
          ) : (
            <span className={activeView === 'settings' ? 'text-brand-primary' : 'text-text-muted group-hover:text-text-secondary'}>
              <Settings size={20} />
            </span>
          )}
          {!isCollapsed && (
            <span className="font-bold text-base">系统设置</span>
          )}
          {activeView === 'settings' && (
            isCollapsed ? (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-brand-primary" />
            ) : (
              <div className="ml-auto w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(34,211,238,1)]" />
            )
          )}
        </button>


      </nav>

      <div className={`${isCollapsed ? 'p-3 mt-auto' : 'p-6 mt-auto'}`}>
        <div className={`bg-bg-secondary rounded-xl border border-border-default ${
          isCollapsed ? 'p-3 flex flex-col items-center space-y-1' : 'p-5 space-y-3'
        }`}>
          {isCollapsed ? (
            <>
              <span className="text-xs font-bold text-brand-primary">78%</span>
              <div className="w-8 h-1 bg-bg-primary rounded-full overflow-hidden">
                <div className="h-full bg-brand-primary rounded-full w-[78%]" />
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-text-muted">待处置高风险数</span>
                <span className="text-brand-primary font-black">3</span>
              </div>
              <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
                <div className="h-full bg-brand-primary rounded-full w-[75%] shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
