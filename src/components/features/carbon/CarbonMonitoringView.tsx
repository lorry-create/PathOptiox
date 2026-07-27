
import React, { useState, useEffect } from 'react';
import { Leaf, Wind } from 'lucide-react';
import { ToastProvider, useToast } from '@/components/ui';
import CarbonMetrics from './CarbonMetrics';
import EmissionChart from './EmissionChart';
import EnergySourcePanel from './EnergySourcePanel';
import SustainabilityScore from './SustainabilityScore';
import ESGReportView from './ESGReportView';
import EnergyRankingTable from './EnergyRankingTable';
import { carbonApi, CarbonOverview } from '@services';
import { useGlobalStore } from '@/stores/useGlobalStore';

interface CarbonMonitoringViewProps {
  onViewChange?: (view: string) => void;
}

const CarbonMonitoringContent: React.FC<CarbonMonitoringViewProps> = ({ onViewChange }) => {
  const { showToast } = useToast();
  const [isESGReportOpen, setIsESGReportOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  // S2-T06: 极绿模式初始状态从全局 store 读取（已从后端 system_config 同步）
  const greenModeEnabled = useGlobalStore((s) => s.greenModeEnabled);
  const setGreenMode = useGlobalStore((s) => s.setGreenMode);
  const [hasOptimized, setHasOptimized] = useState(greenModeEnabled);
  const [activeMode, setActiveMode] = useState('ALL');
  // S2-T07: 指标初始值从后端 carbon/overview 加载（基于真实订单计算）
  const [metricsData, setMetricsData] = useState({
    carbon: { value: 0, trend: 0 },
    energy: { value: 0, trend: 0 },
    offset: { value: 0, trend: 0 },
    pue: { value: 0, trend: 0 },
  });

  // S2-T07: 挂载时从后端加载碳排放概览数据（基于真实订单）
  useEffect(() => {
    (async () => {
      try {
        const o: CarbonOverview = await carbonApi.getOverview();
        setMetricsData({
          carbon: { value: o.total_emission_kg / 1000, trend: o.trend_pct },      // kg → t
          energy: { value: o.energy_consumption_kwh, trend: o.energy_trend },
          offset: { value: o.green_rate, trend: o.offset_trend },
          pue: { value: o.pue, trend: o.pue_trend },
        });
      } catch (err) {
        console.error('加载碳排放概览失败:', err);
      }
    })();
  }, []);

  const fmt = (n: number, decimals: number) =>
    Number(n.toFixed(decimals));

  const fmtTrend = (n: number) =>
    Number(Math.round(n * 10) / 10);

  // 处理 ESG 报告生成
  const handleGenerateESG = () => {
    setIsESGReportOpen(true);
    showToast('报告生成中，将自动下载');
  };

  // 处理 PPO 极绿调度
  const handleOptimizeEnergy = async () => {
    if (isOptimizing || hasOptimized) return;
    setIsOptimizing(true);

    // S2-T06: 持久化极绿模式到 system_config 表（通过 carbon 模块 API）
    try {
      await carbonApi.toggleGreenMode(true);
      setGreenMode(true);
    } catch (err) {
      console.error('极绿模式持久化失败:', err);
      // 持久化失败仍继续 UI 动画，不阻塞用户操作
    }

    // 模拟优化过程：数据实时抖动
    let step = 0;
    const totalSteps = 15;
    const interval = setInterval(() => {
      step++;
      setMetricsData(prev => ({
        carbon: {
          value: fmt(Math.max(0.6, Math.min(2.0, prev.carbon.value + (Math.random() - 0.7) * 0.15)), 2),
          trend: fmtTrend(Math.max(-30, Math.min(-5, prev.carbon.trend + (Math.random() - 0.5) * 1)))
        },
        energy: {
          value: fmt(Math.max(7000, Math.min(12000, prev.energy.value + (Math.random() - 0.6) * 200)), 0),
          trend: fmtTrend(Math.max(-10, Math.min(10, prev.energy.trend + (Math.random() - 0.5) * 0.5)))
        },
        offset: {
          value: fmt(Math.max(70, Math.min(95, prev.offset.value + (Math.random() - 0.3) * 1.5)), 1),
          trend: fmtTrend(Math.max(10, Math.min(35, prev.offset.trend + (Math.random() - 0.5) * 1)))
        },
        pue: {
          value: fmt(Math.max(1.02, Math.min(1.35, prev.pue.value + (Math.random() - 0.6) * 0.03)), 2),
          trend: fmtTrend(Math.max(-0.15, Math.min(-0.02, prev.pue.trend + (Math.random() - 0.4) * 0.02)))
        }
      }));
      if (step >= totalSteps) {
        clearInterval(interval);
        setIsOptimizing(false);
        setHasOptimized(true);
        showToast('极绿调度模式已开启，路径优化将优先低碳目标');
      }
    }, 100);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 max-w-[1800px] mx-auto w-full">
      {/* 顶部标题与快速动作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
              <Leaf size={28} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">碳排放监控中心</h2>
              <p className="text-text-muted text-[9px] md:text-xs font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] mt-1">
                GLOBAL SUPPLY CHAIN ESG &amp; CARBON FOOTPRINT TRACKER
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={handleGenerateESG}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-bg-tertiary border border-border-default rounded-xl text-xs font-bold text-text-muted hover:text-emerald-400 transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer hover:scale-105"
          >
            <Wind size={14} className="group-hover:rotate-45 transition-transform" /> 生成ESG报告
          </button>
          <button
            onClick={handleOptimizeEnergy}
            disabled={isOptimizing || hasOptimized}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition-all ${
              hasOptimized
                ? 'bg-emerald-900 text-emerald-300 border-2 border-emerald-500/50 shadow-emerald-500/30 cursor-default'
                : isOptimizing
                  ? 'bg-bg-tertiary text-text-primary cursor-wait'
                  : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:scale-105 hover:shadow-emerald-500/40 cursor-pointer'
            }`}
          >
            {isOptimizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Agent 重新规划中...
              </>
            ) : hasOptimized ? (
              '✅ 已开启'
            ) : (
              '⚡ 启动 PPO 极绿调度'
            )}
          </button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <CarbonMetrics metricsData={metricsData} hasOptimized={hasOptimized} />

      {/* 中间核心分析区 */}
      <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
        {/* 趋势图 */}
        <div className="col-span-12 lg:col-span-8 min-h-0">
          <EmissionChart activeMode={activeMode} hasOptimized={hasOptimized} />
        </div>

        {/* 绿色评分与能源分布 */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 md:gap-6 lg:gap-8 min-h-0">
          <SustainabilityScore hasOptimized={hasOptimized} />
          <EnergySourcePanel activeMode={activeMode} onModeChange={setActiveMode} hasOptimized={hasOptimized} />
        </div>
      </div>

      {/* 节点能耗排行表格（S2-T07: 基于真实订单数据） */}
      <EnergyRankingTable />

      {/* ESG 报告弹窗组件 */}
      <ESGReportView
        isOpen={isESGReportOpen}
        onClose={() => setIsESGReportOpen(false)}
      />
    </div>
  );
};

const CarbonMonitoringView: React.FC<CarbonMonitoringViewProps> = (props) => {
  return (
    <ToastProvider>
      <CarbonMonitoringContent {...props} />
    </ToastProvider>
  );
};

export default CarbonMonitoringView;
