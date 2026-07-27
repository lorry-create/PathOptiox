import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, Globe, Info, CheckCircle } from 'lucide-react';
import HubManagement from './HubManagement';
import SchedulingWeights, { SchedulingWeightsState } from './SchedulingWeights';
import ComputingClusters from './ComputingClusters';
import { systemApi } from '@services';

interface GlobalRegionViewProps {
  onBack: () => void;
}

const GlobalRegionView: React.FC<GlobalRegionViewProps> = ({ onBack }) => {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // S2-T06: 权重状态由本视图持有，挂载时从 system_config 加载，保存时回写
  const [weights, setWeights] = useState<SchedulingWeightsState>({
    energy: 75,
    latency: 30,
    redundancy: 60,
    budget: 45,
  });

  // 挂载时从后端 system_config 表加载已持久化的调度权重
  useEffect(() => {
    (async () => {
      try {
        const res = await systemApi.getConfig();
        const cfg = res.configs || {};
        setWeights(prev => ({
          energy: cfg.scheduling_weight_energy ? Number(cfg.scheduling_weight_energy) : prev.energy,
          latency: cfg.scheduling_weight_latency ? Number(cfg.scheduling_weight_latency) : prev.latency,
          redundancy: cfg.scheduling_weight_redundancy ? Number(cfg.scheduling_weight_redundancy) : prev.redundancy,
          budget: cfg.scheduling_weight_budget ? Number(cfg.scheduling_weight_budget) : prev.budget,
        }));
      } catch (err) {
        console.error('加载调度权重配置失败:', err);
      }
    })();
  }, []);

  // S2-T06: 保存全局配置 → 持久化调度权重到 system_config 表
  const handleSaveGlobalConfig = async () => {
    setIsSaving(true);
    try {
      await systemApi.updateConfig({
        configs: {
          scheduling_weight_energy: String(weights.energy),
          scheduling_weight_latency: String(weights.latency),
          scheduling_weight_redundancy: String(weights.redundancy),
          scheduling_weight_budget: String(weights.budget),
        },
      });
      setShowSuccessModal(true);
    } catch (err) {
      console.error('保存调度权重配置失败:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto">
      {/* 顶部导航 */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={onBack}
            className="p-2.5 bg-bg-secondary border border-border-default rounded-xl text-text-muted hover:text-text-primary transition-all duration-300 hover:scale-110 shadow-xl"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg md:text-2xl font-black text-text-primary tracking-tight italic">全球区域与枢纽配置</h2>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1 hidden sm:block">Strategic Hubs & Intelligent Scheduling</p>
          </div>
        </div>
        <div className="flex gap-3 md:gap-4">
           <button className="px-4 md:px-6 py-3 bg-bg-elevated border border-border-default text-text-muted text-xs font-black rounded-xl hover:text-text-primary transition-all duration-300 uppercase tracking-widest">
             重置
           </button>
           <button
             onClick={handleSaveGlobalConfig}
             disabled={isSaving}
             className="px-5 md:px-8 py-3 bg-cyan-600 text-white text-xs font-black rounded-xl shadow-lg shadow-cyan-600/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
           >
             <Save size={14} /> {isSaving ? '保存中...' : '保存全局配置'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
        {/* 左侧主要区域 */}
        <div className="col-span-12 lg:col-span-7 space-y-4 md:space-y-6 lg:space-y-8">
          <HubManagement />
          <ComputingClusters />
        </div>

        {/* 右侧配置区域 */}
        <div className="col-span-12 lg:col-span-5 space-y-4 md:space-y-6 lg:space-y-8 flex flex-col">
          <SchedulingWeights weights={weights} onChange={setWeights} />
          
          {/* 合规性提示卡片 */}
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-[32px] p-8 flex gap-6 items-start mt-auto">
            <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400">
              <Info size={24} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">区域合规性说明</h4>
              <p className="text-[10px] text-text-muted leading-relaxed font-medium italic">
                您的配置目前符合 <span className="text-cyan-400">GDPR</span> 和 <span className="text-cyan-400">PMSA</span> 数据传输标准。更改主要调度区域将触发全网延迟重新审计。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部装饰背景 */}
      <div className="fixed bottom-0 right-0 p-12 opacity-[0.02] pointer-events-none">
        <Globe size={400} className="text-text-muted" />
      </div>

      {/* 保存成功弹窗 */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-bg-secondary border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.3)]">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-emerald-500" fill="currentColor" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">保存成功</h3>
            <p className="text-text-muted text-sm mb-6">全局配置已保存，相关设置已更新</p>
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors duration-300"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalRegionView;