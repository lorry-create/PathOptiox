import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Zap, Timer } from 'lucide-react';
import { predictiveSandboxApi } from '@services';
import type { PredictionTimeData, RiskRadar, PreemptiveAction } from '@services';
import FutureRiskRadar from './FutureRiskRadar';
import PpoPreemptiveLog from './PpoPreemptiveLog';

const TIME_OPTIONS = [
  { offset: 0, label: '现在', sub: 'T+0h' },
  { offset: 24, label: '+24H', sub: 'T+24h' },
  { offset: 48, label: '+48H', sub: 'T+48h' },
  { offset: 72, label: '+72H', sub: 'T+72h' },
];

const MOCK_DATA_MAP: Record<number, PredictionTimeData> = {
  0: {
    offset_hours: 0,
    label: '当前态势',
    narrative: '基于PPO强化学习模型的实时分析显示，全球供应链整体风险处于可控区间。红海航线存在中等拥堵风险，建议持续监控；东南亚区域港口周转效率稳定，无需立即干预。',
    risks: [
      { id: 'r1', hazard_type: '气象异常', probability: 35, impact_region: '北太平洋航路', estimated_loss: '$18万/日', severity: 'LOW' },
      { id: 'r2', hazard_type: '港口拥堵', probability: 58, impact_region: '鹿特丹港 EU447-EU512', estimated_loss: '$34万/日', severity: 'MODERATE' },
      { id: 'r3', hazard_type: '政策变动', probability: 22, impact_region: '欧盟碳边境区', estimated_loss: '$50万/批', severity: 'MODERATE' },
      { id: 'r4', hazard_type: '运力波动', probability: 31, impact_region: '美元结算通道', estimated_loss: '$89万/周', severity: 'LOW' },
      { id: 'r5', hazard_type: '地缘风险', probability: 72, impact_region: '红海-苏伊士运河', estimated_loss: '$120万/日', severity: 'HIGH' },
    ],
    actions: [
      { id: 'a1', target_order: 'ORD-2026-0892', strategy: '好望角备选路线切换', cost_saved: '$1.2万', status: 'COMPLETED' },
      { id: 'a2', target_order: 'ORD-2026-0915', strategy: '鹿特丹港泊位预占', cost_saved: '$0.8万', status: 'COMPLETED' },
      { id: 'a3', target_order: 'ORD-2026-0933', strategy: '多式联运方案激活', cost_saved: '$1.5万', status: 'COMPLETED' },
      { id: 'a4', target_order: 'ORD-2026-0941', strategy: '碳配额提前锁定', cost_saved: '$0.6万', status: 'COMPLETED' },
      { id: 'a5', target_order: 'ORD-2026-0952', strategy: '欧洲港口罢工预案启动', cost_saved: '$2.1万', status: 'COMPLETED' },
      { id: 'a6', target_order: 'ORD-2026-0967', strategy: '燃油远期合约对冲', cost_saved: '$0.9万', status: 'COMPLETED' },
      { id: 'a7', target_order: 'ORD-2026-0978', strategy: '中欧班列运力预占', cost_saved: '$1.8万', status: 'COMPLETED' },
      { id: 'a8', target_order: 'ORD-2026-0985', strategy: '战略库存前置部署', cost_saved: '$0.7万', status: 'COMPLETED' },
      { id: 'a9', target_order: 'ORD-2026-0992', strategy: '替代供应商激活 (Tier-2)', cost_saved: '$1.3万', status: 'EXECUTING' },
      { id: 'a10', target_order: 'ORD-2026-1005', strategy: '客户预期管理 + SLA 协商', cost_saved: '$0.5万', status: 'EXECUTING' },
      { id: 'a11', target_order: 'ORD-2026-1018', strategy: '保险条款动态调整', cost_saved: '$0.4万', status: 'QUEUED' },
      { id: 'a12', target_order: 'ORD-2026-1027', strategy: '碳排放额度动态调配', cost_saved: '$0.8万', status: 'QUEUED' },
    ],
  },
  24: {
    offset_hours: 24,
    label: '+24H 预测',
    narrative: '未来24小时，鹿特丹港泊位紧张情况将加剧，拥堵概率升至68%，建议提前调整靠泊计划，启用备用内陆运输线路。',
    risks: [
      { id: 'r1', hazard_type: '气象异常', probability: 40, impact_region: '北太平洋 + 东亚沿海', estimated_loss: '$22万/日', severity: 'MODERATE' },
      { id: 'r2', hazard_type: '港口拥堵', probability: 68, impact_region: '鹿特丹港 + 安特卫普', estimated_loss: '$42万/日', severity: 'HIGH' },
      { id: 'r3', hazard_type: '政策变动', probability: 33, impact_region: '欧洲主要港口群', estimated_loss: '$68万/日', severity: 'MODERATE' },
      { id: 'r4', hazard_type: '运力波动', probability: 51, impact_region: '全球航运主干道', estimated_loss: '$110万/周', severity: 'HIGH' },
      { id: 'r5', hazard_type: '地缘风险', probability: 78, impact_region: '红海-苏伊士运河', estimated_loss: '$150万/日', severity: 'HIGH' },
    ],
    actions: [
      { id: 'a1', target_order: 'ORD-2026-1024', strategy: '紧急航线重规划 (好望角)', cost_saved: '$6.7万', status: 'EXECUTING' },
      { id: 'a2', target_order: 'ORD-2026-1038', strategy: '中欧班列分流启动', cost_saved: '$3.4万', status: 'QUEUED' },
      { id: 'a3', target_order: 'ORD-2026-1045', strategy: '燃油远期合约锁定', cost_saved: '$8.9万', status: 'COMPLETED' },
      { id: 'a4', target_order: 'ORD-2026-1052', strategy: '港口罢工应急预案就绪', cost_saved: '$12万', status: 'QUEUED' },
      { id: 'a5', target_order: 'ORD-2026-1067', strategy: '碳排放额度动态调配', cost_saved: '$3.1万', status: 'EXECUTING' },
    ],
  },
  48: {
    offset_hours: 48,
    label: '+48H 预测',
    narrative: '未来48小时，东南亚海域台风预警生效，南海航线时效延误风险上升至47%，建议部分高时效订单切换空运备选方案。',
    risks: [
      { id: 'r1', hazard_type: '气象异常', probability: 62, impact_region: '西北太平洋台风走廊', estimated_loss: '$35万/日', severity: 'MODERATE' },
      { id: 'r2', hazard_type: '港口拥堵', probability: 71, impact_region: '新加坡 + 鹿特丹 + 洛杉矶', estimated_loss: '$58万/日', severity: 'HIGH' },
      { id: 'r3', hazard_type: '政策变动', probability: 48, impact_region: '德国汉堡 + 英国费利克斯托', estimated_loss: '$92万/日', severity: 'HIGH' },
      { id: 'r4', hazard_type: '运力波动', probability: 28, impact_region: '半导体关键节点', estimated_loss: '$320万/批次', severity: 'CRITICAL' },
      { id: 'r5', hazard_type: '地缘风险', probability: 85, impact_region: '红海 + 阿曼湾', estimated_loss: '$210万/日', severity: 'CRITICAL' },
    ],
    actions: [
      { id: 'a1', target_order: 'ORD-2026-1102', strategy: '全局多式联运应急调度', cost_saved: '$14.5万', status: 'EXECUTING' },
      { id: 'a2', target_order: 'ORD-2026-1118', strategy: '战略库存前置部署', cost_saved: '$7.8万', status: 'COMPLETED' },
      { id: 'a3', target_order: 'ORD-2026-1125', strategy: '替代供应商激活 (Tier-2)', cost_saved: '$5.6万', status: 'QUEUED' },
      { id: 'a4', target_order: 'ORD-2026-1134', strategy: '保险条款动态调整', cost_saved: '$21万', status: 'EXECUTING' },
      { id: 'a5', target_order: 'ORD-2026-1141', strategy: '客户预期管理 + SLA 协商', cost_saved: '$9.2万', status: 'QUEUED' },
    ],
  },
  72: {
    offset_hours: 72,
    label: '+72H 远景',
    narrative: '未来72小时，北美西海岸劳资谈判风险升级，港口作业效率预计下降30%，建议启动美西航线绕行预案，规避大面积延误。',
    risks: [
      { id: 'r1', hazard_type: '气象异常', probability: 38, impact_region: '关键物流枢纽城市', estimated_loss: '$520万/月', severity: 'MODERATE' },
      { id: 'r2', hazard_type: '港口拥堵', probability: 75, impact_region: '全球主干港口网络', estimated_loss: '$280万/日', severity: 'CRITICAL' },
      { id: 'r3', hazard_type: '政策变动', probability: 36, impact_region: '跨境贸易合规框架', estimated_loss: '$80万/批', severity: 'HIGH' },
      { id: 'r4', hazard_type: '运力波动', probability: 75, impact_region: '全球主干航运网络', estimated_loss: '$450万/日', severity: 'HIGH' },
      { id: 'r5', hazard_type: '地缘风险', probability: 68, impact_region: '远东-欧洲燃料补给链', estimated_loss: '$280万/日', severity: 'CRITICAL' },
    ],
    actions: [
      { id: 'a1', target_order: 'ORD-2026-1201', strategy: '全球供应链重构计划启动', cost_saved: '$38万', status: 'EXECUTING' },
      { id: 'a2', target_order: 'ORD-2026-1215', strategy: '数字孪生平台采购立项', cost_saved: '$120万/年', status: 'QUEUED' },
      { id: 'a3', target_order: 'ORD-2026-1228', strategy: '战略合作伙伴风险共担协议', cost_saved: '$56万', status: 'COMPLETED' },
      { id: 'a4', target_order: 'ORD-2026-1235', strategy: '新能源船队优先调度', cost_saved: '$23万', status: 'QUEUED' },
      { id: 'a5', target_order: 'ORD-2026-1249', strategy: 'AI 预测模型迭代升级 v3.2', cost_saved: '$67万', status: 'EXECUTING' },
    ],
  },
};

const PredictiveSandbox: React.FC = () => {
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [data, setData] = useState<PredictionTimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const json = await predictiveSandboxApi.getPrediction(timeOffset);
      setData(json);
    } catch (err) {
      const fallback = MOCK_DATA_MAP[timeOffset] || MOCK_DATA_MAP[0];
      setData(fallback);
    } finally {
      setIsLoading(false);
    }
  }, [timeOffset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute progress along timeline (0, 33, 66, 100%)
  const progress = (timeOffset / 72) * 100;

  return (
    <div className="animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center border border-red-500/20">
            <Sparkles size={18} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black text-text-primary uppercase tracking-widest">未来态沙盘推演与主动防御引擎</h2>
            <p className="text-[10px] text-text-muted font-bold mt-0.5">PPO 强化学习驱动 · 全球供应链风险前瞻</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <Zap size={14} className="text-orange-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">PathOptix RL Engine</span>
        </div>
      </div>

      {/* Time Scrubber */}
      <div className="bg-bg-secondary border border-border-default rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Timer size={14} className="text-text-muted" />
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">时间轴</span>
        </div>

        {/* Timeline bar with progress */}
        <div className="relative">
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-orange-500 to-red-500 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Scrubber buttons */}
          <div className="grid grid-cols-4 gap-2 md:gap-0 md:flex md:justify-between">
            {TIME_OPTIONS.map((opt) => {
              const isActive = timeOffset === opt.offset;
              const isPast = timeOffset >= opt.offset;
              return (
                <button
                  key={opt.offset}
                  onClick={() => setTimeOffset(opt.offset)}
                  className={`
                    relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 cursor-pointer hover:-translate-y-0.5
                    ${isActive
                      ? 'bg-orange-500/15 border border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.2)]'
                      : isPast
                        ? 'bg-bg-tertiary/50 border border-border-default/40'
                        : 'bg-transparent border border-border-default/30 hover:border-border-default/60'
                    }
                  `}
                >
                  {/* Dot indicator */}
                  <div className={`
                    w-3 h-3 rounded-full border-2 transition-all duration-300
                    ${isActive
                      ? 'bg-orange-500 border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.6)]'
                      : isPast
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-bg-tertiary border-text-muted'
                    }
                  `} />
                  <span className={`text-xs font-black ${isActive ? 'text-orange-400' : 'text-text-muted'}`}>
                    {opt.label}
                  </span>
                  <span className="text-[8px] text-text-muted font-mono">{opt.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <SkeletonCard height="h-[480px]" />
          </div>
          <div className="lg:col-span-7">
            <SkeletonCard height="h-[480px]" />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-4">
            <div className="text-red-400 text-sm font-medium">{error}</div>
            <button
              onClick={fetchData}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* Data display */}
      {data && !isLoading && !error && (
        <div key={timeOffset} className="animate-in fade-in duration-500">
          {/* Narrative banner */}
          <div className="bg-gradient-to-r from-orange-500/5 to-red-500/5 border border-orange-500/20 rounded-2xl p-4 md:p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse mt-1.5 flex-shrink-0" />
              <p className="text-[12px] text-text-secondary font-bold leading-relaxed">
                {data.narrative}
              </p>
            </div>
          </div>

          {/* Two-panel layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <FutureRiskRadar risks={data.risks} currentTimeLabel={data.label} />
            </div>
            <div className="lg:col-span-7">
              <PpoPreemptiveLog actions={data.actions} currentTimeLabel={data.label} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SkeletonCard = ({ height = 'h-[360px]' }: { height?: string }) => (
  <div className={`${height} bg-bg-secondary border border-border-default rounded-3xl p-8 animate-pulse`}>
    <div className="flex items-center gap-3 mb-8">
      <div className="w-8 h-8 bg-bg-tertiary rounded-full" />
      <div className="h-4 w-32 bg-bg-tertiary rounded" />
    </div>
    <div className="space-y-4">
      <div className="h-3 bg-bg-tertiary/60 rounded w-full" />
      <div className="h-3 bg-bg-tertiary/60 rounded w-4/5" />
      <div className="h-3 bg-bg-tertiary/60 rounded w-3/5" />
      <div className="h-3 bg-bg-tertiary/60 rounded w-2/5" />
    </div>
  </div>
);

export default PredictiveSandbox;
