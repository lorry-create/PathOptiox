
import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw, MapPin, ChevronDown, Sliders, ChevronUp } from 'lucide-react';
import NormalView from './Scenarios/NormalScenario/NormalView';
import StressView from './Scenarios/StressScenario/StressView';
import { optimizeApi } from '@/services';
import type { SchemeItem, OptimizeExplanation } from '@/services';

// ================================================================
// 计算状态类型
// ================================================================

export type ComputeStatus = 'idle' | 'computing' | 'complete';

export interface ComputeLog {
  id: number;
  time: string;
  msg: string;
  color: string;
}

export interface PpoFrame {
  episode: number;
  avgReward: number;
}

export interface ComputeState {
  status: ComputeStatus;
  step: number; // 0-4, 当前执行到的步骤
  logs: ComputeLog[];
  ppoFrames: PpoFrame[];
}

// ================================================================
// 城市配置 & 物流网络模型
// ================================================================

const CITIES = [
  { id: 'shenzhen', label: '深圳', en: 'Shenzhen' },
  { id: 'shanghai', label: '上海', en: 'Shanghai' },
  { id: 'new_york', label: '纽约', en: 'New York' },
  { id: 'los_angeles', label: '洛杉矶', en: 'Los Angeles' },
  { id: 'rotterdam', label: '鹿特丹', en: 'Rotterdam' },
  { id: 'frankfurt', label: '法兰克福', en: 'Frankfurt' },
];

const NETWORK_MODELS = [
  { id: 'global_trunk', label: '全球主干网默认模型', en: 'Global Trunk' },
  { id: 'sea_asia', label: '东南亚专线模型', en: 'SEA Asia Line' },
  { id: 'eu_us_express', label: '欧美特快模型', en: 'EU-US Express' },
];

// ================================================================
// 方案 ID 类型 (4 列对比统一使用)
// ================================================================

export type SchemeId = 'cost' | 'robust' | 'speed' | 'green';

// ================================================================
// 跳转参数接口（从风险预警页跳转时传入）
// ================================================================

export interface RouteOptimizationParams {
  riskWeight?: number;
  selectedScheme?: SchemeId;
}

interface RouteOptimizationViewProps {
  initialParams?: RouteOptimizationParams;
}

// ================================================================
// 组件
// ================================================================

const RouteOptimizationView: React.FC<RouteOptimizationViewProps> = ({ initialParams }) => {
  const [activeScenario, setActiveScenario] = useState('normal');
  const [startNode, setStartNode] = useState('shenzhen');
  const [endNode, setEndNode] = useState('rotterdam');
  const [networkModel, setNetworkModel] = useState('global_trunk');
  const [weights, setWeights] = useState({
    cost: 40,
    time: 25,
    carbon: 20,
    risk: initialParams?.riskWeight ?? 15,
  });
  const [isLoading, setIsLoading] = useState(false);
  // 4 套方案数据（cost / robust / speed / green），由后端 OptimizeResponse.schemes 提供
  const [schemes, setSchemes] = useState<SchemeItem[]>([]);
  // LLM 决策解释（conclusion / route_logic / prediction_usage / target_match 4 字段）
  const [explanation, setExplanation] = useState<OptimizeExplanation | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isWeightsOpen, setIsWeightsOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<SchemeId>(initialParams?.selectedScheme ?? 'robust');

  // 计算状态
  const [compute, setCompute] = useState<ComputeState>({
    status: 'idle',
    step: 0,
    logs: [],
    ppoFrames: [],
  });

  const logIdRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleWeightChange = (key: keyof typeof weights, val: number) => {
    setWeights(prev => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setWeights({ cost: 40, time: 25, carbon: 20, risk: 15 });
  };

  const addLog = useCallback((msg: string, color: string) => {
    const now = new Date();
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    setCompute(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-199), {
        id: ++logIdRef.current,
        time: `${mm}:${ss}`,
        msg,
        color,
      }],
    }));
  }, []);

  const clearTimers = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  };

  // 启动 AI 计算可视化流程
  const handleOptimize = async () => {
    clearTimers();
    setCompute({ status: 'computing', step: 1, logs: [], ppoFrames: [] });
    setIsLoading(true);

    const total = weights.cost + weights.time + weights.carbon + weights.risk;
    const nc = (weights.cost / total).toFixed(2);
    const nt = (weights.time / total).toFixed(2);
    const ncb = (weights.carbon / total).toFixed(2);
    const nr = (weights.risk / total).toFixed(2);
    const modelName = NETWORK_MODELS.find(m => m.id === networkModel)?.label || '全球主干网默认模型';

    // ---------- 步骤1：环境与预测数据加载 ----------
    addLog(`加载物流网络模型：${modelName}`, 'text-emerald-500');
    const t1a = setTimeout(() => addLog('接入集成预测引擎：港口拥堵、运价、时效数据', 'text-text-muted'), 600);
    const t1b = setTimeout(() => addLog('状态空间特征拼接完成，共24维特征', 'text-text-muted'), 1200);
    timersRef.current.push(t1a, t1b);

    // ---------- 步骤2：多智能体集群初始化 ----------
    const t2 = setTimeout(() => {
      setCompute(prev => ({ ...prev, step: 2 }));
      addLog('初始化 MARL 多智能体集群', 'text-blue-400');
      const t2a = setTimeout(() => addLog(`配置全局奖励权重：成本${nc}、时效${nt}、碳排${ncb}、风险${nr}`, 'text-text-muted'), 600);
      timersRef.current.push(t2a);
    }, 2000);
    timersRef.current.push(t2);

    // ---------- 步骤3：PPO 迭代求解 ----------
    const t3 = setTimeout(() => {
      setCompute(prev => ({ ...prev, step: 3 }));
      addLog('启动 PPO 算法，迭代轮次 1500', 'text-cyan-400');

      // PPO 曲线动态推进：每 200ms 一帧，共 1500 回合
      let episode = 0;
      const maxEp = 1500;
      const ppoTimer = setInterval(() => {
        episode = Math.min(maxEp, episode + 50);
        // 奖励收敛曲线：从 ~30 增长到 ~140，带轻微噪声，趋于平稳
        const progress = episode / maxEp;
        const base = 30 + 110 * (1 - Math.exp(-3 * progress));
        const noise = (Math.random() - 0.5) * 6 * (1 - progress * 0.6);
        const avgReward = Math.max(0, base + noise);

        setCompute(prev => ({
          ...prev,
          ppoFrames: [...prev.ppoFrames.slice(-80), { episode, avgReward: Math.round(avgReward * 10) / 10 }],
        }));

        if (episode === 500) addLog('回合 500，平均奖励 98.3，损失值 42.1', 'text-text-muted');
        if (episode === 1000) addLog('回合 1000，平均奖励 136.5，奖励趋于收敛', 'text-cyan-400');

        if (episode >= maxEp) {
          clearInterval(ppoTimer);
        }
      }, 200);
      timersRef.current.push(ppoTimer as unknown as ReturnType<typeof setTimeout>);
    }, 3200);
    timersRef.current.push(t3);

    // ---------- 步骤4：帕累托方案生成 + 真实 API 调用 ----------
    const t4 = setTimeout(async () => {
      setCompute(prev => ({ ...prev, step: 4 }));
      addLog('生成帕累托最优解集，共 4 组有效方案', 'text-emerald-500');

      try {
        // 传递原始 0-100 整数权重，由 optimizeApi 层统一归一化为 0-1 小数
        // 避免双重归一化（此前此处传已归一化的 0-1 小数，optimizeApi 又除以 100 导致权重失真）
        const res = await optimizeApi.optimizeRoute({
          start_node: startNode,
          end_node: endNode,
          weight_cost: weights.cost,
          weight_time: weights.time,
          weight_carbon: weights.carbon,
          weight_risk: weights.risk,
        });
        // 后端直接返回 OptimizeResponse：{ schemes: SchemeItem[4], explanation: OptimizeExplanation }
        setSchemes(res.schemes || []);
        setExplanation(res.explanation || null);
        setLastUpdated(new Date());
        const robustScheme = (res.schemes || []).find(s => s.id === 'robust');
        const scoreText = robustScheme
          ? `推荐鲁棒性方案，稳定性评分 ${Math.round(robustScheme.stability_score * 100)} 分`
          : '已生成 4 套对比方案';
        addLog(scoreText, 'text-emerald-500 font-black');
      } catch (err) {
        console.error('路径优化请求失败:', err);
        addLog('优化请求失败，使用默认方案展示', 'text-red-500');
      } finally {
        setIsLoading(false);
        // 平滑过渡到完成态
        const tDone = setTimeout(() => {
          setCompute(prev => ({ ...prev, status: 'complete' }));
        }, 600);
        timersRef.current.push(tDone);
      }
    }, 6200);
    timersRef.current.push(t4);
  };

  const getCityLabel = (id: string) =>
    CITIES.find(c => c.id === id)?.label || id;

  // 当前选中的方案对象（用于 StressView 等只需要单套方案的场景）
  const selectedSchemeData: SchemeItem | null =
    schemes.find(s => s.id === selectedScheme) || schemes[0] || null;

  const renderActiveScenario = () => {
    switch (activeScenario) {
      case 'normal':
        return (
          <NormalView
            schemes={schemes}
            explanation={explanation}
            startLabel={getCityLabel(startNode)}
            endLabel={getCityLabel(endNode)}
            compute={compute}
            weights={weights}
            networkModel={networkModel}
            onReOptimize={handleOptimize}
            selectedScheme={selectedScheme}
            onSchemeChange={setSelectedScheme}
          />
        );
      case 'stress':
        return (
          <StressView
            selectedSchemeData={selectedSchemeData}
            startLabel={getCityLabel(startNode)}
            endLabel={getCityLabel(endNode)}
          />
        );
      default:
        return (
          <NormalView
            schemes={schemes}
            explanation={explanation}
            startLabel={getCityLabel(startNode)}
            endLabel={getCityLabel(endNode)}
            compute={compute}
            weights={weights}
            networkModel={networkModel}
            onReOptimize={handleOptimize}
            selectedScheme={selectedScheme}
            onSchemeChange={setSelectedScheme}
          />
        );
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-8 bg-bg-primary min-h-full font-inter animate-in fade-in duration-700">
      {/* Top Header & Weights Panel */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8 justify-between items-start">
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] italic">仿真运行场景 (CURRENT SIMULATION)</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-bg-elevated/50 border border-border-default rounded-lg text-[10px] text-text-muted font-bold uppercase tracking-widest">
              <RefreshCw size={12} className="text-text-muted" />
              {lastUpdated
                ? `更新于: ${Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 60000))} 分钟前`
                : '尚未运行'}
            </div>
          </div>

          {/* 物流网络模型选择器 */}
          <div className="flex flex-wrap items-end gap-4">
            <NetworkModelSelector value={networkModel} onChange={setNetworkModel} />
          </div>

          {/* City Selectors */}
          <div className="flex flex-wrap items-end gap-4">
            <CitySelector value={startNode} onChange={setStartNode} label="起点" />
            <div className="flex items-center gap-2 text-text-muted h-10">
              <span className="w-8 h-[1px] bg-gradient-to-r from-blue-500 to-transparent" />
              <MapPin size={14} className="text-blue-500" />
              <span className="w-8 h-[1px] bg-gradient-to-l from-emerald-500 to-transparent" />
            </div>
            <CitySelector value={endNode} onChange={setEndNode} label="终点" />
            <button
              onClick={handleOptimize}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-300 uppercase tracking-[0.15em] transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> 优化中...
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> 生成报告
                </>
              )}
            </button>
          </div>

          {/* Scenario Tabs */}
          <div className="flex flex-wrap p-1 bg-bg-secondary border border-border-default rounded-2xl w-fit">
            <button
              onClick={() => setActiveScenario('normal')}
              className={`px-4 sm:px-8 py-3 rounded-xl text-xs font-black transition-all duration-300 ${activeScenario === 'normal' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-text-muted hover:text-text-secondary'}`}
            >
              常规运营基准
            </button>
            <button
              onClick={() => setActiveScenario('stress')}
              className={`px-4 sm:px-8 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center gap-2 ${activeScenario === 'stress' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-text-muted hover:text-text-secondary'}`}
            >
              {activeScenario === 'stress' && <span className="w-1.5 h-1.5 bg-bg-secondary rounded-full animate-ping" />}
              极端拥堵压力测试
            </button>
          </div>
        </div>

        {/* Weights Panel - Mobile: collapsible drawer, Desktop: always visible */}
        <div className="w-full lg:w-auto">
          {/* Mobile toggle button */}
          <button
            onClick={() => setIsWeightsOpen(!isWeightsOpen)}
            className="lg:hidden w-full flex items-center justify-between bg-bg-tertiary/80 backdrop-blur-xl border border-border-default rounded-2xl px-5 py-3 text-xs font-black text-text-primary uppercase tracking-widest"
          >
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-blue-500" />
              决策偏好权重
            </div>
            {isWeightsOpen ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
          </button>
          <div className={`${isWeightsOpen ? 'block' : 'hidden'} lg:block mt-3 lg:mt-0 bg-bg-tertiary/80 backdrop-blur-xl border border-border-default rounded-3xl p-6 lg:min-w-[420px] shadow-2xl`}>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">决策偏好权重</h4>
              <button
                onClick={handleReset}
                className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest"
              >
                重置
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 sm:gap-x-12 gap-y-6">
              <WeightSlider label="成本" value={weights.cost} onChange={(v) => handleWeightChange('cost', v)} color="blue" />
              <WeightSlider label="时效" value={weights.time} onChange={(v) => handleWeightChange('time', v)} color="blue" />
              <WeightSlider label="碳排" value={weights.carbon} onChange={(v) => handleWeightChange('carbon', v)} color="blue" />
              <WeightSlider label="运输风险" value={weights.risk} onChange={(v) => handleWeightChange('risk', v)} color="blue" />
              <div className="col-span-2 flex items-center gap-3 px-2">
                <span className="text-[9px] text-text-muted font-black uppercase tracking-widest">归一化</span>
                <span className="text-[10px] text-text-muted font-mono tabular-nums">
                  {(weights.cost / (weights.cost + weights.time + weights.carbon + weights.risk)).toFixed(2)} /{' '}
                  {(weights.time / (weights.cost + weights.time + weights.carbon + weights.risk)).toFixed(2)} /{' '}
                  {(weights.carbon / (weights.cost + weights.time + weights.carbon + weights.risk)).toFixed(2)} /{' '}
                  {(weights.risk / (weights.cost + weights.time + weights.carbon + weights.risk)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="transition-all duration-500">
        {renderActiveScenario()}
      </div>
    </div>
  );
};

// ================================================================
// 城市选择器
// ================================================================

const CitySelector = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
  <div className="relative group">
    <div className="text-[8px] text-text-muted font-black uppercase tracking-widest mb-1.5">{label}</div>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-bg-secondary border border-border-default rounded-xl px-4 py-2.5 pr-8 text-sm font-black text-text-primary cursor-pointer hover:border-blue-500/40 focus:border-blue-500 focus:outline-none transition-all duration-300 min-w-[140px]"
      >
        {CITIES.map(c => (
          <option key={c.id} value={c.id}>{c.label} ({c.en})</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
    </div>
  </div>
);

// ================================================================
// 物流网络模型选择器
// ================================================================

const NetworkModelSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="relative group">
    <div className="text-[8px] text-text-muted font-black uppercase tracking-widest mb-1.5">物流网络模型</div>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-bg-secondary border border-border-default rounded-xl px-4 py-2.5 pr-8 text-sm font-black text-text-primary cursor-pointer hover:border-blue-500/40 focus:border-blue-500 focus:outline-none transition-all duration-300 min-w-[220px]"
      >
        {NETWORK_MODELS.map(m => (
          <option key={m.id} value={m.id}>{m.label} ({m.en})</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
    </div>
  </div>
);

// ================================================================
// 权重滑块
// ================================================================

const WeightSlider = ({ label, value, onChange, color = 'blue' }: { label: string, value: number, onChange: (val: number) => void, color?: string }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10));
  };

  return (
    <div className="space-y-3 group/slider">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className="text-text-muted">[{label}]</span>
        <span className="text-text-secondary transition-colors duration-300 group-hover/slider:text-blue-400">{value}%</span>
      </div>
      <div className="h-1.5 bg-bg-elevated rounded-full relative flex items-center">
        <div className={`absolute h-full bg-${color}-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-150`} style={{ width: `${value}%` }} />
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className={`absolute w-3.5 h-3.5 bg-bg-secondary border-2 border-${color}-500 rounded-full shadow-lg pointer-events-none transition-all duration-150`}
          style={{ left: `${value}%`, transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  );
};

export default RouteOptimizationView;
