import React, { useState } from 'react';
import { Globe, Shield, AlertTriangle, X, CheckCircle, Info } from 'lucide-react';
import { ToastProvider, useToast } from '@/components/ui';
import type { RouteOptimizationParams } from '@/components/features/routing';
import PredictiveSandbox from './PredictiveSandbox';

// ================================================================
// 类型定义
// ================================================================

type AlertLevel = '高' | '中' | '低';
type FilterLevel = '全部' | AlertLevel;

interface AlertItem {
  time: string;
  level: AlertLevel;
  msg: string;
  color: string;
  dotColor: string;
  duration: string;
  affectedRoute: string;
  affectedOrders: number;
  dailyLoss: string;
  aiSuggestion: string;
}

// ================================================================
// 静态数据
// ================================================================

const riskMetrics = [
  { label: '全球运输风险指数', value: '32.4', unit: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', filter: '低' as FilterLevel },
  { label: '港口拥堵预警', value: '3', unit: '处活跃', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', filter: '中' as FilterLevel },
  { label: '合规覆盖率', value: '97.2', unit: '%', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', filter: '全部' as FilterLevel },
  { label: 'AI 预警准确率', value: '94.8', unit: '%', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', filter: '高' as FilterLevel },
];

const alerts: AlertItem[] = [
  {
    time: '08:32', level: '高', msg: '红海航线苏伊士运河通行延误预计48h，建议启用好望角备选路线', color: 'text-red-400', dotColor: 'bg-red-500',
    duration: '预计48-72小时', affectedRoute: '红海-地中海航线', affectedOrders: 12, dailyLoss: '$1.2万/天',
    aiSuggestion: '建议启用好望角备选路线，可规避80%延误风险，预计增加运输成本15%但可保障时效。',
  },
  {
    time: '07:15', level: '中', msg: '鹿特丹港泊位紧张，区域船舶排队增加23%', color: 'text-amber-400', dotColor: 'bg-orange-500',
    duration: '预计24-48小时', affectedRoute: '欧洲西北港口航线', affectedOrders: 8, dailyLoss: '$0.8万/天',
    aiSuggestion: '建议提前调整靠泊计划，启用备用内陆运输线路，分流至安特卫普港可降低30%排队时间。',
  },
  {
    time: '06:48', level: '中', msg: '东南亚海域台风预警，部分航线可能延误2-3天', color: 'text-amber-400', dotColor: 'bg-orange-500',
    duration: '预计2-3天', affectedRoute: '南海-马六甲海峡航线', affectedOrders: 6, dailyLoss: '$0.6万/天',
    aiSuggestion: '建议高时效订单切换空运备选方案，低时效订单延迟发船，避开台风影响窗口。',
  },
  {
    time: '05:30', level: '低', msg: '上海浦东机场货运区本周吞吐量环比下降5.2%', color: 'text-blue-400', dotColor: 'bg-blue-500',
    duration: '预计1-2周', affectedRoute: '华东-北美空运航线', affectedOrders: 3, dailyLoss: '$0.3万/天',
    aiSuggestion: '建议分流至杭州萧山、南京禄口机场，同时加强地面配送运力储备。',
  },
  {
    time: '04:12', level: '低', msg: '美元汇率波动，跨境运价预计小幅上调', color: 'text-blue-400', dotColor: 'bg-blue-500',
    duration: '预计1-2周', affectedRoute: '全球跨境运输', affectedOrders: 5, dailyLoss: '$0.2万/天',
    aiSuggestion: '建议锁定远期汇率合约，对短期订单增加3%运价浮动预算。',
  },
  {
    time: '02:45', level: '高', msg: '北美西海岸劳资谈判，预计港口作业效率下降30%', color: 'text-red-400', dotColor: 'bg-red-500',
    duration: '预计2-4周', affectedRoute: '美西-亚太跨太平洋航线', affectedOrders: 15, dailyLoss: '$2.1万/天',
    aiSuggestion: '建议启动美西航线绕行预案，经巴拿马运河至美东港口卸货，规避大面积延误。',
  },
];

// ================================================================
// Props 接口
// ================================================================

interface ComplianceSecurityViewProps {
  onNavigateToRoute?: (params: RouteOptimizationParams) => void;
}

// ================================================================
// 内部组件
// ================================================================

const ComplianceSecurityViewInner: React.FC<ComplianceSecurityViewProps> = ({ onNavigateToRoute }) => {
  const { showToast } = useToast();
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterLevel>('全部');
  const [resolvedSet, setResolvedSet] = useState<Set<number>>(new Set());

  // 筛选后的预警列表（已处置沉底）
  const filteredAlerts = alerts
    .map((a, i) => ({ ...a, originalIndex: i }))
    .filter(a => filter === '全部' || a.level === filter)
    .sort((a, b) => {
      const aResolved = resolvedSet.has(a.originalIndex);
      const bResolved = resolvedSet.has(b.originalIndex);
      if (aResolved === bResolved) return 0;
      return aResolved ? 1 : -1;
    });

  const handleCardClick = (cardFilter: FilterLevel) => {
    setFilter(cardFilter);
    showToast(`已筛选${cardFilter === '全部' ? '全部' : cardFilter + '风险'}预警`);
  };

  const handleConfirmReplan = () => {
    if (confirmIndex === null) return;
    showToast('已触发路径重规划，正在跳转至优化页面');
    setConfirmIndex(null);
    // 标记为已处置
    setResolvedSet(prev => new Set(prev).add(confirmIndex));
    // 延迟跳转
    setTimeout(() => {
      if (onNavigateToRoute) {
        onNavigateToRoute({
          riskWeight: 80,
          selectedScheme: 'robust',
        });
      }
    }, 500);
  };

  // 筛选标签配置
  const filterTabs: { label: FilterLevel; color: string }[] = [
    { label: '全部', color: 'text-text-secondary' },
    { label: '高', color: 'text-red-400' },
    { label: '中', color: 'text-amber-400' },
    { label: '低', color: 'text-blue-400' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-in fade-in duration-700 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center border border-red-500/20">
            <Globe size={18} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-text-primary uppercase tracking-widest">全球供应链风险预警</h2>
            <p className="text-[10px] text-text-muted font-bold mt-0.5">PPO 强化学习驱动 · 实时风险感知与主动防御</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <Shield size={14} className="text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">System Online</span>
        </div>
      </div>

      {/* Metrics Grid — 可点击筛选 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {riskMetrics.map((m, i) => (
          <div
            key={i}
            onClick={() => handleCardClick(m.filter)}
            className={`${m.bg} border ${m.border} rounded-2xl p-4 md:p-6 space-y-1 md:space-y-2 hover:brightness-125 hover:scale-[1.02] hover:border-opacity-50 transition-all duration-300 cursor-pointer`}
          >
            <span className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-widest">{m.label}</span>
            <div className="flex items-baseline gap-1 md:gap-2">
              <span className={`text-2xl md:text-3xl font-black ${m.color} italic tracking-tighter`}>{m.value}</span>
              <span className="text-[10px] md:text-xs text-text-muted font-bold">{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Panel */}
      <div className="bg-bg-secondary border border-border-default rounded-3xl p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">实时预警</span>
          </div>
          {/* 筛选标签栏 */}
          <div className="flex items-center gap-1.5">
            {filterTabs.map(tab => (
              <button
                key={tab.label}
                onClick={() => setFilter(tab.label)}
                className={`text-[10px] font-black px-2.5 py-1 rounded-full transition-all duration-300 cursor-pointer ${
                  filter === tab.label
                    ? 'bg-bg-tertiary ' + tab.color
                    : 'text-text-muted hover:text-text-secondary border border-border-default/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          {filteredAlerts.map((a) => {
            const isResolved = resolvedSet.has(a.originalIndex);
            return (
              <div
                key={a.originalIndex}
                className={`flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl border transition-all duration-300 ${
                  isResolved
                    ? 'bg-bg-tertiary/10 border-border-default/30 opacity-50'
                    : 'bg-bg-tertiary/20 border-border-default hover:bg-bg-tertiary/40'
                }`}
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.dotColor}`} />
                <span className="text-[10px] font-mono text-text-muted mt-0.5 shrink-0">{a.time}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-bg-tertiary shrink-0 ${a.color}`}>{a.level}</span>
                <p className={`text-[11px] md:text-xs font-medium leading-relaxed flex-1 ${isResolved ? 'text-text-muted' : 'text-text-secondary'}`}>{a.msg}</p>
                {/* 右侧操作区 */}
                <div className="flex items-center gap-2 shrink-0">
                  {isResolved ? (
                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400">
                      <CheckCircle size={12} />
                      已处置
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => setDetailIndex(a.originalIndex)}
                        className="text-[10px] font-bold text-text-muted hover:text-brand-primary transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                      >
                        详情
                      </button>
                      <button
                        onClick={() => setConfirmIndex(a.originalIndex)}
                        className="text-[10px] font-bold text-text-muted hover:text-orange-400 transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                      >
                        一键重规划
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {filteredAlerts.length === 0 && (
            <div className="text-center py-8 text-text-muted text-xs font-bold">暂无对应等级的预警</div>
          )}
        </div>
      </div>

      {/* Predictive Sandbox Engine */}
      <PredictiveSandbox />

      {/* 风险详情弹窗 */}
      {detailIndex !== null && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDetailIndex(null)}
        >
          <div
            className="bg-bg-secondary border border-border-default rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗标题 */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                  <AlertTriangle size={16} className="text-red-400" />
                </div>
                <p className="text-sm font-black text-text-primary uppercase tracking-widest">风险详情</p>
              </div>
              <button onClick={() => setDetailIndex(null)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* 基础信息区 */}
            <div className="space-y-2.5 mb-5">
              <label className="text-[10px] text-text-muted font-bold uppercase pl-1">基础信息</label>
              <div className="bg-bg-tertiary/30 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-text-muted font-bold">风险等级</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-bg-tertiary ${alerts[detailIndex].color}`}>{alerts[detailIndex].level}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-text-muted font-bold">发生时间</span>
                  <span className="text-[10px] font-mono text-text-secondary">{alerts[detailIndex].time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-text-muted font-bold">预计持续时长</span>
                  <span className="text-[10px] text-text-secondary font-bold">{alerts[detailIndex].duration}</span>
                </div>
              </div>
            </div>

            {/* 影响范围区 */}
            <div className="space-y-2.5 mb-5">
              <label className="text-[10px] text-text-muted font-bold uppercase pl-1">影响范围</label>
              <div className="bg-bg-tertiary/30 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-text-muted font-bold">受影响航线</span>
                  <span className="text-[10px] text-text-secondary font-bold">{alerts[detailIndex].affectedRoute}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-text-muted font-bold">受影响在途订单</span>
                  <span className="text-[10px] text-amber-400 font-black">{alerts[detailIndex].affectedOrders} 单</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-text-muted font-bold">预估每日损失</span>
                  <span className="text-[10px] text-red-400 font-black">{alerts[detailIndex].dailyLoss}</span>
                </div>
              </div>
            </div>

            {/* AI处置建议区 */}
            <div className="space-y-2.5 mb-6">
              <label className="text-[10px] text-text-muted font-bold uppercase pl-1">AI 处置建议</label>
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Info size={12} className="text-cyan-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-text-secondary font-bold leading-relaxed">{alerts[detailIndex].aiSuggestion}</p>
                </div>
              </div>
            </div>

            {/* 底部操作按钮 */}
            <div className="flex justify-between gap-3">
              <button
                onClick={() => setDetailIndex(null)}
                className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-xl text-xs font-black hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setDetailIndex(null);
                  setConfirmIndex(detailIndex);
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-black hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg shadow-orange-500/20"
              >
                一键重规划
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 二次确认弹窗 */}
      {confirmIndex !== null && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setConfirmIndex(null)}
        >
          <div
            className="bg-bg-secondary border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20">
                <AlertTriangle size={16} className="text-orange-400" />
              </div>
              <p className="text-sm font-black text-text-primary uppercase tracking-widest">确认重规划</p>
            </div>
            <p className="text-xs text-text-secondary mb-3 leading-relaxed">
              本次风险共影响 <span className="text-red-400 font-black">{alerts[confirmIndex].affectedOrders} 条在途订单</span>，确认触发全局路径重规划？
            </p>
            <p className="text-[10px] text-text-muted mb-6 leading-relaxed">
              系统将自动调高风险权重，生成鲁棒性备选方案。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmIndex(null)}
                className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-xl text-xs font-black hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleConfirmReplan}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-black hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg shadow-orange-500/20"
              >
                确认重规划
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ComplianceSecurityView: React.FC<ComplianceSecurityViewProps> = ({ onNavigateToRoute }) => {
  return (
    <ToastProvider>
      <ComplianceSecurityViewInner onNavigateToRoute={onNavigateToRoute} />
    </ToastProvider>
  );
};

export default ComplianceSecurityView;
