
import React, { useState, useCallback } from 'react';
import { RefreshCw, Activity, Terminal, Sliders, Download } from 'lucide-react';
import ComparisonTable from '../../ComparisonTable';
import SensitivityChart from '../../SensitivityChart';
import PressureMap from '../../PressureMap';
import { simulationApi } from '@/services';
import type { SimulationRunResponse, SchemeItem } from '@/services';

interface StressViewProps {
  /** 当前选中的方案数据（用于压力仿真输入） */
  selectedSchemeData?: SchemeItem | null;
  startLabel?: string;
  endLabel?: string;
}

const StressView: React.FC<StressViewProps> = ({ selectedSchemeData, startLabel = '上海', endLabel = '鹿特丹' }) => {
  const [simData, setSimData] = useState<SimulationRunResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // 获取选中方案的 RL 基础数据（用于压力仿真输入）
  const rlCost = selectedSchemeData?.total_cost_usd ?? 5000;
  const rlTime = selectedSchemeData?.total_time_days ?? 20;
  const rlCarbon = selectedSchemeData?.total_carbon_kg ?? 200;

  const handleRunStressSim = useCallback(async () => {
    setIsSimulating(true);
    setShowCompleteModal(false);
    try {
      const res = await simulationApi.runSimulation({
        mode: 'stress',
        rl_cost: rlCost,
        rl_time: rlTime,
        rl_carbon: rlCarbon,
      });
      setSimData(res);
    } catch (err) {
      console.error('[StressView] 仿真请求失败:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [rlCost, rlTime, rlCarbon]);

  // 侧边栏权重 + 日志
  const [weights, setWeights] = useState({ time: 40, cost: 30, resilience: 30 });
  const [isRunning, setIsRunning] = useState(false);
  const [tempWeights, setTempWeights] = useState(weights);

  const handleRerun = () => {
    setIsRunning(true);
    setShowCompleteModal(false);
    const interval = setInterval(() => {
      setTempWeights({
        time: Math.max(0, Math.min(100, weights.time + Math.floor(Math.random() * 11) - 5)),
        cost: Math.max(0, Math.min(100, weights.cost + Math.floor(Math.random() * 11) - 5)),
        resilience: Math.max(0, Math.min(100, weights.resilience + Math.floor(Math.random() * 11) - 5)),
      });
    }, 200);
    setTimeout(() => {
      clearInterval(interval);
      setIsRunning(false);
      setTempWeights(weights);
      handleRunStressSim();
    }, 4000);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 lg:gap-8 animate-in slide-in-from-right-4 duration-500">
      <div className="xl:col-span-9 space-y-4 md:space-y-6 lg:space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-2xl lg:text-4xl font-black text-text-primary tracking-tighter">
                策略多维对比: {startLabel} <span className="text-red-500">→</span> {endLabel}
              </h2>
              <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black rounded flex items-center gap-1.5 uppercase tracking-widest animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" /> 高风险模拟中
              </div>
            </div>
            <p className="text-xs text-text-muted font-bold uppercase tracking-[0.2em] mt-3 italic">EXTREME CONGESTION STRESS ANALYSIS</p>
          </div>
        </div>

        {/* Core: Comparison Table with simulation data */}
        {isSimulating ? (
          <div className="bg-bg-tertiary/60 backdrop-blur-xl rounded-[24px] p-6 border border-border-default shadow-2xl h-[320px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw size={28} className="text-red-400 animate-spin" />
              <span className="text-sm text-red-400 font-black uppercase tracking-widest">极端压力仿真运行中...</span>
              <span className="text-[10px] text-text-muted font-mono">Monte Carlo N=5000 迭代</span>
            </div>
          </div>
        ) : (
          <ComparisonTable
            isStress
            schemes={selectedSchemeData ? [selectedSchemeData] : []}
            startLabel={startLabel}
            endLabel={endLabel}
            simulationData={simData}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          <SensitivityChart isStress />
          <PressureMap isStress />
        </div>
      </div>

      {/* Right sidebar */}
      <div className="xl:col-span-3 space-y-4 md:space-y-6 lg:space-y-10">
        {/* Sidebar Weights */}
        <div className="bg-bg-secondary/60 border border-border-default p-6 sm:p-8 rounded-[32px] shadow-2xl">
          <div className="flex items-center gap-3 mb-10">
            <Sliders size={20} className="text-red-500" />
            <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">决策偏好权重</h3>
          </div>

          <div className="space-y-4 md:space-y-6 lg:space-y-10">
            <SidebarSlider label="时间周期 (TIME)" value={isRunning ? tempWeights.time : weights.time} onChange={(v) => setWeights(prev => ({ ...prev, time: v }))} color="cyan" badge="AUTO-BOOSTED" />
            <SidebarSlider label="运输成本 (COST)" value={isRunning ? tempWeights.cost : weights.cost} onChange={(v) => setWeights(prev => ({ ...prev, cost: v }))} color="red" />
            <SidebarSlider label="履约韧性 (RESILIENCE)" value={isRunning ? tempWeights.resilience : weights.resilience} onChange={(v) => setWeights(prev => ({ ...prev, resilience: v }))} color="red" />
          </div>

          <div className="mt-12 space-y-4">
            <button
              onClick={handleRerun}
              disabled={isRunning || isSimulating}
              className="w-full py-5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-lg shadow-red-600/20 transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 uppercase tracking-[0.2em] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isRunning || isSimulating ? (
                <><RefreshCw size={18} fill="currentColor" className="animate-spin" /> 仿真中...</>
              ) : (
                <><Activity size={18} fill="currentColor" /> 极端压力测试</>
              )}
            </button>
            <button className="w-full py-5 border border-border-default text-text-muted hover:text-text-secondary text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-3 uppercase tracking-[0.2em]">
              <Download size={18} /> 导出压力报告 (PDF)
            </button>
          </div>
        </div>

        {/* Simulation Log */}
        <div className="bg-bg-primary border border-border-default p-6 sm:p-8 rounded-[32px] min-h-[280px] sm:h-[350px] flex flex-col shadow-inner">
          <div className="flex justify-between items-center mb-6 border-b border-border-default pb-4">
            <div className="flex items-center gap-2 text-text-muted">
              <Terminal size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">实时模拟日志 (CONSOLE)</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 scrollbar-hide opacity-80 leading-relaxed">
            <LogEntry time="14:20:11" color="text-emerald-500" msg='INIT: Scenario "Extreme_Congestion_v3" loaded.' />
            <LogEntry time="14:20:13" color="text-text-muted" msg="WARP: Running Monte Carlo iterations (5000/5000)..." />
            <LogEntry time="14:20:16" color="text-red-500" msg="ALERT: Port congestion reaches 220% capacity threshold." />
            <LogEntry time="14:20:19" color="text-cyan-400" msg={`STABLE: PPO robust path — cost range $${simData?.robust.cost.p90_lower?.toLocaleString() ?? '...'} - $${simData?.robust.cost.p90_upper?.toLocaleString() ?? '...'}`} />
            <LogEntry time="14:20:22" color="text-amber-400" msg="BASE WARN: Cost volatility spike detected (±40%)." />
            {simData && (
              <LogEntry time="14:20:25" color="text-emerald-400" msg={`RESULT: Risk reduction ${simData.risk_reduction_pct}% — PPO engine resilient under stress.`} />
            )}
            <div className="animate-pulse text-text-primary mt-4">_</div>
          </div>
        </div>
      </div>

      {/* Complete modal */}
      {showCompleteModal && simData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-bg-secondary border border-border-default rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <Activity size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-text-primary uppercase tracking-widest">极端仿真已完成</h3>
              <p className="text-text-muted text-sm">
                PPO 引擎在极端拥堵下风险抵御能力 <span className="text-emerald-400 font-black">{simData.risk_reduction_pct}%</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                  <div className="text-[9px] text-text-muted font-bold uppercase">Base 波动范围</div>
                  <div className="text-sm font-black text-red-400 mt-1">
                    ${simData.base.cost.p90_lower.toLocaleString()} - ${simData.base.cost.p90_upper.toLocaleString()}
                  </div>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                  <div className="text-[9px] text-text-muted font-bold uppercase">Robust 稳定区间</div>
                  <div className="text-sm font-black text-emerald-400 mt-1">
                    ${simData.robust.cost.p90_lower.toLocaleString()} - ${simData.robust.cost.p90_upper.toLocaleString()}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowCompleteModal(false)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all duration-300 active:scale-95">
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ================================================================
// 侧边滑块
// ================================================================

const SidebarSlider = ({ label, value, onChange, color, badge }: { label: string; value: number; onChange: (v: number) => void; color: string; badge?: string }) => (
  <div className="space-y-4 group/slider">
    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
      <span className="text-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`${badge ? 'text-cyan-400' : 'text-text-secondary'} transition-colors duration-300 group-hover/slider:text-text-primary`}>{value}%</span>
        {badge && <span className="px-1.5 py-0.5 bg-cyan-400/10 text-cyan-400 rounded-sm text-[8px]">{badge}</span>}
      </div>
    </div>
    <div className="h-1 bg-bg-elevated rounded-full relative flex items-center">
      <div className={`absolute h-full bg-${color}-400 rounded-full transition-all duration-150`} style={{ width: `${value}%` }} />
      <input type="range" min="0" max="100" value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
      <div className={`absolute w-3.5 h-3.5 bg-${color}-400 border-2 border-white rounded-full pointer-events-none shadow-lg transition-all duration-150`} style={{ left: `${value}%`, transform: 'translateX(-50%)' }} />
    </div>
  </div>
);

// ================================================================
// 日志行
// ================================================================

const LogEntry = ({ time, color, msg }: any) => (
  <div className="flex gap-4 group">
    <span className="text-text-primary shrink-0">[{time}]</span>
    <span className={`${color} group-hover:brightness-125 transition-all duration-300`}>{msg}</span>
  </div>
);

export default StressView;
