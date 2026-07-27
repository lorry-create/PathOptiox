
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Zap, Activity, ShieldCheck, User, Settings, LogOut, ShieldAlert, ChevronRight, CheckCircle, Package, AlertTriangle } from 'lucide-react';
import ThemeToggle from '@ui/ThemeToggle';
import CollapseToggle from '@ui/CollapseToggle';
import Tooltip from '@ui/Tooltip';

interface HeaderProps {
  onLogout?: () => void;
  onViewChange?: (view: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

interface Notification {
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  icon: string;
  time: string;
}

const Header: React.FC<HeaderProps> = ({ onLogout, onViewChange, isSidebarCollapsed, onToggleSidebar }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (view: string) => {
    onViewChange?.(view);
    setIsDropdownOpen(false);
  };

  const generateNotifications = () => {
    const notificationTypes = [
      {
        title: '系统优化完成',
        message: '全局路径优化已完成，预计节省成本 15%',
        type: 'success',
        icon: 'CheckCircle',
        time: '刚刚'
      },
      {
        title: '订单状态更新',
        message: '订单 ORD-94021 已更新为运输中状态',
        type: 'info',
        icon: 'Package',
        time: '5分钟前'
      },
      {
        title: '拥堵预警',
        message: '宁波舟山港出现拥堵，建议调整运输计划',
        type: 'warning',
        icon: 'AlertTriangle',
        time: '15分钟前'
      },
      {
        title: '系统维护',
        message: '系统将于今晚 23:00 进行例行维护',
        type: 'info',
        icon: 'Settings',
        time: '1小时前'
      }
    ];
    
    const count = Math.floor(Math.random() * 3) + 2;
    const shuffled = [...notificationTypes].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    
    setNotifications(selected);
  };

  const handleNotificationClick = () => {
    if (!isNotificationOpen) {
      generateNotifications();
    }
    setIsNotificationOpen(!isNotificationOpen);
  };

  return (
    <header className="h-20 border-b border-border-default bg-bg-secondary/60 backdrop-blur-xl px-4 md:px-10 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      {onToggleSidebar && (
        <CollapseToggle
          isCollapsed={!!isSidebarCollapsed}
          onToggle={onToggleSidebar}
          size="md"
          className="shrink-0 mr-3"
        />
      )}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <Tooltip content="当前生效策略：成本时效均衡模式" position="bottom">
          <div className="flex items-center gap-1.5 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 bg-bg-secondary border border-cyan-500/20 rounded-lg shrink-0 cursor-help">
             <Zap size={14} className="text-cyan-500 md:!w-[18px] md:!h-[18px]" fill="currentColor" />
             <span className="text-xs md:text-sm font-black tracking-widest text-cyan-400">RK</span>
          </div>
        </Tooltip>
        <div className="h-6 w-px bg-border-default mx-2 hidden md:block" />
        <h1 className="text-lg font-bold text-text-primary tracking-tight hidden md:block">强化学习路径优化引擎</h1>

        <div className="ml-2 md:ml-8 px-3 md:px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full items-center gap-2.5 hidden md:flex">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">系统健康</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-6 shrink-0">
        <div className="hidden md:flex items-center gap-2 text-text-muted text-xs font-medium">
          <Activity size={14} />
          <span>延迟: 24ms</span>
        </div>

        <div className="h-10 w-px bg-border-default mx-2 hidden md:block" />

        <ThemeToggle />

        <div className="relative" ref={notificationRef}>
          <button 
            onClick={handleNotificationClick}
            className="p-2.5 text-text-muted hover:text-text-secondary transition-colors relative group"
          >
            <Bell size={24} className="group-hover:scale-110 transition-transform" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-bg-modal" />
          </button>

          {isNotificationOpen && (
            <div className="absolute top-full right-0 mt-3 w-[calc(100vw-2rem)] md:w-80 bg-bg-secondary backdrop-blur-2xl border border-border-default rounded-[28px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 origin-top-right z-50">
              <div className="p-4 border-b border-border-default/50 bg-bg-tertiary/40 flex justify-between items-center">
                <h3 className="text-sm font-bold text-text-primary">系统通知</h3>
                <span className="text-[10px] font-bold text-text-muted">{notifications.length} 条新消息</span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification, index) => (
                  <div 
                    key={index}
                    className="p-4 border-b border-border-default/30 hover:bg-bg-tertiary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : notification.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {notification.icon === 'CheckCircle' && <CheckCircle size={16} />}
                        {notification.icon === 'Package' && <Package size={16} />}
                        {notification.icon === 'AlertTriangle' && <AlertTriangle size={16} />}
                        {notification.icon === 'Settings' && <Settings size={16} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-text-primary">{notification.title}</h4>
                          <span className="text-[9px] text-text-muted">{notification.time}</span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-1">{notification.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border-default/50">
                <button className="w-full py-2 text-center text-sm font-bold text-brand-primary hover:text-brand-primary/80 transition-colors">
                  查看全部通知
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center gap-4 pl-2 cursor-pointer group transition-all duration-300 py-1.5 px-3 rounded-2xl border ${
              isDropdownOpen ? 'bg-bg-tertiary/80 border-brand-primary/30' : 'border-transparent hover:bg-bg-tertiary/30'
            }`}
          >
            <div className="text-right hidden md:block">
              <div className={`text-sm font-black transition-colors ${isDropdownOpen ? 'text-brand-primary' : 'text-text-primary group-hover:text-brand-primary'}`}>
                管理员账户
              </div>
              <div className="text-[10px] text-text-muted font-bold uppercase tracking-tighter">高级优化工程师</div>
            </div>
            <div className="relative">
              <div
                aria-label="User"
                className={`w-10 h-10 rounded-xl border-2 transition-all shadow-xl flex items-center justify-center text-sm font-black text-white bg-gradient-to-br from-cyan-500 to-blue-600 select-none ${
                  isDropdownOpen ? 'border-brand-primary scale-105' : 'border-border-input group-hover:border-brand-primary'
                }`}
              >
                管
              </div>
              <div className="absolute -bottom-1 -right-1 bg-brand-primary p-0.5 rounded-md border-2 border-bg-modal">
                <ShieldCheck size={10} className="text-black" />
              </div>
            </div>
          </div>

          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-3 w-[calc(100vw-2rem)] md:w-64 bg-bg-secondary backdrop-blur-2xl border border-border-default rounded-[28px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 origin-top-right">
              <div className="p-6 border-b border-border-default/50 bg-bg-tertiary/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border border-border-input bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-black text-white select-none">管</div>
                  <div>
                    <div className="text-xs font-black text-text-primary italic tracking-tight">RK_ADMIN_01</div>
                    <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> 认证设备访问
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-2.5">
                <DropdownItem 
                  icon={<User size={16} />} 
                  label="个人中心" 
                  desc="资料与公开设置" 
                  onClick={() => handleNavigate('settings')} 
                />
                <DropdownItem 
                  icon={< ShieldAlert size={16} />} 
                  label="安全治理" 
                  desc="双重验证与权限" 
                  onClick={() => handleNavigate('settings')} 
                />
                <DropdownItem 
                  icon={<Settings size={16} />} 
                  label="系统配置" 
                  desc="全局优化参数控制" 
                  onClick={() => handleNavigate('settings')} 
                />
              </div>

              <div className="p-2.5 border-t border-border-default/50 mt-1">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all group/logout"
                >
                  <div className="flex items-center gap-3 font-black text-[11px] uppercase tracking-widest">
                    <LogOut size={16} className="group-hover/logout:-translate-x-1 transition-transform" />
                    退出登录
                  </div>
                  <ChevronRight size={14} className="opacity-0 group-hover/logout:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const DropdownItem = ({ icon, label, desc, onClick }: { icon: React.ReactNode, label: string, desc: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-bg-tertiary/60 transition-all group text-left"
  >
    <div className="p-2.5 bg-bg-elevated border border-border-default rounded-xl text-text-muted group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-all shadow-inner">
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-[11px] font-black text-text-primary group-hover:text-text-primary transition-colors uppercase tracking-widest">{label}</div>
      <div className="text-[9px] text-text-muted font-bold group-hover:text-text-secondary transition-colors uppercase">{desc}</div>
    </div>
    <ChevronRight size={14} className="text-border-default group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
  </button>
);

export default Header;
