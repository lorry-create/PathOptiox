
import React, { useState, useEffect } from 'react';
import { BarChart3, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/components/ui';

const ModelEval: React.FC = () => {
  const { showToast } = useToast();
  // 动态数据
  const [successRate, setSuccessRate] = useState(88);
  const [stability, setStability] = useState(92);
  const [avgReward, setAvgReward] = useState(142.5);
  const [convergence, setConvergence] = useState(0.87);

  // 模拟数据波动（每 8 秒微调一次）
  useEffect(() => {
    const timer = setInterval(() => {
      setSuccessRate(prev => Math.min(99, Math.max(78, prev + (Math.random() - 0.4) * 2)));
      setStability(prev => Math.min(98, Math.max(80, prev + (Math.random() - 0.4) * 2)));
      setAvgReward(prev => Math.min(180, Math.max(120, prev + (Math.random() - 0.45) * 3)));
      setConvergence(prev => Math.min(0.99, Math.max(0.75, prev + (Math.random() - 0.4) * 0.01)));
    }, 8000);

    return () => clearInterval(timer);
  }, []);

  const fmt = (n: number, d: number) => Number(n.toFixed(d));

  // 稳定性等级
  const stabilityLevel = stability >= 90 ? '高度稳定' : stability >= 80 ? '稳定' : '波动中';
  const stabilityColor = stability >= 90 ? 'text-cyan-400 bg-cyan-500/10' : stability >= 80 ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10';

  // 成功率趋势
  const successTrend = successRate >= 88;
  // 平均奖励趋势
  const rewardTrend = avgReward >= 140;

  return (
    <div className="bg-bg-secondary rounded-2xl p-4 md:p-5 border border-border-default flex flex-col gap-4 md:gap-5 flex-1">
      <div className="flex items-center gap-2 text-text-secondary">
        <BarChart3 size={16} className="text-cyan-400" />
        <span className="text-xs font-bold tracking-wider uppercase">模型评估</span>
      </div>

      <div className="space-y-4">
        {/* 成功率 */}
        <div className="bg-bg-modal rounded-xl p-4 border border-border-default flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">成功率</span>
            {successTrend ? (
              <TrendingUp size={12} className="text-emerald-400" />
            ) : (
              <TrendingDown size={12} className="text-amber-400" />
            )}
          </div>
          <span className={`text-xl font-black ${successRate >= 85 ? 'text-emerald-400' : 'text-amber-400'} tabular-nums`}>
            {fmt(successRate, 0)}%
          </span>
        </div>

        {/* 稳定性 */}
        <div className="bg-bg-modal rounded-xl p-4 border border-border-default flex justify-between items-center">
          <span className="text-xs text-text-muted">稳定性</span>
          <span className={`text-xs font-bold px-2 py-1 rounded ${stabilityColor}`}>
            {stabilityLevel} {fmt(stability, 0)}%
          </span>
        </div>

        {/* 平均奖励 */}
        <div className="bg-bg-modal rounded-xl p-4 border border-border-default flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">平均奖励</span>
            {rewardTrend ? (
              <TrendingUp size={12} className="text-emerald-400" />
            ) : (
              <TrendingDown size={12} className="text-amber-400" />
            )}
          </div>
          <span className={`text-sm font-black tabular-nums ${avgReward >= 140 ? 'text-cyan-400' : 'text-text-secondary'}`}>
            {fmt(avgReward, 1)}
          </span>
        </div>

        {/* 收敛度 */}
        <div className="bg-bg-modal rounded-xl p-4 border border-border-default flex justify-between items-center">
          <span className="text-xs text-text-muted">收敛度</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-1000"
                style={{ width: `${fmt(convergence, 2) * 100}%` }}
              />
            </div>
            <span className="text-xs font-black text-cyan-400 tabular-nums">{fmt(convergence, 2)}</span>
          </div>
        </div>

        {/* 业务指标 */}
        <div className="bg-bg-modal rounded-xl p-4 border border-border-default flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">成本优化率</span>
            <TrendingUp size={12} className="text-emerald-400" />
          </div>
          <span className="text-sm font-black text-emerald-400 tabular-nums">-12.8%</span>
        </div>

        <div className="bg-bg-modal rounded-xl p-4 border border-border-default flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">时效达标率</span>
            <TrendingUp size={12} className="text-emerald-400" />
          </div>
          <span className="text-sm font-black text-emerald-400 tabular-nums">94.2%</span>
        </div>

        <div className="bg-bg-modal rounded-xl p-4 border border-border-default flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">碳排放降低率</span>
            <TrendingDown size={12} className="text-emerald-400" />
          </div>
          <span className="text-sm font-black text-emerald-400 tabular-nums">-8.6%</span>
        </div>

        {/* AI 优化建议 */}
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Zap size={14} fill="currentColor" />
            <span className="text-[10px] font-black uppercase">AI 优化建议</span>
          </div>
          <p className="text-[10px] text-text-muted leading-relaxed">
            {stability < 85
              ? <>稳定性偏低，建议将学习率降至 <span className="text-cyan-400 font-bold">0.0003</span> 以提升训练稳定性。</>
              : avgReward < 135
                ? <>平均奖励偏低，建议增加探索率至 <span className="text-cyan-400 font-bold">0.08</span> 以发现更优策略。</>
                : <>将学习率降至 <span className="text-cyan-400 font-bold">0.0003</span> 可提升 <span className="text-emerald-400">5%</span> 的稳定性。</>
            }
          </p>
          <button
            onClick={() => showToast('AI 优化建议已应用')}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded-lg transition-all duration-300 cursor-pointer active:scale-95"
          >
            立即应用
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelEval;
