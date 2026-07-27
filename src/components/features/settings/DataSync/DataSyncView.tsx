
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import SyncStatusCard from './SyncStatusCard';
import SyncStrategyCard from './SyncStrategyCard';
import EndpointsList from './EndpointsList';
import { systemApi } from '@services';

interface DataSyncViewProps {
  onBack: () => void;
}

const DataSyncView: React.FC<DataSyncViewProps> = ({ onBack }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(100);
  // S2-T06: activeStrategy 挂载时从 system_config 加载，切换时即时持久化
  const [activeStrategy, setActiveStrategy] = useState('realtime');

  // 挂载时从后端 system_config 表加载已持久化的数据同步策略
  useEffect(() => {
    (async () => {
      try {
        const res = await systemApi.getConfig();
        const cfg = res.configs || {};
        if (cfg.data_sync_strategy) {
          setActiveStrategy(cfg.data_sync_strategy);
        }
      } catch (err) {
        console.error('加载数据同步策略失败:', err);
      }
    })();
  }, []);

  // S2-T06: 切换同步策略时即时持久化到 system_config 表
  const handleStrategyChange = useCallback((id: string) => {
    setActiveStrategy(id);
    systemApi
      .updateConfig({ configs: { data_sync_strategy: id } })
      .catch((err) => console.error('保存数据同步策略失败:', err));
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    setSyncProgress(0);
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 15;
      if (prog >= 100) {
        setSyncProgress(100);
        setIsSyncing(false);
        clearInterval(interval);
      } else {
        setSyncProgress(prog);
      }
    }, 200);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={onBack}
            className="p-2.5 bg-bg-secondary border border-border-default rounded-xl text-text-muted hover:text-text-primary transition-all duration-300 hover:scale-110 shadow-xl"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg md:text-2xl font-black text-text-primary tracking-tight italic">数据同步与权重融合</h2>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1 hidden sm:block">Cross-Cloud Model Consistency & Weight Sync Suite</p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`px-5 md:px-8 py-3 rounded-xl text-xs font-black shadow-lg transition-all duration-300 flex items-center gap-2 uppercase tracking-widest ${
            isSyncing ? 'bg-bg-tertiary text-text-muted cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-600/20 hover:scale-105 active:scale-95'
          }`}
        >
          <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? '正在同步云端数据...' : '立即执行增量同步'}
        </button>
      </div>

      {/* 主布局网格 */}
      <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
        {/* 左侧：状态与端点 */}
        <div className="col-span-12 lg:col-span-7 space-y-4 md:space-y-6 lg:space-y-8">
          <SyncStatusCard progress={syncProgress} isSyncing={isSyncing} />
          <EndpointsList />
        </div>

        {/* 右侧：策略配置 */}
        <div className="col-span-12 lg:col-span-5">
          <SyncStrategyCard activeStrategy={activeStrategy} onSelect={handleStrategyChange} />
        </div>
      </div>
    </div>
  );
};

export default DataSyncView;
