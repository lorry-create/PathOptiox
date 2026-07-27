
import React, { useState } from 'react';
import { AlertTriangle, Zap, X, TrendingUp, ShieldCheck, Award, Activity } from 'lucide-react';
import { useToast } from '@ui/Toast';

interface AlertPanelProps {
  onOpenLog?: () => void;
}

const AlertPanel: React.FC<AlertPanelProps> = ({ onOpenLog }) => {
  const { showToast } = useToast();
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);

  const handleApplyStrategy = () => {
    setShowApplyConfirm(true);
  };

  const handleConfirmApply = () => {
    setShowApplyConfirm(false);
    showToast('策略已部署生效');
  };

  const handleReplan = () => {
    showToast('已触发重规划');
  };

  const handleViewDetail = () => {
    showToast('查看详情');
  };

  return (
    <div className="space-y-4">
      {/* 高拥堵风险卡片 */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 transition-transform hover:-translate-y-0.5">
        <div className="bg-red-500/20 p-2 rounded-lg h-fit">
          <AlertTriangle className="text-red-500" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-red-500 mb-1">高拥堵风险</h4>
          <p className="text-[10px] text-red-400/80 leading-relaxed mb-3">上海港延迟比基准预测增加了 <span className="font-bold text-red-400">42%</span>。</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleViewDetail}
              className="py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-bg-secondary border border-border-default text-text-secondary hover:text-text-primary hover:border-border-input transition-all active:scale-95"
            >
              查看详情
            </button>
            <button
              onClick={handleReplan}
              className="py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
            >
              一键重规划
            </button>
          </div>
        </div>
      </div>

      {/* 新版PPO策略已训练完成卡片 */}
      <div className="bg-bg-secondary border border-cyan-500/30 rounded-xl p-5 space-y-4 transition-transform hover:-translate-y-0.5">
        <div className="flex items-center gap-3">
          <Zap className="text-cyan-400" size={20} fill="currentColor" />
          <h4 className="text-xs font-bold text-text-primary">新版PPO策略已训练完成</h4>
        </div>
        <p className="text-[10px] text-text-muted leading-relaxed">
          北美航线时效预计提升 <span className="text-cyan-400 font-bold">2.3%</span>，成本下降 <span className="text-emerald-400 font-bold">1.8%</span>。
        </p>
        <button
          onClick={handleApplyStrategy}
          className="w-full py-2 bg-cyan-500 text-white text-[11px] font-bold rounded-lg hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          应用策略
        </button>
      </div>

      {/* 强化学习策略评分卡片 */}
      <div
        onClick={() => setShowScoreModal(true)}
        className="bg-bg-secondary rounded-[24px] border border-border-default p-6 flex flex-col flex-1 min-h-[200px] shadow-2xl relative overflow-hidden group cursor-pointer transition-all hover:-translate-y-0.5 hover:border-cyan-500/30"
      >
        <h4 className="text-[12px] font-bold text-text-muted/80 uppercase tracking-widest mb-6">强化学习策略评分</h4>

        <div className="flex items-center justify-between mb-8">
          <div className="space-y-0.5">
            <div className="flex items-baseline">
               <span className="text-5xl font-black text-text-primary italic tracking-tighter tabular-nums drop-shadow-md">78</span>
               <span className="text-2xl font-bold text-cyan-500 italic ml-1">%</span>
            </div>
            <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest opacity-80">系统置信度</p>
          </div>

          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <div className="absolute inset-4 bg-cyan-500/5 blur-2xl rounded-full group-hover:bg-cyan-500/10 transition-all" />

            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 overflow-visible drop-shadow-[0_0_12px_rgba(6,182,212,0.2)] text-border-default">
              <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="9" fill="transparent" />
              <circle
                cx="50" cy="50" r="42" stroke="#06b6d4" strokeWidth="9" fill="transparent"
                strokeDasharray="264" strokeDashoffset={264 * (1 - 0.78)} strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-[14px] font-black text-text-primary italic leading-none drop-shadow-lg">高</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-text-muted/70 font-medium">综合准确率、稳定性、收益评分</p>

        <button
          onClick={(e) => { e.stopPropagation(); onOpenLog?.(); }}
          className="mt-4 flex items-center justify-center gap-3 py-3.5 bg-bg-secondary border border-border-default rounded-xl text-[11px] font-black text-text-muted hover:text-text-primary hover:border-border-input hover:bg-bg-tertiary transition-all uppercase tracking-[0.2em] shadow-inner group/btn"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted group-hover/btn:text-cyan-400 transition-colors tracking-tighter font-mono">›_</span>
            <span>查看实时训练日志</span>
          </div>
        </button>
      </div>

      {/* 策略评分详情弹窗 */}
      {showScoreModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowScoreModal(false)}
        >
          <div
            className="bg-bg-secondary border border-border-default rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-text-primary">强化学习策略评分详情</h3>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">综合得分 78 · 高置信度</p>
                </div>
              </div>
              <button
                onClick={() => setShowScoreModal(false)}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <ScoreRow icon={<TrendingUp size={14} />} label="准确率" value={82} color="#06b6d4" />
              <ScoreRow icon={<ShieldCheck size={14} />} label="稳定性" value={76} color="#10b981" />
              <ScoreRow icon={<Award size={14} />} label="收益" value={85} color="#f59e0b" />
              <ScoreRow icon={<Activity size={14} />} label="鲁棒性" value={69} color="#8B5CF6" />
            </div>

            <div className="mt-6 pt-4 border-t border-border-default flex items-center justify-between">
              <span className="text-[11px] text-text-muted font-bold uppercase tracking-widest">加权综合</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-text-primary italic">78</span>
                <span className="text-sm font-bold text-cyan-500">分</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 应用策略确认弹窗 */}
      {showApplyConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowApplyConfirm(false)}
        >
          <div
            className="bg-bg-secondary border border-border-default rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400 shrink-0">
                <Zap size={18} fill="currentColor" />
              </div>
              <p className="text-sm text-text-primary leading-relaxed pt-1">
                确认应用新版PPO策略？应用后将立即生效。
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowApplyConfirm(false)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl bg-bg-tertiary text-text-secondary hover:bg-bg-elevated transition-all active:scale-95"
              >
                取消
              </button>
              <button
                onClick={handleConfirmApply}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all active:scale-95 shadow-[0_10px_30px_-10px_rgba(6,182,212,0.5)]"
              >
                确认执行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreRow = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-black text-text-primary tabular-nums">{value}</span>
    </div>
    <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
      />
    </div>
  </div>
);

export default AlertPanel;
