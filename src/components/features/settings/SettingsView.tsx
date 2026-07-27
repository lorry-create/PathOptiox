
import React, { useState } from 'react';
import { 
  Shield, Bell, Database, Globe, User, ChevronRight, 
  Settings as SettingsIcon
} from 'lucide-react';
import GlobalRegionView from './GlobalRegion/GlobalRegionView';
import AccountView from './Account/AccountView';
import DataSyncView from './DataSync/DataSyncView';
import AlertSystemView from './AlertSystem/AlertSystemView';
import ModelPermissionsView from './ModelPermissions/ModelPermissionsView';

interface SettingsViewProps {
  onLogout?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onLogout }) => {
  const [activeSubView, setActiveSubView] = useState<'list' | 'account' | 'globe' | 'database' | 'bell' | 'shield'>('list');

  const sections = [
    { id: 'account', icon: <User size={20} />, title: '个人账户', desc: '管理您的个人信息、实名认证和登录安全' },
    { id: 'globe', icon: <Globe size={20} />, title: '全球区域配置', desc: '设置主要运营港口和优先调度区域' },
    { id: 'database', icon: <Database size={20} />, title: '数据同步', desc: '配置本地与云端模型的同步频率' },
    { id: 'bell', icon: <Bell size={20} />, title: '预警系统', desc: '管理延迟、拥堵及风险的通知阈值' },
    { id: 'shield', icon: <Shield size={20} />, title: '模型权限', desc: '配置团队成员对模型训练的访问级别' },
  ];

  // 1. 全球区域配置详情页
  if (activeSubView === 'globe') {
    return <GlobalRegionView onBack={() => setActiveSubView('list')} />;
  }

  // 2. 个人账户详情页
  if (activeSubView === 'account') {
    return <AccountView onBack={() => setActiveSubView('list')} onLogout={onLogout} />;
  }

  // 3. 数据同步详情页
  if (activeSubView === 'database') {
    return <DataSyncView onBack={() => setActiveSubView('list')} />;
  }

  // 4. 预警系统详情页
  if (activeSubView === 'bell') {
    return <AlertSystemView onBack={() => setActiveSubView('list')} />;
  }

  // 5. 模型权限详情页 (新增集成)
  if (activeSubView === 'shield') {
    return <ModelPermissionsView onBack={() => setActiveSubView('list')} />;
  }

  // 默认设置列表视图
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-black text-text-primary italic tracking-tight">系统设置中心</h2>
        <p className="text-text-muted mt-2 font-medium">全局配置您的 PATHOPTIX 核心优化引擎</p>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide md:flex-col md:overflow-x-visible">
        {sections.map((section, idx) => (
          <div
            key={idx}
            onClick={() => setActiveSubView(section.id as any)}
            className="shrink-0 min-w-[260px] md:min-w-0 bg-bg-secondary border border-border-default rounded-3xl p-5 md:p-6 flex items-center justify-between group cursor-pointer hover:border-indigo-500/30 transition-all duration-300 active:scale-[0.99] shadow-lg"
          >
            <div className="flex items-center gap-4 md:gap-6">
              <div className={`w-12 h-12 md:w-14 md:h-14 bg-bg-primary rounded-2xl flex items-center justify-center text-text-muted group-hover:text-indigo-400 transition-all duration-300 shadow-inner group-hover:shadow-[0_0_15px_rgba(99,102,241,0.1)]`}>
                {section.icon}
              </div>
              <div>
                <h4 className="text-base md:text-lg font-bold text-text-primary mb-1 group-hover:italic transition-all duration-300">{section.title}</h4>
                <p className="text-xs md:text-sm text-text-muted hidden sm:block">{section.desc}</p>
              </div>
            </div>
            <div className="text-text-muted group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-300">
              <ChevronRight size={20} />
            </div>
          </div>
        ))}
      </div>
      <div className="pt-10 border-t border-border-default flex justify-between items-center text-[10px] font-black text-text-primary uppercase tracking-[0.3em]">
         <span>PathOptix Engine v2.4.8 (Stable)</span>
      </div>
    </div>
  );
};

export default SettingsView;
