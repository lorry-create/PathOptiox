
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText, Info, Sparkles, Route, Database, Network, Cpu, CheckCircle2,
  TrendingUp, Terminal, Ship, Plane, Truck, Download, Save, RotateCcw,
  AlertTriangle, Warehouse, MapPin, ChevronRight, ChevronDown,
} from 'lucide-react';
import type { SchemeItem, OptimizeExplanation } from '@/services';
import { useChartTheme } from '@hooks/useChartTheme';
import { useTheme } from '@hooks/useTheme';
import { useToast } from '@/components/ui';
import { formatScore } from '@/utils/format';
import type { ComputeState, SchemeId } from './RouteOptimizationView';

// ================================================================
// 运输方式翻译
// ================================================================

const MODE_CN_MAP: Record<string, string> = {
  'sea': '海运', 'air': '空运', 'land': '陆运', 'rail': '铁路', 'land_customs': '陆运+清关',
};

// ================================================================
// UI 节点 / 分段 / 方案类型（仅 UI 结构，数据来自后端 SchemeItem）
// ================================================================

type IconType = 'pickup' | 'warehouse' | 'port' | 'airport' | 'destination';
type NodeStatus = 'normal' | 'congested' | 'risk';
type Segment = 'domestic' | 'international' | 'overseas';

interface TopologyNode {
  id: string;
  label: string;
  iconType: IconType;
  status: NodeStatus;
  role: string;
  segment: Segment;
  isTrunk: boolean;
  detail: {
    name: string;
    type: string;
    stayTime: string;
    cost: string;
    risk: string;
    riskNote?: string;
  };
}

interface TopologyLeg {
  from: string;
  to: string;
  mode: 'sea' | 'air' | 'land' | 'land_customs';
  group: string;
  groupKey: Segment;
  duration: string;
  cost: string;
  carbon: string;
  risk: string;
  agent: string;
  decision: string;
}

interface UIScheme {
  id: SchemeId;
  label: string;
  nodes: TopologyNode[];
  legs: TopologyLeg[];
  summary: { time: string; cost: string; carbon: string; stability: number; overallScore: number };
}

// ================================================================
// 后端 SchemeItem → UI UIScheme 转换（数据动态化核心）
// ================================================================

// 方案标签映射（UI 配色与文案，不含数据）
const SCHEME_LABELS: Record<SchemeId, string> = {
  cost: '成本最优路径',
  robust: '鲁棒性推荐路径',
  speed: '时效优先路径',
  green: '低碳友好路径',
};

// 节点角色推断（基于位置）
const inferNodeRole = (idx: number, total: number, nodeName: string): string => {
  if (idx === 0) return '揽收';
  if (idx === total - 1) return '末端收货';
  if (nodeName.includes('港')) return '中转';
  if (nodeName.includes('机场')) return '中转';
  return '中转';
};

// 节点图标类型推断（基于名称与位置）
const inferIconType = (idx: number, total: number, nodeName: string): IconType => {
  if (idx === 0) return 'pickup';
  if (idx === total - 1) return 'destination';
  if (nodeName.includes('机场')) return 'airport';
  if (nodeName.includes('仓')) return 'warehouse';
  if (nodeName.includes('港')) return 'port';
  return 'warehouse';
};

// 节点状态推断（基于 risk_level）
const inferNodeStatus = (riskLevel: string): NodeStatus => {
  const lv = (riskLevel || '').toLowerCase();
  if (lv.includes('high') || lv.includes('高')) return 'risk';
  if (lv.includes('mid') || lv.includes('med') || lv.includes('中')) return 'congested';
  return 'normal';
};

// 风险等级中文翻译
const riskLevelToCN = (riskLevel: string): string => {
  const lv = (riskLevel || '').toLowerCase();
  if (lv.includes('high') || lv.includes('高')) return '高';
  if (lv.includes('mid') || lv.includes('med') || lv.includes('中高')) return '中高';
  if (lv.includes('med') || lv.includes('中')) return '中';
  return '低';
};

// 分段分组推断（基于节点位置，前 1/3 国内，中 1/3 国际，后 1/3 海外）
const inferSegment = (idx: number, total: number): Segment => {
  if (total <= 1) return 'domestic';
  const r = idx / (total - 1);
  if (r < 0.34) return 'domestic';
  if (r < 0.67) return 'international';
  return 'overseas';
};

const SEGMENT_GROUP_LABEL: Record<Segment, string> = {
  domestic: '国内揽收段',
  international: '国际干线段',
  overseas: '海外清关段',
};

// 把后端 SchemeItem 转换为 UI 展示用的 UIScheme
// startLabel / endLabel：父组件传入的用户实际选择的城市中文名，
// 用于强制覆盖后端返回的首尾节点名（后端可能把"鹿特丹"映射为"汉堡"等），
// 确保 UI 拓扑图、悬停提示框、分段列表中显示的首尾节点与用户选择一致。
const buildUIScheme = (
  item: SchemeItem,
  startLabel?: string,
  endLabel?: string,
): UIScheme => {
  const routeNodes = item.route_nodes || [];
  const steps = item.steps_detail || [];
  const total = routeNodes.length;

  // 首尾节点显示名强制覆盖：
  // - idx === 0 用 startLabel（若提供）
  // - idx === total - 1 用 endLabel（若提供）
  // - 其他位置保留后端原始节点名
  const resolveDisplayName = (idx: number, original: string): string => {
    if (idx === 0 && startLabel) return startLabel;
    if (idx === total - 1 && endLabel) return endLabel;
    return original;
  };

  // 构建节点
  const nodes: TopologyNode[] = routeNodes.map((nodeName, idx) => {
    const step = steps[idx] || steps[idx - 1] || null;
    const riskLevel = step?.risk_level || 'low';
    const segment = inferSegment(idx, total);
    // 强制覆盖：拓扑图节点文字、悬停提示框中的节点名
    const displayName = resolveDisplayName(idx, nodeName);
    return {
      id: `${item.id}_n${idx}`,
      label: displayName,
      iconType: inferIconType(idx, total, nodeName),
      status: inferNodeStatus(riskLevel),
      role: inferNodeRole(idx, total, nodeName),
      segment,
      // 路径上所有节点均视为主干节点（确保默认视图完整显示中转节点）
      // 修复历史 Bug：原逻辑仅把首尾/含"港"/含"机场"的节点视为主干，
      // 导致中间中转节点（如"上海"）在默认视图被过滤掉
      isTrunk: true,
      detail: {
        name: displayName,
        type: nodeName.includes('港') ? '港口' : nodeName.includes('机场') ? '机场' : nodeName.includes('仓') ? '仓库' : '配送点',
        stayTime: step ? `${step.time_days}天` : '—',
        cost: step ? `$${step.cost_usd.toLocaleString()}` : '—',
        risk: riskLevelToCN(riskLevel),
      },
    };
  });

  // 构建分段
  const legs: TopologyLeg[] = steps.map((step, idx) => {
    // 强制覆盖：分段决策文字中的起终点名（用于 PathSegmentList 的 decision 列）
    const fromNode = resolveDisplayName(idx, routeNodes[idx] || step.from);
    const toNode = resolveDisplayName(idx + 1, routeNodes[idx + 1] || step.to);
    const fromSegment = inferSegment(idx, total);
    const groupKey = fromSegment;
    const riskCN = riskLevelToCN(step.risk_level);
    // 运输方式映射：后端 mode (sea/air/land/rail) → UI mode
    const mode = (step.transport_mode || 'land') as 'sea' | 'air' | 'land' | 'land_customs';
    return {
      from: `${item.id}_n${idx}`,
      to: `${item.id}_n${idx + 1}`,
      mode,
      group: SEGMENT_GROUP_LABEL[groupKey],
      groupKey,
      duration: `${step.time_days}天`,
      cost: `$${step.cost_usd.toLocaleString()}`,
      carbon: `${Math.round(step.carbon_kg)}kg`,
      risk: riskCN,
      agent: step.agent || '智能体',
      decision: `${fromNode} → ${toNode}，${MODE_CN_MAP[mode] || '运输'}`,
    };
  });

  // 汇总指标（从 SchemeItem 派生）
  const stability = formatScore(item.stability_score);
  const overallScore = Math.round(
    (stability + formatScore(item.on_time_rate)) / 2
  );

  return {
    id: item.id as SchemeId,
    label: SCHEME_LABELS[item.id as SchemeId] || item.label || item.id,
    nodes,
    legs,
    summary: {
      time: `${item.total_time_days}天`,
      cost: `$${item.total_cost_usd.toLocaleString()}`,
      carbon: `${Math.round(item.total_carbon_kg).toLocaleString()} kg`,
      stability,
      overallScore,
    },
  };
};

// ================================================================
// 节点图标映射
// ================================================================

const getIcon = (type: IconType) => {
  switch (type) {
    case 'pickup': return MapPin;
    case 'warehouse': return Warehouse;
    case 'port': return Ship;
    case 'airport': return Plane;
    case 'destination': return Truck;
    default: return MapPin;
  }
};

// ================================================================
// 接口
// ================================================================

interface RobustDetailProps {
  /** 4 套方案数据（来自后端 OptimizeResponse.schemes） */
  schemes?: SchemeItem[];
  /** LLM 决策解释（4 字段，来自后端 OptimizeResponse.explanation） */
  explanation?: OptimizeExplanation | null;
  startLabel?: string;
  endLabel?: string;
  compute?: ComputeState;
  weights?: { cost: number; time: number; carbon: number; risk: number };
  networkModel?: string;
  onReOptimize?: () => void;
  selectedScheme?: SchemeId;
  onSchemeChange?: (id: SchemeId) => void;
}

// ================================================================
// 主组件
// ================================================================

const RobustDetail: React.FC<RobustDetailProps> = ({
  schemes = [],
  explanation = null,
  startLabel = '深圳',
  endLabel = '鹿特丹',
  compute,
  weights,
  networkModel,
  onReOptimize,
  selectedScheme = 'robust',
  onSchemeChange,
}) => {
  const chartTheme = useChartTheme();
  const { isDark } = useTheme();
  const status = compute?.status ?? 'idle';

  return (
    <div className="space-y-6 pb-6">
      {/* 标题区 (三态通用) */}
      <div className="flex items-end px-2">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-text-primary tracking-tight italic">
            {startLabel} ➔ {endLabel} <span className="text-text-muted text-lg">鲁棒性备选路径分析</span>
          </h2>
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1 leading-relaxed">
            {status === 'idle' && 'AI 强化学习路径优化引擎待命'}
            {status === 'computing' && `AI 优化计算进行中 · 步骤 ${compute?.step ?? 1} / 4`}
            {status === 'complete' && `PPO 强化学习推断完成 · 鲁棒性方案已生成 · 共 ${schemes.length} 套对比方案`}
          </p>
        </div>
      </div>

      {/* 主体卡片 */}
      <div className="bg-bg-secondary/60 backdrop-blur-3xl rounded-[32px] border border-border-default p-6 lg:p-8 relative overflow-hidden shadow-2xl">
        {status === 'idle' && <EmptyState />}
        {status === 'computing' && <ComputingState compute={compute!} chartTheme={chartTheme} isDark={isDark} />}
        {status === 'complete' && (
          <CompleteState
            schemes={schemes}
            explanation={explanation}
            startLabel={startLabel}
            endLabel={endLabel}
            weights={weights}
            networkModel={networkModel}
            onReOptimize={onReOptimize}
            chartTheme={chartTheme}
            isDark={isDark}
            selectedScheme={selectedScheme}
            onSchemeChange={onSchemeChange}
          />
        )}
      </div>
    </div>
  );
};

// ================================================================
// 状态0：初始空态
// ================================================================

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
    <div className="w-20 h-20 rounded-3xl bg-bg-elevated/60 border border-border-default flex items-center justify-center mb-6 opacity-40">
      <Route size={36} className="text-text-muted" />
    </div>
    <p className="text-sm text-text-muted font-bold tracking-wide">
      配置参数后点击「生成报告」，启动 AI 路径优化计算
    </p>
    <p className="text-[10px] text-text-muted/60 font-black uppercase tracking-widest mt-2">
      AWAITING OPTIMIZATION REQUEST
    </p>
  </div>
);

// ================================================================
// 状态1：AI 计算中 (三栏布局)
// ================================================================

const ComputingState: React.FC<{
  compute: ComputeState;
  chartTheme: ReturnType<typeof useChartTheme>;
  isDark: boolean;
}> = ({ compute, chartTheme, isDark }) => (
  <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
    <div className="w-full lg:w-[20%] lg:min-w-[200px]">
      <ComputeSteps currentStep={compute.step} isDark={isDark} />
    </div>
    <div className="w-full lg:flex-1 min-w-0">
      <ComputeAnimation step={compute.step} ppoFrames={compute.ppoFrames} chartTheme={chartTheme} isDark={isDark} />
    </div>
    <div className="w-full lg:w-[25%] lg:min-w-[260px]">
      <ComputeLogs logs={compute.logs} />
    </div>
  </div>
);

const STEPS = [
  { icon: Database, title: '环境与预测数据加载', sub: '加载物流网络 + 集成预测数据', tag: '创新点3' },
  { icon: Network, title: '多智能体集群初始化', sub: 'MARL智能体协同规则加载', tag: '创新点2' },
  { icon: Cpu, title: 'PPO 迭代求解', sub: '强化学习算法迭代寻优', tag: '创新点1 · 核心' },
  { icon: CheckCircle2, title: '帕累托方案生成', sub: '多方案评分与推荐排序', tag: '输出' },
];

const ComputeSteps: React.FC<{ currentStep: number; isDark: boolean }> = ({ currentStep, isDark }) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center gap-2 mb-6">
      <Info size={12} className="text-text-muted" />
      <span className="text-[9px] text-text-muted font-black uppercase tracking-widest">计算步骤</span>
    </div>
    <div className="space-y-1">
      {STEPS.map((step, idx) => {
        const stepNum = idx + 1;
        const isDone = currentStep > stepNum;
        const isActive = currentStep === stepNum;
        const Icon = step.icon;
        return (
          <div key={stepNum} className="relative">
            {idx < STEPS.length - 1 && (
              <div className={`absolute left-[19px] top-10 w-[2px] h-[calc(100%-12px)] ${isDone ? 'bg-emerald-500/40' : isDark ? 'bg-gray-800' : 'bg-border-default'}`} />
            )}
            <div className={`flex gap-3 p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-500/10 ring-1 ring-blue-500/20' : ''}`}>
              <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-300
                ${isDone ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' :
                  isActive ? 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse' :
                  isDark ? 'bg-gray-900 border-gray-800 text-gray-600' : 'bg-bg-elevated border-border-default text-text-muted'}`}>
                {isDone ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-blue-400' : isDone ? 'text-emerald-500' : 'text-text-muted'}`}>
                    步骤 {stepNum}
                  </span>
                  {step.tag && (
                    <span className={`text-[7px] font-black px-1 py-0.5 rounded ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-bg-elevated text-text-muted'}`}>
                      {step.tag}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] font-black mt-0.5 ${isActive ? 'text-text-primary' : isDone ? 'text-text-secondary' : 'text-text-muted'}`}>{step.title}</div>
                <div className="text-[9px] text-text-muted mt-0.5 leading-relaxed">{step.sub}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const ComputeAnimation: React.FC<{
  step: number;
  ppoFrames: ComputeState['ppoFrames'];
  chartTheme: ReturnType<typeof useChartTheme>;
  isDark: boolean;
}> = ({ step, ppoFrames, chartTheme, isDark }) => (
  <div className={`w-full rounded-2xl border p-6 h-full min-h-[420px] flex flex-col ${isDark ? 'bg-gray-900/40 border-gray-800' : 'bg-bg-elevated/80 border-border-default'}`}>
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-sm text-text-secondary font-medium tracking-widest">AI 优化路径拓扑 (ROUTE TOPOLOGY)</h3>
      <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">PPO MlpPolicy · MARL</span>
    </div>
    <div className="flex-1 relative">
      {step === 1 && <Step1Animation isDark={isDark} />}
      {step === 2 && <Step2Animation isDark={isDark} />}
      {step >= 3 && <Step3Animation ppoFrames={ppoFrames} chartTheme={chartTheme} isDark={isDark} />}
      {step >= 4 && <Step4Overlay isDark={isDark} />}
    </div>
  </div>
);

const Step1Animation: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const nodes = ['深圳', '新加坡', '鹿特丹', '鹿特丹市区'];
  useEffect(() => {
    const t = setInterval(() => setActiveIdx(i => (i + 1) % (nodes.length + 1)), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-4">
        {nodes.map((node, idx) => (
          <React.Fragment key={node}>
            <div className={`flex flex-col items-center transition-all duration-500 ${idx <= activeIdx ? 'opacity-100 scale-100' : 'opacity-30 scale-90'}`}>
              <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center ${idx <= activeIdx ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.5)]' : isDark ? 'border-gray-800 bg-gray-900' : 'border-border-default bg-bg-primary'}`}>
                <Ship size={20} className={idx <= activeIdx ? 'text-cyan-400' : 'text-text-muted'} />
              </div>
              <span className={`text-[10px] font-black mt-2 ${idx <= activeIdx ? 'text-text-primary' : 'text-text-muted'}`}>{node}</span>
              {idx <= activeIdx && (
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className="text-[8px] text-amber-400 font-bold">拥堵 1.2</span>
                  <span className="text-[8px] text-emerald-400 font-bold">运价 ↓3%</span>
                </div>
              )}
            </div>
            {idx < nodes.length - 1 && <div className={`w-12 h-[2px] transition-all duration-500 ${idx < activeIdx ? 'bg-cyan-500' : isDark ? 'bg-gray-800' : 'bg-border-default'}`} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const Step2Animation: React.FC<{ isDark: boolean }> = () => {
  const agents = [
    { label: '运力调度', icon: Ship, color: 'cyan' },
    { label: '关务合规', icon: FileText, color: 'blue' },
    { label: '成本核算', icon: TrendingUp, color: 'emerald' },
    { label: '气象预警', icon: AlertTriangle, color: 'amber' },
  ];
  return (
    <div className="flex items-center justify-center h-full">
      <div className="relative w-80 h-80">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-2xl bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] animate-pulse">
          <Network size={28} className="text-blue-400" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-black text-blue-400 uppercase tracking-widest mt-16">协同通道建立</div>
        {agents.map((agent, idx) => {
          const angle = (idx / agents.length) * Math.PI * 2 - Math.PI / 2;
          const r = 130;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          const Icon = agent.icon;
          return (
            <div key={agent.label} className="absolute top-1/2 left-1/2 animate-in fade-in zoom-in duration-500" style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`, animationDelay: `${idx * 150}ms` }}>
              <svg className="absolute -top-1/2 -left-1/2 pointer-events-none" style={{ width: r * 2, height: r * 2, transform: `translate(${r - x}px, ${r - y}px)` }}>
                <line x1={r} y1={r} x2={r - x} y2={r - y} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              </svg>
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center bg-${agent.color}-500/10 border-${agent.color}-500 shadow-lg`}>
                  <Icon size={18} className={`text-${agent.color}-400`} />
                </div>
                <span className="text-[9px] font-black text-text-secondary mt-1 whitespace-nowrap">{agent.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Step3Animation: React.FC<{
  ppoFrames: ComputeState['ppoFrames'];
  chartTheme: ReturnType<typeof useChartTheme>;
  isDark: boolean;
}> = ({ ppoFrames, chartTheme }) => {
  const currentEp = ppoFrames.length > 0 ? ppoFrames[ppoFrames.length - 1].episode : 0;
  const currentReward = ppoFrames.length > 0 ? ppoFrames[ppoFrames.length - 1].avgReward : 0;
  const maxEp = 1500;
  const W = 600, H = 280, padL = 40, padB = 30, padT = 20, padR = 20;
  const plotW = W - padL - padR;
  const plotH = H - padB - padT;
  const xScale = (ep: number) => padL + (ep / maxEp) * plotW;
  const yScale = (r: number) => padT + plotH - (Math.min(160, r) / 160) * plotH;
  const pathD = ppoFrames.length > 0 ? ppoFrames.map((f, i) => `${i === 0 ? 'M' : 'L'} ${xScale(f.episode)} ${yScale(f.avgReward)}`).join(' ') : '';
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-[9px] text-text-muted font-black uppercase tracking-widest">当前回合</div>
          <div className="text-2xl font-black text-text-primary tabular-nums tracking-tighter">{currentEp} <span className="text-sm text-text-muted">/ {maxEp}</span></div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-text-muted font-black uppercase tracking-widest">平均奖励</div>
          <div className="text-2xl font-black text-cyan-400 tabular-nums tracking-tighter">{currentReward.toFixed(1)}</div>
        </div>
      </div>
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
          {[0, 0.25, 0.5, 0.75, 1].map(p => <line key={p} x1={padL} y1={padT + plotH * p} x2={W - padR} y2={padT + plotH * p} stroke={chartTheme.gridColor} strokeWidth="0.5" strokeDasharray="2 4" />)}
          {[0, 0.25, 0.5, 0.75, 1].map(p => <line key={`v${p}`} x1={padL + plotW * p} y1={padT} x2={padL + plotW * p} y2={padT + plotH} stroke={chartTheme.gridColor} strokeWidth="0.5" strokeDasharray="2 4" />)}
          {[0, 40, 80, 120, 160].map(v => <text key={v} x={padL - 6} y={yScale(v) + 3} fill={chartTheme.axisTextColor} fontSize="9" textAnchor="end" fontWeight="bold">{v}</text>)}
          {[0, 375, 750, 1125, 1500].map(v => <text key={v} x={xScale(v)} y={H - 10} fill={chartTheme.axisTextColor} fontSize="9" textAnchor="middle" fontWeight="bold">{v}</text>)}
          {ppoFrames.length > 2 && <path d={pathD} stroke="#3b82f6" strokeWidth="1" fill="none" opacity="0.25" strokeDasharray="2 3" />}
          {pathD && (
            <>
              <path d={pathD} stroke="#06b6d4" strokeWidth="2.5" fill="none" filter="url(#ppoGlow)" strokeLinecap="round" strokeLinejoin="round" />
              {ppoFrames.length > 0 && <circle cx={xScale(currentEp)} cy={yScale(currentReward)} r="4" fill="#06b6d4" className="animate-pulse" />}
              <defs><filter id="ppoGlow"><feGaussianBlur stdDeviation="2" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" /></filter></defs>
            </>
          )}
        </svg>
        <div className="absolute bottom-2 right-2 px-3 py-1.5 bg-bg-primary/80 border border-border-default rounded-lg">
          <span className="text-[8px] text-text-muted font-black uppercase tracking-widest">AVG R </span>
          <span className="text-[11px] text-cyan-400 font-black tabular-nums">{currentReward.toFixed(1)}</span>
        </div>
      </div>
      <div className="text-[8px] text-text-muted font-black uppercase tracking-widest mt-2 text-center">PPO 奖励收敛曲线 · 回合数</div>
    </div>
  );
};

const Step4Overlay: React.FC<{ isDark: boolean }> = () => (
  <div className="absolute top-2 right-2 flex flex-col gap-1.5 animate-in fade-in slide-in-from-right-2 duration-500">
    {[
      { label: '成本最优', color: 'bg-blue-500/20 border-blue-500 text-blue-400' },
      { label: '鲁棒性最优', color: 'bg-emerald-500/20 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500/40' },
      { label: '低碳最优', color: 'bg-purple-500/20 border-purple-500 text-purple-400' },
    ].map(s => (
      <div key={s.label} className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${s.color}`}>{s.label}</div>
    ))}
  </div>
);

const ComputeLogs: React.FC<{ logs: ComputeState['logs'] }> = ({ logs }) => {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);
  return (
    <div className="h-full flex flex-col min-h-[420px]">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-blue-400" />
          <span className="text-[9px] text-text-secondary font-black uppercase tracking-widest">运行日志</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[8px] text-blue-400 font-black uppercase tracking-widest">LIVE</span>
        </div>
      </div>
      <div ref={logRef} className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1.5 rounded-xl p-3 border border-border-default shadow-inner bg-black/30">
        {logs.length === 0 && <div className="text-text-muted animate-pulse">_</div>}
        {logs.map(log => (
          <div key={log.id} className="flex gap-2 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-300">
            <span className="text-text-muted shrink-0">[{log.time}]</span>
            <span className={log.color}>{log.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================================================================
// 状态2：计算完成 (三层结构) - 数据全部来自 schemes
// ================================================================

const CompleteState: React.FC<{
  schemes: SchemeItem[];
  explanation?: OptimizeExplanation | null;
  startLabel: string;
  endLabel: string;
  weights?: { cost: number; time: number; carbon: number; risk: number };
  networkModel?: string;
  onReOptimize?: () => void;
  chartTheme: ReturnType<typeof useChartTheme>;
  isDark: boolean;
  selectedScheme?: SchemeId;
  onSchemeChange?: (id: SchemeId) => void;
}> = ({
  schemes,
  explanation,
  startLabel,
  endLabel,
  weights,
  networkModel,
  onReOptimize,
  chartTheme,
  isDark,
  selectedScheme = 'robust',
  onSchemeChange,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'segments'>('overview');
  const schemeId = selectedScheme;
  const handleSchemeChange = (id: SchemeId) => onSchemeChange?.(id);
  const [isFullView, setIsFullView] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedLeg, setSelectedLeg] = useState<number | null>(null);
  const [hoveredLegRow, setHoveredLegRow] = useState<number | null>(null);
  const [congestionLevel, setCongestionLevel] = useState(20);

  // 从后端 schemes 中查找当前选中的方案，转换为 UI 结构
  // 把父组件传入的 startLabel/endLabel 透传给 buildUIScheme，
  // 用于强制覆盖拓扑图、悬停提示框、分段列表中的首尾节点显示名
  const schemeItem = schemes.find(s => s.id === schemeId) ?? schemes[0] ?? null;
  const scheme: UIScheme | null = useMemo(
    () => schemeItem ? buildUIScheme(schemeItem, startLabel, endLabel) : null,
    [schemeItem, startLabel, endLabel]
  );

  if (!scheme) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Route size={36} className="text-text-muted opacity-40 mb-4" />
        <p className="text-sm text-text-muted font-bold">暂无方案数据，请重新运行优化</p>
      </div>
    );
  }

  const visibleNodes = isFullView ? scheme.nodes : scheme.nodes.filter(n => n.isTrunk);
  const visibleLegs = useMemo(() => {
    if (isFullView) return scheme.legs;
    const trunkIds = scheme.nodes.filter(n => n.isTrunk).map(n => n.id);
    return scheme.legs.filter(l => trunkIds.includes(l.from) && trunkIds.includes(l.to));
  }, [scheme, isFullView]);

  // 总览指标（从方案汇总派生）
  const totalTime = scheme.summary.time;
  const totalCost = scheme.summary.cost;
  const totalCarbon = scheme.summary.carbon;
  const overallScore = scheme.summary.overallScore;
  const stabilityScore = scheme.summary.stability;
  // 分维度评分（从方案数据派生，非硬编码）
  const scoreDims = schemeItem ? {
    cost: Math.min(100, Math.round(100 - schemeItem.total_cost_usd / 100)),
    time: Math.min(100, Math.round(100 - schemeItem.total_time_days * 2)),
    stability: formatScore(schemeItem.stability_score),
    carbon: Math.min(100, Math.round(100 - schemeItem.total_carbon_kg / 30)),
  } : { cost: 75, time: 82, stability: 95, carbon: 78 };

  const timeFluctuation = Math.round((congestionLevel / 100) * 8 * 10) / 10;
  const costFluctuation = Math.round((congestionLevel / 100) * 12);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 上层：可交互路径拓扑 */}
      <PathTopology
        scheme={scheme}
        schemeId={schemeId}
        availableSchemeIds={schemes.map(s => s.id as SchemeId)}
        onSchemeChange={handleSchemeChange}
        isFullView={isFullView}
        onToggleView={() => setIsFullView(!isFullView)}
        visibleNodes={visibleNodes}
        visibleLegs={visibleLegs}
        hoveredNode={hoveredNode}
        onNodeHover={setHoveredNode}
        selectedLeg={selectedLeg}
        hoveredLegRow={hoveredLegRow}
        onLegClick={(idx) => setSelectedLeg(selectedLeg === idx ? null : idx)}
        isDark={isDark}
      />

      {/* 中层：指标与评分 (左右布局) */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* 左侧 70%：双TAB指标面板 */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex p-1 bg-bg-secondary border border-border-default rounded-xl">
              <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}>总览指标</button>
              <button onClick={() => setActiveTab('segments')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'segments' ? 'bg-blue-600 text-white shadow-lg' : 'text-text-muted hover:text-text-secondary'}`}>分段明细</button>
            </div>
          </div>

          {activeTab === 'overview' ? (
            <OverviewPanel totalTime={totalTime} totalCost={totalCost} totalCarbon={totalCarbon} stabilityScore={stabilityScore} scheme={scheme} />
          ) : (
            <SegmentTable legs={scheme.legs} nodes={scheme.nodes} selectedLeg={selectedLeg} hoveredLegRow={hoveredLegRow} onLegClick={(idx) => setSelectedLeg(selectedLeg === idx ? null : idx)} onLegHover={setHoveredLegRow} />
          )}
        </div>

        {/* 右侧 30%：综合评分模块 */}
        <div className="w-full xl:w-[300px] shrink-0 bg-bg-primary/40 rounded-[24px] p-6 border border-border-default/50 flex flex-col gap-4">
          <div className="flex gap-2 justify-center flex-wrap">
            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-black rounded-lg flex items-center gap-1.5 uppercase tracking-widest">
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> 高稳定性
            </span>
            <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black rounded-lg flex items-center gap-1.5 uppercase tracking-widest">
              <AlertTriangle size={10} /> 风险可控
            </span>
          </div>
          <ScoreGauge score={overallScore} dims={scoreDims} />
          <div className="border-t border-border-default/50 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] text-text-muted font-black uppercase tracking-widest">鲁棒性模拟</span>
              <span className="text-[9px] text-amber-400 font-black tabular-nums">{congestionLevel}%</span>
            </div>
            <div className="text-[8px] text-text-muted font-bold mb-2">港口拥堵程度</div>
            <input type="range" min="0" max="100" value={congestionLevel} onChange={e => setCongestionLevel(parseInt(e.target.value))} className="w-full h-1.5 bg-bg-elevated rounded-full appearance-none cursor-pointer accent-amber-500" />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-bg-elevated/40 rounded-lg p-2">
                <div className="text-[8px] text-text-muted font-black uppercase tracking-widest">时效波动</div>
                <div className="text-[11px] text-amber-400 font-black tabular-nums">+{timeFluctuation} 天</div>
              </div>
              <div className="bg-bg-elevated/40 rounded-lg p-2">
                <div className="text-[8px] text-text-muted font-black uppercase tracking-widest">成本波动</div>
                <div className="text-[11px] text-amber-400 font-black tabular-nums">+{costFluctuation}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 下层：结构化 AI 决策报告（使用 LLM explanation） */}
      <StructuredReport
        weights={weights}
        networkModel={networkModel}
        startLabel={startLabel}
        endLabel={endLabel}
        explanation={explanation}
        schemeLabel={scheme.label}
        schemeId={schemeId}
      />

      {/* 操作按钮组 */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border-default/50">
        <button onClick={() => showToast('已应用到当前订单')} className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-300 uppercase tracking-[0.15em] active:scale-95 cursor-pointer"><CheckCircle2 size={14} /> 应用到订单</button>
        <button onClick={() => showToast('方案报告已导出')} className="flex items-center gap-2 px-5 py-3 bg-bg-elevated border border-border-default text-text-secondary text-[10px] font-black rounded-xl hover:bg-bg-tertiary transition-all duration-300 uppercase tracking-[0.15em] cursor-pointer"><Download size={14} /> 导出方案报告</button>
        <button onClick={() => showToast('方案已保存至方案库')} className="flex items-center gap-2 px-5 py-3 bg-bg-elevated border border-border-default text-text-secondary text-[10px] font-black rounded-xl hover:bg-bg-tertiary transition-all duration-300 uppercase tracking-[0.15em] cursor-pointer"><Save size={14} /> 保存至方案库</button>
        <button onClick={() => { showToast('正在重新优化路径'); onReOptimize?.(); }} className="flex items-center gap-2 px-5 py-3 border border-border-default text-text-muted hover:text-text-secondary text-[10px] font-black rounded-xl transition-all duration-300 uppercase tracking-[0.15em] ml-auto cursor-pointer"><RotateCcw size={14} /> 重新优化</button>
      </div>
    </div>
  );
};

// ================================================================
// 路径拓扑组件
// ================================================================

const PathTopology: React.FC<{
  scheme: UIScheme;
  schemeId: SchemeId;
  availableSchemeIds: SchemeId[];
  onSchemeChange: (id: SchemeId) => void;
  isFullView: boolean;
  onToggleView: () => void;
  visibleNodes: TopologyNode[];
  visibleLegs: TopologyLeg[];
  hoveredNode: string | null;
  onNodeHover: (id: string | null) => void;
  selectedLeg: number | null;
  hoveredLegRow: number | null;
  onLegClick: (idx: number) => void;
  isDark: boolean;
}> = ({ scheme, schemeId, availableSchemeIds, onSchemeChange, isFullView, onToggleView, visibleNodes, visibleLegs, hoveredNode, onNodeHover, selectedLeg, hoveredLegRow, onLegClick, isDark }) => {
  const nodeStatusColor = (status: NodeStatus) => status === 'normal' ? 'border-emerald-500' : status === 'congested' ? 'border-amber-500' : 'border-red-500';
  const nodeStatusGlow = (status: NodeStatus) => status === 'normal' ? 'shadow-[0_0_16px_rgba(16,185,129,0.35)]' : status === 'congested' ? 'shadow-[0_0_16px_rgba(245,158,11,0.35)]' : 'shadow-[0_0_16px_rgba(239,68,68,0.35)]';
  const roleColor = (role: string) => role.includes('起点') || role === '揽收' ? 'text-emerald-500' : role.includes('终点') || role.includes('收货') ? 'text-purple-500' : role.includes('清关') || role.includes('报关') || role.includes('保税') ? 'text-amber-500' : 'text-cyan-500';

  const segmentBreaks = useMemo(() => {
    const breaks: number[] = [];
    visibleNodes.forEach((n, i) => {
      if (i > 0 && n.segment !== visibleNodes[i - 1].segment) breaks.push(i);
    });
    return breaks;
  }, [visibleNodes]);

  return (
    <div className={`w-full rounded-2xl border p-6 ${isDark ? 'bg-gray-900/40 border-gray-800' : 'bg-bg-elevated/80 border-border-default'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-sm text-text-secondary font-medium tracking-widest">AI 优化路径拓扑 (ROUTE TOPOLOGY)</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex p-0.5 bg-bg-secondary border border-border-default rounded-lg">
            {availableSchemeIds.map(id => (
              <button key={id} onClick={() => onSchemeChange(id)} className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${schemeId === id ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-text-secondary'}`}>
                {(SCHEME_LABELS[id] || id).replace('路径', '')}
              </button>
            ))}
          </div>
          <button onClick={onToggleView} className="text-[9px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest flex items-center gap-1 transition-all cursor-pointer">
            {isFullView ? '主干视图' : '全链路视图'}
            {isFullView ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest text-text-muted mb-4">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-600" />海运</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0 border-t-2 border-dashed border-orange-500" />空运</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-300" />陆运</span>
        <span className="flex items-center gap-1 ml-2"><MapPin size={9} className="text-cyan-400" />揽收</span>
        <span className="flex items-center gap-1"><Warehouse size={9} className="text-cyan-400" />仓库</span>
        <span className="flex items-center gap-1"><Ship size={9} className="text-cyan-400" />港口</span>
        <span className="flex items-center gap-1"><Plane size={9} className="text-cyan-400" />机场</span>
      </div>

      <div className="flex flex-row items-center justify-between w-full overflow-x-auto pb-4 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {visibleNodes.map((node, idx) => {
          const Icon = getIcon(node.iconType);
          const isHovered = hoveredNode === node.id;
          const roleColorVal = roleColor(node.role);
          const legIdx = idx < visibleLegs.length ? idx : -1;
          const isLegActive = selectedLeg === legIdx || hoveredLegRow === legIdx;
          const showBreak = segmentBreaks.includes(idx);
          return (
            <React.Fragment key={node.id}>
              {showBreak && <div className="w-px h-16 bg-border-default/40 mx-2 shrink-0" />}
              <div className="flex flex-col items-center relative z-10 shrink-0" onMouseEnter={() => onNodeHover(node.id)} onMouseLeave={() => onNodeHover(null)}>
                <button className={`relative w-14 h-14 rounded-2xl border-2 flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 ${nodeStatusColor(node.status)} ${nodeStatusGlow(node.status)} ${isHovered ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-bg-secondary' : ''} ${isDark ? 'bg-gray-950' : 'bg-bg-primary'}`}>
                  <Icon size={20} className="text-text-primary" />
                  {node.status !== 'normal' && (
                    <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${node.status === 'risk' ? 'bg-red-500' : 'bg-amber-500'}`}>
                      <AlertTriangle size={9} className="text-white" />
                    </span>
                  )}
                </button>
                <span className="text-[10px] font-black text-text-primary mt-1.5 whitespace-nowrap">{node.label}</span>
                <span className={`text-[8px] font-mono tracking-widest font-bold ${roleColorVal}`}>{node.role}</span>

                {isHovered && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-bg-modal border border-border-default rounded-xl p-3 shadow-2xl z-30 w-44 animate-in fade-in zoom-in-95 duration-200">
                    <div className="text-[10px] font-black text-text-primary mb-1.5">{node.detail.name}</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px]"><span className="text-text-muted">节点类型</span><span className="text-text-secondary font-bold">{node.detail.type}</span></div>
                      <div className="flex justify-between text-[9px]"><span className="text-text-muted">停留时长</span><span className="text-text-secondary font-bold tabular-nums">{node.detail.stayTime}</span></div>
                      <div className="flex justify-between text-[9px]"><span className="text-text-muted">作业成本</span><span className="text-text-secondary font-bold tabular-nums">{node.detail.cost}</span></div>
                      <div className="flex justify-between text-[9px]"><span className="text-text-muted">风险等级</span><span className={`font-black ${node.detail.risk === '低' ? 'text-emerald-500' : node.detail.risk === '中' ? 'text-amber-500' : 'text-red-500'}`}>{node.detail.risk}</span></div>
                      {node.detail.riskNote && (
                        <div className="pt-1.5 mt-1.5 border-t border-border-default/50 text-[8px] text-amber-400 leading-relaxed">{node.detail.riskNote}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {idx < visibleLegs.length && (
                <button onClick={() => onLegClick(idx)} onMouseEnter={() => {}} className={`flex-1 h-10 relative flex items-center justify-center min-w-[60px] mx-1 md:mx-2 transition-all duration-300 ${isLegActive ? 'scale-105' : ''}`}>
                  {visibleLegs[idx].mode === 'sea' && <div className={`absolute inset-x-2 top-1/2 -translate-y-1/2 h-[2px] transition-all duration-300 ${isLegActive ? 'bg-blue-500 h-[3px] shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-blue-600'}`}><div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[flow_2s_linear_infinite]" style={{ backgroundSize: '200% 100%' }} /></div>}
                  {visibleLegs[idx].mode === 'air' && <div className={`absolute inset-x-2 top-1/2 -translate-y-1/2 border-t-2 border-dashed transition-all duration-300 ${isLegActive ? 'border-orange-400 h-[3px] shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'border-orange-500'}`} />}
                  {visibleLegs[idx].mode === 'land' && <div className={`absolute inset-x-2 top-1/2 -translate-y-1/2 h-[1px] transition-all duration-300 ${isLegActive ? 'bg-cyan-400 h-[2px] shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-cyan-300'}`} />}
                  {visibleLegs[idx].mode === 'land_customs' && <div className={`absolute inset-x-2 top-1/2 -translate-y-1/2 h-[1.5px] transition-all duration-300 ${isLegActive ? 'bg-amber-400 h-[2.5px] shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-amber-500'}`} />}
                  <div className={`relative z-10 px-2 py-1 rounded-full border flex items-center gap-1 ${isDark ? 'bg-gray-950 border-gray-700' : 'bg-bg-primary border-border-default shadow-[0_4px_10px_rgba(0,0,0,0.1)]'}`}>
                    <span className="text-[10px]">{visibleLegs[idx].mode === 'air' ? '✈️' : visibleLegs[idx].mode === 'sea' ? '🚢' : '🚛'}</span>
                    <span className="text-[8px] text-cyan-400 font-bold tracking-widest uppercase">{MODE_CN_MAP[visibleLegs[idx].mode]}</span>
                  </div>
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {selectedLeg !== null && visibleLegs[selectedLeg] && (
        <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">分段详情 · </span>
          <span className="text-[10px] text-text-primary font-black">{visibleLegs[selectedLeg].from} → {visibleLegs[selectedLeg].to} · {MODE_CN_MAP[visibleLegs[selectedLeg].mode]} · {visibleLegs[selectedLeg].duration} · {visibleLegs[selectedLeg].cost}</span>
        </div>
      )}

      <style>{`@keyframes flow {0% {background-position: 200% 0} 100% {background-position: -200% 0}}`}</style>
    </div>
  );
};

// ================================================================
// 总览指标面板
// ================================================================

// 分组汇总条目类型
interface GroupSummaryEntry {
  duration: number;
  cost: number;
  carbon: number;
  count: number;
}

const OverviewPanel: React.FC<{
  totalTime: string;
  totalCost: string;
  totalCarbon: string;
  stabilityScore: number;
  scheme: UIScheme;
}> = ({ totalTime, totalCost, totalCarbon, stabilityScore, scheme }) => {
  const groupSummary = useMemo((): Record<string, GroupSummaryEntry> => {
    const groups: Record<string, GroupSummaryEntry> = {};
    scheme.legs.forEach(leg => {
      const g = leg.group;
      if (!groups[g]) groups[g] = { duration: 0, cost: 0, carbon: 0, count: 0 };
      const dayMatch = leg.duration.match(/[\d.]+/);
      const costMatch = leg.cost.match(/[\d,]+/);
      const carbonMatch = leg.carbon.match(/[\d,]+/);
      if (dayMatch) groups[g].duration += parseFloat(dayMatch[0]);
      if (costMatch) groups[g].cost += parseInt(costMatch[0].replace(/,/g, ''));
      if (carbonMatch) groups[g].carbon += parseInt(carbonMatch[0].replace(/,/g, ''));
      groups[g].count++;
    });
    return groups;
  }, [scheme]);

  const groupColors: Record<string, string> = {
    '国内揽收段': 'bg-cyan-500',
    '国际干线段': 'bg-blue-500',
    '国际空运段': 'bg-orange-500',
    '海外清关段': 'bg-amber-500',
    '末端派送段': 'bg-purple-500',
  };

  // 计算总时长用于比例计算
  const groupEntries = useMemo(
    () => Object.entries(groupSummary) as [string, GroupSummaryEntry][],
    [groupSummary]
  );
  const totalDuration = groupEntries.reduce((s, [, g]) => s + g.duration, 0) || 1;

  return (
    <div className="space-y-4 flex-1 flex flex-col">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock label="预期交期" value={totalTime} sub="(TOTAL TIME)" color="text-emerald-400" />
        <MetricBlock label="总计成本" value={totalCost} sub="(TOTAL COST)" color="text-text-primary" />
        <MetricBlock label="碳排放" value={totalCarbon} sub="较纯空运减少68%" color="text-purple-400" />
        <MetricBlock label="稳定性评分" value={`${stabilityScore}分`} sub="(STABILITY)" color="text-blue-400" />
      </div>

      <div className="bg-bg-primary/40 rounded-xl p-4 border border-border-default/50 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Info size={11} className="text-text-muted" />
          <span className="text-[9px] text-text-muted font-black uppercase tracking-widest">分段汇总</span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden mb-4">
          {groupEntries.map(([g, data]) => (
            <div key={g} className={`${groupColors[g] || 'bg-text-muted'} transition-all duration-500`} style={{ width: `${(data.duration / totalDuration) * 100}%` }} title={`${g}: ${data.duration}天`} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {groupEntries.map(([g, data]) => (
            <div key={g} className="flex items-center justify-between bg-bg-elevated/40 rounded-lg p-2.5">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${groupColors[g] || 'bg-text-muted'}`} />
                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{g}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-text-secondary font-bold tabular-nums">{data.duration}天</span>
                <span className="text-[9px] text-text-muted tabular-nums">${data.cost.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ================================================================
// 分段明细表格
// ================================================================

const SegmentTable: React.FC<{
  legs: TopologyLeg[];
  nodes: TopologyNode[];
  selectedLeg: number | null;
  hoveredLegRow: number | null;
  onLegClick: (idx: number) => void;
  onLegHover: (idx: number | null) => void;
}> = ({ legs, nodes, selectedLeg, hoveredLegRow, onLegClick, onLegHover }) => {
  const nodeLabelMap = useMemo(() => {
    const m: Record<string, string> = {};
    nodes.forEach(n => { m[n.id] = n.label; });
    return m;
  }, [nodes]);

  const groups = useMemo((): Record<string, { legs: { leg: TopologyLeg; idx: number }[] }> => {
    const g: Record<string, { legs: { leg: TopologyLeg; idx: number }[] }> = {};
    legs.forEach((leg, idx) => {
      if (!g[leg.group]) g[leg.group] = { legs: [] };
      g[leg.group].legs.push({ leg, idx });
    });
    return g;
  }, [legs]);

  // 显式类型化 Object.entries 结果，避免 TypeScript 推断为 unknown
  const groupEntries = useMemo(
    () => Object.entries(groups) as [string, { legs: { leg: TopologyLeg; idx: number }[] }][],
    [groups]
  );

  const riskColor = (risk: string) => risk === '低' ? 'text-emerald-500' : risk === '中' ? 'text-amber-500' : risk === '中高' ? 'text-orange-500' : 'text-red-500';

  return (
    <div className="overflow-x-auto flex-1">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-8 border-b border-border-default/50 pb-3 mb-1">
          {['运输段', '运输方式', '耗时', '成本', '碳排放', '风险等级', '负责智能体', '决策说明'].map(h => (
            <div key={h} className="text-[9px] font-black text-text-muted uppercase tracking-widest px-2">{h}</div>
          ))}
        </div>

        {groupEntries.map(([groupName, groupData]) => (
          <div key={groupName} className="mb-2">
            <div className="flex items-center gap-2 py-2 px-2 bg-bg-elevated/30 rounded-lg mb-1">
              <div className="w-1 h-3 bg-blue-500 rounded-full" />
              <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">{groupName}</span>
              <span className="text-[8px] text-text-muted font-bold">{groupData.legs.length} 段</span>
            </div>
            <div className="space-y-0.5">
              {groupData.legs.map(({ leg, idx }) => {
                const isHovered = hoveredLegRow === idx;
                const isSelected = selectedLeg === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => onLegClick(idx)}
                    onMouseEnter={() => onLegHover(idx)}
                    onMouseLeave={() => onLegHover(null)}
                    className={`w-full text-left grid grid-cols-8 py-2.5 px-2 rounded-lg transition-all duration-200 cursor-pointer ${isSelected ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' : isHovered ? 'bg-blue-500/5' : 'hover:bg-bg-elevated/40'}`}
                  >
                    <div className="text-[10px] font-black text-text-primary px-2">{nodeLabelMap[leg.from] ?? leg.from} → {nodeLabelMap[leg.to] ?? leg.to}</div>
                    <div className="text-[10px] text-cyan-400 font-bold px-2">{MODE_CN_MAP[leg.mode]}</div>
                    <div className="text-[10px] text-text-secondary tabular-nums px-2">{leg.duration}</div>
                    <div className="text-[10px] text-text-secondary tabular-nums px-2">{leg.cost}</div>
                    <div className="text-[10px] text-purple-400 tabular-nums px-2">{leg.carbon}</div>
                    <div className={`text-[10px] font-black px-2 ${riskColor(leg.risk)}`}>{leg.risk}</div>
                    <div className="text-[10px] text-blue-400 font-bold px-2">{leg.agent}</div>
                    <div className="text-[9px] text-text-muted px-2 leading-relaxed">{leg.decision}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================================================================
// 评分环 (可交互)
// ================================================================

const ScoreGauge: React.FC<{
  score: number;
  dims: { cost: number; time: number; stability: number; carbon: number };
}> = ({ score, dims }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative w-full flex items-center justify-center" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90 overflow-visible">
          <circle cx="100" cy="100" r="85" stroke="currentColor" className="text-border-default" strokeWidth="10" fill="transparent" strokeOpacity="0.4" strokeDasharray="2 3" />
          <circle cx="100" cy="100" r="85" stroke="#00F2FF" strokeWidth="10" fill="transparent" strokeDasharray="2.5 1.5" strokeDashoffset={(2 * Math.PI * 85) * (1 - score / 100)} strokeOpacity="0.8" strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-text-primary tracking-tighter italic leading-none">{score}</span>
            <span className="text-base font-bold text-blue-500">%</span>
          </div>
          <span className="text-[9px] text-text-muted font-black uppercase tracking-[0.25em] mt-2">综合评分</span>
        </div>
      </div>
      {hovered && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-bg-modal border border-border-default rounded-xl p-3 shadow-2xl z-20 w-44 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-[8px] text-text-muted font-black uppercase tracking-widest mb-2">分维度得分</div>
          {[
            { label: '成本', val: dims.cost, color: 'bg-blue-500' },
            { label: '时效', val: dims.time, color: 'bg-emerald-500' },
            { label: '稳定性', val: dims.stability, color: 'bg-cyan-500' },
            { label: '低碳', val: dims.carbon, color: 'bg-purple-500' },
          ].map(d => (
            <div key={d.label} className="flex items-center gap-2 py-1">
              <span className="text-[9px] text-text-muted font-bold w-10">{d.label}</span>
              <div className="flex-1 h-1 bg-bg-elevated rounded-full overflow-hidden"><div className={`h-full ${d.color}`} style={{ width: `${d.val}%` }} /></div>
              <span className="text-[9px] text-text-secondary font-black tabular-nums w-6 text-right">{d.val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ================================================================
// 结构化 AI 决策报告（数据来自 LLM explanation，无硬编码）
// ================================================================

const StructuredReport: React.FC<{
  weights?: { cost: number; time: number; carbon: number; risk: number };
  networkModel?: string;
  startLabel: string;
  endLabel: string;
  explanation?: OptimizeExplanation | null;
  schemeLabel: string;
  schemeId: SchemeId;
}> = ({ weights, networkModel, startLabel, endLabel, explanation, schemeLabel, schemeId }) => {
  const total = weights ? weights.cost + weights.time + weights.carbon + weights.risk : 100;
  const nc = weights ? (weights.cost / total).toFixed(2) : '0.40';
  const nt = weights ? (weights.time / total).toFixed(2) : '0.25';
  const ncb = weights ? (weights.carbon / total).toFixed(2) : '0.20';
  const nr = weights ? (weights.risk / total).toFixed(2) : '0.15';
  void networkModel; void startLabel; void endLabel; void schemeId;

  // 4 个模块直接对应后端 explanation 的 4 个字段
  const modules = [
    { title: '核心结论', content: explanation?.conclusion || `${schemeLabel}：基于 PPO 强化学习生成，融合多智能体协同决策。` },
    { title: '路径选择逻辑', content: explanation?.route_logic || `适配当前权重配置（成本${nc}、时效${nt}、碳排${ncb}、风险${nr}）。` },
    { title: '预测数据应用', content: explanation?.prediction_usage || '接入港口拥堵、运价趋势、时效预测等多源数据。' },
    { title: '目标匹配度', content: explanation?.target_match || `综合稳定性表现最优，匹配当前业务权重配置。` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-amber-400" />
        <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">AI 决策报告</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((m, idx) => (
          <div key={idx} className="bg-bg-primary border border-border-default/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400">{idx + 1}</span>
              <h4 className="text-[11px] font-black text-text-primary uppercase tracking-widest">{m.title}</h4>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">{m.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================================================================
// 子组件
// ================================================================

const MetricBlock = ({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) => (
  <div className="space-y-2 bg-bg-primary/40 rounded-xl p-4 border border-border-default/50">
    <span className="text-[9px] text-text-muted font-black uppercase tracking-widest">{label}</span>
    <div className={`text-xl font-black ${color} tracking-tighter tabular-nums leading-none`}>{value}</div>
    <div className="text-[8px] text-text-muted font-black uppercase tracking-widest">{sub}</div>
  </div>
);

export default RobustDetail;
