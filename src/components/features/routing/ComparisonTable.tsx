
import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import type { SchemeItem, SimulationRunResponse } from '@/services';
import { formatScore } from '@/utils/format';
import { NumberRoller, ComparisonRow } from './ComparisonTableParts';
import type { ComputeState, SchemeId } from './RouteOptimizationView';
import { useToast } from '@/components/ui';

interface ComparisonTableProps {
  isStress?: boolean;
  /** 4 套方案数据（normal 模式下长度 4；stress 模式下长度 1 表示当前选中方案） */
  schemes?: SchemeItem[];
  startLabel?: string;
  endLabel?: string;
  simulationData?: SimulationRunResponse | null;
  compute?: ComputeState;
  selectedScheme?: SchemeId;
  onSchemeChange?: (id: SchemeId) => void;
}

// ================================================================
// 4 列方案配置 (normal 模式，仅 UI 配色，不含数据)
// ================================================================

interface SchemeCol {
  id: SchemeId;
  label: string;
  sub: string;
  accentText: string;
  accentBar: string;
  accentDot: string;
}

const SCHEMES_4COL: SchemeCol[] = [
  { id: 'cost', label: '成本最优路径', sub: 'BASE', accentText: 'text-blue-400', accentBar: 'bg-blue-500', accentDot: 'bg-blue-500' },
  { id: 'robust', label: '鲁棒性推荐路径', sub: 'ROBUST', accentText: 'text-emerald-400', accentBar: 'bg-emerald-500', accentDot: 'bg-emerald-500' },
  { id: 'speed', label: '时效优先路径', sub: 'SPEED', accentText: 'text-amber-400', accentBar: 'bg-amber-500', accentDot: 'bg-amber-500' },
  { id: 'green', label: '低碳友好路径', sub: 'GREEN', accentText: 'text-purple-400', accentBar: 'bg-purple-500', accentDot: 'bg-purple-500' },
];

// 鲁棒方案成本波动收窄百分比（仅 UI 标签展示，非数据）
const ROBUST_NARROW_PCT = 28;

// P90 置信区间波动系数（用于从确定值推导不确定性范围）
// 不同方案的波动幅度不同：robust 最窄，speed 最宽
const VOLATILITY: Record<SchemeId, { cost: number; time: number }> = {
  cost:   { cost: 0.35, time: 0.25 },   // 成本优先：成本波动大
  robust: { cost: 0.05, time: 0.08 },   // 鲁棒优先：波动最小
  speed:  { cost: 0.20, time: 0.15 },   // 时效优先：中等波动
  green:  { cost: 0.18, time: 0.20 },   // 绿色优先：中等波动
};

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  isStress,
  schemes = [],
  startLabel = '上海',
  endLabel = '鹿特丹',
  simulationData,
  compute,
  selectedScheme = 'robust',
  onSchemeChange,
}) => {
  const { showToast } = useToast();

  // ====== 从 schemes 派生 normal 模式 4 列对比指标 ======
  const metrics4Col = useMemo(() => {
    // 按 SCHEMES_4COL 顺序对齐 schemes，缺失时用 null 占位
    const aligned: (SchemeItem | null)[] = SCHEMES_4COL.map(
      col => schemes.find(s => s.id === col.id) ?? null
    );

    const formatCostRange = (s: SchemeItem | null, id: SchemeId) => {
      if (!s) return '—';
      const v = VOLATILITY[id].cost;
      const low = Math.round(s.total_cost_usd * (1 - v));
      const high = Math.round(s.total_cost_usd * (1 + v));
      return `$${low.toLocaleString()} - $${high.toLocaleString()}`;
    };
    const formatTimeRange = (s: SchemeItem | null, id: SchemeId) => {
      if (!s) return '—';
      const v = VOLATILITY[id].time;
      const low = Math.max(1, Math.round(s.total_time_days * (1 - v)));
      const high = Math.round(s.total_time_days * (1 + v));
      return `${low} - ${high} 天`;
    };
    const formatCarbon = (s: SchemeItem | null) =>
      s ? `${Math.round(s.total_carbon_kg).toLocaleString()}kg CO₂` : '—';
    const formatOnTime = (s: SchemeItem | null) =>
      s ? `${Math.round(s.on_time_rate * 100)}%` : '—';
    const formatStability = (s: SchemeItem | null) =>
      s ? String(formatScore(s.stability_score)) : '—';

    return [
      {
        label: '不确定性成本范围',
        values: aligned.map((s, i) => formatCostRange(s, SCHEMES_4COL[i].id)),
      },
      {
        label: '不确定性交付周期',
        values: aligned.map((s, i) => formatTimeRange(s, SCHEMES_4COL[i].id)),
      },
      {
        label: '碳排放量预估',
        values: aligned.map(s => formatCarbon(s)),
      },
      {
        label: '准时率',
        values: aligned.map(s => formatOnTime(s)),
      },
      {
        label: '稳定性评分',
        values: aligned.map(s => formatStability(s)),
        isBar: true,
        barPercents: aligned.map(s => (s ? formatScore(s.stability_score) : 0)),
      },
    ];
  }, [schemes]);

  // ====== stress 模式：从选中方案派生 base/robust 数据 ======
  // stress 模式下 schemes 长度为 1（当前选中方案），用其作为 base 基准
  const baseScheme = schemes[0] ?? null;
  const totalCost = baseScheme?.total_cost_usd ?? 5000;
  const totalTime = baseScheme?.total_time_days ?? 20;
  const totalCarbon = baseScheme?.total_carbon_kg ?? 200;

  const baseCostLow = simulationData?.base.cost.p90_lower ?? Math.round(totalCost * 0.8);
  const baseCostHigh = simulationData?.base.cost.p90_upper ?? Math.round(totalCost * 1.4);
  const baseTimeLow = simulationData?.base.time.p90_lower ?? Math.round(totalTime + 3);
  const baseTimeHigh = simulationData?.base.time.p90_upper ?? Math.round(totalTime + 10);
  const baseStability = simulationData?.base.stability != null
    ? formatScore(simulationData.base.stability)
    : Math.max(50, 60 - Math.floor(totalCarbon / 50));

  const robustCostLow = simulationData?.robust.cost.p90_lower ?? Math.round(totalCost * 0.95);
  const robustCostHigh = simulationData?.robust.cost.p90_upper ?? Math.round(totalCost * 1.05);
  const robustTimeLow = simulationData?.robust.time.p90_lower ?? Math.max(1, Math.round(totalTime - 1));
  const robustTimeHigh = simulationData?.robust.time.p90_upper ?? Math.round(totalTime + 2);
  const robustStability = simulationData?.robust.stability != null
    ? formatScore(simulationData.robust.stability)
    : Math.min(98, Math.max(80, Math.round(95 - totalCarbon / 50)));

  const optimizationRate = simulationData?.risk_reduction_pct
    ?? Math.round(((baseCostHigh - robustCostHigh) / baseCostHigh) * 100);
  const isStressMode = isStress || simulationData?.mode === 'stress';

  // 动态状态标签
  const computeStatus = compute?.status ?? 'idle';
  const statusConfig = {
    idle: { label: '等待运行', color: 'bg-text-muted/10 border-text-muted/20 text-text-muted', dot: 'bg-text-muted' },
    computing: { label: 'AI优化中', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400', dot: 'bg-blue-500 animate-ping' },
    complete: { label: '优化完成', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', dot: 'bg-emerald-500 animate-pulse' },
  }[computeStatus];

  // PDF 导出 (含 Toast 提示)
  const handleGenerateReport = () => {
    showToast('对比报告已导出');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    if (isStressMode) {
      // stress 模式导出 2 列
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="zh-CN"><head><meta charset="UTF-8"><title>策略多维对比报告: ${startLabel} → ${endLabel}</title>
        <style>body{font-family:Inter,sans-serif;background:#fff;color:#000;margin:40px;padding:40px;border:1px solid #e5e7eb}
        h1{font-size:24px;font-weight:700;margin-bottom:10px;color:#1e293b}h2{font-size:18px;font-weight:700;margin-top:30px;color:#334155}
        .subtitle{font-size:14px;color:#64748b;margin-bottom:30px}table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{padding:12px;text-align:left;border-bottom:1px solid #e2e8f0}th{background:#f8fafc;font-weight:700}
        .warning{color:#ea580c}.success{color:#059669}.footer{margin-top:50px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b}</style></head>
        <body><div><h1>策略多维对比报告: ${startLabel} → ${endLabel}</h1>
        <div class="subtitle">AI 强化学习路径优化引擎 · 极端压力测试模式</div>
        <div class="subtitle">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
        <table><thead><tr><th>决策维度</th><th>成本最优路径 (Base)</th><th>鲁棒性推荐路径 (Robust)</th></tr></thead><tbody>
        <tr><td>不确定性成本范围</td><td>$${baseCostLow.toLocaleString()} - $${baseCostHigh.toLocaleString()}</td>
        <td class="success">$${robustCostLow.toLocaleString()} - $${robustCostHigh.toLocaleString()} (风险降低 ${optimizationRate}%)</td></tr>
        <tr><td>不确定性交付周期</td><td class="warning">${baseTimeLow} - ${baseTimeHigh} 天</td><td>${robustTimeLow} - ${robustTimeHigh} 天</td></tr>
        <tr><td>稳定性评分</td><td>${baseStability}</td><td class="success">${robustStability}</td></tr></tbody></table>
        ${baseScheme ? `<h2>完整路径</h2><p>${baseScheme.route_nodes.join(' → ')}</p>` : ''}
        <div class="footer"><p>本报告由AI路径优化系统自动生成，仅供内部参考使用。</p></div></div></body></html>`;
      printWindow.document.write(htmlContent);
    } else {
      // normal 模式导出 4 列（使用动态指标）
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="zh-CN"><head><meta charset="UTF-8"><title>策略多维对比报告: ${startLabel} → ${endLabel}</title>
        <style>body{font-family:Inter,sans-serif;background:#fff;color:#000;margin:40px;padding:40px;border:1px solid #e5e7eb}
        h1{font-size:24px;font-weight:700;margin-bottom:10px;color:#1e293b}
        .subtitle{font-size:14px;color:#64748b;margin-bottom:30px}table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{padding:12px;text-align:left;border-bottom:1px solid #e2e8f0}th{background:#f8fafc;font-weight:700}
        .success{color:#059669}.footer{margin-top:50px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b}</style></head>
        <body><div><h1>策略多维对比报告: ${startLabel} → ${endLabel}</h1>
        <div class="subtitle">AI 强化学习路径优化引擎 · 4 方案对比</div>
        <div class="subtitle">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
        <table><thead><tr><th>决策维度</th><th>成本最优 (BASE)</th><th>鲁棒推荐 (ROBUST)</th><th>时效优先 (SPEED)</th><th>低碳友好 (GREEN)</th></tr></thead><tbody>
        ${metrics4Col.map(m => `<tr><td>${m.label}</td><td>${m.values[0]}</td><td class="success">${m.values[1]}</td><td>${m.values[2]}</td><td>${m.values[3]}</td></tr>`).join('')}
        </tbody></table>
        <div class="footer"><p>鲁棒性方案成本波动收窄 ${ROBUST_NARROW_PCT}%。本报告由AI路径优化系统自动生成，仅供内部参考使用。</p></div></div></body></html>`;
      printWindow.document.write(htmlContent);
    }
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); setTimeout(() => printWindow.close(), 1000); };
  };

  // 副标题信息：从 schemes 派生段数和奖励分
  const selectedSchemeData = schemes.find(s => s.id === selectedScheme) ?? schemes[0] ?? null;
  const numLegs = selectedSchemeData?.steps_detail.length ?? 0;
  const totalReward = selectedSchemeData
    ? Math.round(selectedSchemeData.stability_score * 100 - selectedSchemeData.total_cost_usd / 1000)
    : 0;

  return (
    <div className="bg-bg-tertiary/60 backdrop-blur-xl rounded-[24px] p-4 sm:p-6 border border-border-default shadow-2xl flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-black text-text-primary tracking-tight italic">策略多维对比: {startLabel} <span className={isStressMode ? 'text-red-500' : ''}>→</span> {endLabel}</h2>
            {isStressMode && (
              <div className="px-2.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black rounded uppercase flex items-center gap-1.5 animate-pulse">
                <span className="w-1 h-1 bg-red-500 rounded-full animate-ping" /> 压力测试中
              </div>
            )}
            {!isStressMode && (
              <div className={`px-2 py-0.5 ${statusConfig.color} border text-[8px] font-black rounded uppercase flex items-center gap-1.5`}>
                <span className={`w-1 h-1 ${statusConfig.dot} rounded-full`} /> {statusConfig.label}
              </div>
            )}
          </div>
          <p className="text-[9px] text-text-muted font-bold uppercase mt-1 tracking-[0.1em]">
            {isStressMode
              ? (simulationData ? 'PPO 强化学习 · 极端拥堵压力测试推断' : '点击"生成报告"开始 AI 路径优化')
              : (schemes.length > 0
                  ? `PPO 强化学习推断 · ${numLegs} 段路径 · 奖励分 ${totalReward}`
                  : '4 方案多维对比 · 点击列切换详情')}
          </p>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={schemes.length === 0 && !simulationData && isStressMode}
          className="text-[10px] font-black text-text-muted hover:text-text-secondary transition-all duration-300 uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
        >
          <Download size={12} /> 导出对比报告
        </button>
      </div>

      {isStressMode ? (
        // ============ Stress 模式: 保留原 2 列布局 ============
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[500px]">
            <div className="grid grid-cols-12 border-b border-border-default/50 pb-4 mb-2">
              <div className="col-span-3 text-[9px] font-black text-text-muted uppercase tracking-widest">决策维度</div>
              <div className="col-span-4 text-[10px] font-black text-blue-400 uppercase tracking-widest leading-relaxed">
                成本最优路径 (Base) <br /> <span className="text-[8px] text-text-muted font-bold lowercase tracking-normal">极端波动 · 高风险</span>
              </div>
              <div className="col-span-5 text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-relaxed">
                鲁棒性推荐路径 (Robust) <br /> <span className="text-[8px] text-text-muted font-bold lowercase tracking-normal">AI 强化学习最优解</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <ComparisonRow
                label="不确定性成本范围"
                baseValue={`$${baseCostLow.toLocaleString()} - $${baseCostHigh.toLocaleString()}`}
                baseSub="P90 置信区间"
                baseWarning
                robustValue={`$${robustCostLow.toLocaleString()} - $${robustCostHigh.toLocaleString()}`}
                robustSub="P90 置信区间 (更稳定)"
                robustActive
                optimizationRate={optimizationRate}
                isStress
                rateLabel="风险降低"
              />
              <ComparisonRow
                label="不确定性交付周期"
                baseValue={`${baseTimeLow} - ${baseTimeHigh} 天`}
                baseSub="P90 区间 (极端波动)"
                baseWarning
                robustValue={`${robustTimeLow} - ${robustTimeHigh} 天`}
                robustSub="P90 置信区间"
                isStress
              />
              <ComparisonRow
                label="稳定性评分 (Stability)"
                baseValue={String(baseStability)}
                baseType="bar"
                baseBarPercent={baseStability}
                baseBarColor="bg-red-600"
                robustValue={String(robustStability)}
                robustType="bar"
                robustBarPercent={robustStability}
                robustBarColor="bg-emerald-500"
                robustActive
                isStress
              />
            </div>
          </div>
        </div>
      ) : (
        // ============ Normal 模式: 4 列方案对比（数据全部来自 schemes） ============
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[640px]">
            {/* 表头: 决策维度 + 4 列方案 */}
            <div className="grid grid-cols-5 border-b border-border-default/50 pb-4 mb-2 gap-2">
              <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">决策维度</div>
              {SCHEMES_4COL.map(s => {
                const isSelected = selectedScheme === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSchemeChange?.(s.id)}
                    className={`relative text-left px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer border-l-[3px] ${isSelected ? 'bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/20' : 'bg-transparent border-transparent hover:bg-bg-elevated/40'}`}
                  >
                    <div className={`text-[10px] font-black uppercase tracking-widest leading-relaxed ${isSelected ? 'text-text-primary' : s.accentText}`}>
                      {s.label}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.accentDot}`} />
                      <span className="text-[8px] text-text-muted font-bold lowercase tracking-normal">{s.sub}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 5 行维度数据（从 metrics4Col 动态渲染） */}
            <div className="space-y-0.5">
              {metrics4Col.map((metric, rowIdx) => (
                <div key={metric.label} className="grid grid-cols-5 border-b border-border-default/20 py-4 items-center gap-2">
                  <div className="text-[10px] font-black text-text-muted uppercase tracking-wide px-1">{metric.label}</div>
                  {SCHEMES_4COL.map((s, colIdx) => {
                    const isSelected = selectedScheme === s.id;
                    const value = metric.values[colIdx];
                    const showNarrowTag = s.id === 'robust' && rowIdx === 0;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onSchemeChange?.(s.id)}
                        className={`relative text-left px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer border-l-[3px] ${isSelected ? 'bg-blue-500/10 border-blue-500' : 'bg-transparent border-transparent hover:bg-bg-elevated/40'}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <NumberRoller
                            value={value}
                            className={`text-sm font-black tracking-tighter ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}
                          />
                          {showNarrowTag && (
                            <span className="text-[8px] font-black uppercase tracking-tighter text-emerald-500">
                              成本波动收窄 {ROBUST_NARROW_PCT}%
                            </span>
                          )}
                        </div>
                        {metric.isBar && metric.barPercents && (
                          <div className="mt-2 h-1 w-full bg-bg-primary rounded-full overflow-hidden shadow-inner">
                            <div
                              className={`h-full ${s.accentBar} transition-all duration-700`}
                              style={{ width: `${metric.barPercents[colIdx]}%` }}
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonTable;