import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Loader, Clock, DollarSign, X, Info, Zap } from 'lucide-react';
import { useToast } from '@/components/ui';

interface PreemptiveAction {
  id: string;
  target_order: string;
  strategy: string;
  cost_saved: string;
  status: 'QUEUED' | 'EXECUTING' | 'COMPLETED';
}

interface PpoPreemptiveLogProps {
  actions: PreemptiveAction[];
  currentTimeLabel: string;
}

// 策略详情 Mock 数据
const getStrategyDetail = (action: PreemptiveAction) => ({
  description: `针对订单 ${action.target_order} 的主动防御策略。${action.strategy}，通过 PPO 强化学习模型推演最优执行路径，降低供应链中断风险。`,
  expectedBenefit: `预计节省成本 ${action.cost_saved}，同时提升该航线整体韧性指数 12%。`,
  riskHint: '执行该策略可能短暂影响相关订单的配送时效，建议在非高峰时段执行并提前通知客户。',
});

const PpoPreemptiveLog: React.FC<PpoPreemptiveLogProps> = ({ actions, currentTimeLabel }) => {
  const { showToast } = useToast();
  // 本地状态覆盖：记录用户手动执行的策略
  const [executedOverrides, setExecutedOverrides] = useState<Set<string>>(new Set());
  const [detailAction, setDetailAction] = useState<PreemptiveAction | null>(null);
  const [confirmAction, setConfirmAction] = useState<PreemptiveAction | null>(null);

  // 切换时间节点时清空手动执行记录
  useEffect(() => {
    setExecutedOverrides(new Set());
  }, [currentTimeLabel]);

  // 合并原始状态与手动执行覆盖
  const mergedActions = actions.map(a => ({
    ...a,
    status: executedOverrides.has(a.id) ? 'COMPLETED' as const : a.status,
  }));

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'COMPLETED': return { icon: <CheckCircle size={14} />, label: '已执行', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
      case 'EXECUTING': return { icon: <Loader size={14} className="animate-spin" />, label: '执行中', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' };
      default: return { icon: <Clock size={14} />, label: '待执行', color: 'text-text-muted', bg: 'bg-text-muted/10 border-border-default/30' };
    }
  };

  const totalSaved = mergedActions.reduce((sum, a) => {
    const match = a.cost_saved.match(/\$([0-9.]+)/);
    return sum + (match ? parseFloat(match[1]) : 0);
  }, 0);

  const completedCount = mergedActions.filter(a => a.status === 'COMPLETED').length;

  const handleExecute = () => {
    if (!confirmAction) return;
    setExecutedOverrides(prev => new Set(prev).add(confirmAction.id));
    showToast('防御策略已生效');
    setConfirmAction(null);
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-3xl p-4 md:p-8 flex flex-col">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
          <Shield size={16} className="text-emerald-400" />
        </div>
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">PPO 主动防御策略</h3>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="bg-bg-elevated/50 rounded-xl p-2 md:p-3 text-center border border-border-default/40">
          <div className="text-base md:text-lg font-black text-text-primary">{mergedActions.length}</div>
          <div className="text-[8px] md:text-[9px] text-text-muted font-bold uppercase">生成策略数</div>
        </div>
        <div className="bg-emerald-500/5 rounded-xl p-2 md:p-3 text-center border border-emerald-500/20">
          <div className="text-base md:text-lg font-black text-emerald-400">{completedCount}</div>
          <div className="text-[8px] md:text-[9px] text-text-muted font-bold uppercase">已生效</div>
        </div>
        <div className="bg-amber-500/5 rounded-xl p-2 md:p-3 text-center border border-amber-500/20">
          <div className="text-base md:text-lg font-black text-amber-400">${totalSaved.toFixed(1)}万</div>
          <div className="text-[8px] md:text-[9px] text-text-muted font-bold uppercase">预计节省成本</div>
        </div>
      </div>

      {/* Action list */}
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
        {mergedActions.map((action) => {
          const statusCfg = getStatusConfig(action.status);
          const isCompleted = action.status === 'COMPLETED';
          return (
            <div
              key={action.id}
              className={`rounded-2xl border p-4 transition-all duration-300 ${statusCfg.bg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-blue-400 font-mono">{action.target_order}</span>
                <div className={`flex items-center gap-1 text-[9px] font-black uppercase ${statusCfg.color}`}>
                  {statusCfg.icon}
                  <span>{statusCfg.label}</span>
                </div>
              </div>

              <p className="text-[11px] text-text-secondary font-bold leading-relaxed mb-3">
                {action.strategy}
              </p>

              <div className="flex items-center justify-between">
                {action.cost_saved !== '—' && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={12} className="text-emerald-500" />
                    <span className="text-[11px] font-black text-emerald-400">
                      已节省 {action.cost_saved}
                    </span>
                  </div>
                )}
                {/* 详情 + 执行按钮 */}
                {!isCompleted && (
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setDetailAction(action)}
                      className="text-[10px] font-bold text-text-muted hover:text-brand-primary transition-all duration-300 cursor-pointer"
                    >
                      详情
                    </button>
                    <button
                      onClick={() => setConfirmAction(action)}
                      className="text-[10px] font-bold text-text-muted hover:text-emerald-400 transition-all duration-300 cursor-pointer"
                    >
                      执行
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-border-default flex items-center justify-between">
        <span className="text-[10px] text-text-muted font-bold">PPO 引擎 · {currentTimeLabel}</span>
        <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">PathOptix RL</span>
      </div>

      {/* 策略详情弹窗 */}
      {detailAction && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDetailAction(null)}
        >
          <div
            className="bg-bg-secondary border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                  <Shield size={16} className="text-emerald-400" />
                </div>
                <p className="text-sm font-black text-text-primary uppercase tracking-widest">策略详情</p>
              </div>
              <button onClick={() => setDetailAction(null)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 策略说明 */}
              <div>
                <label className="text-[10px] text-text-muted font-bold uppercase pl-1 mb-1.5 block">策略说明</label>
                <div className="bg-bg-tertiary/30 rounded-xl p-3">
                  <p className="text-[11px] text-text-secondary font-bold leading-relaxed">{getStrategyDetail(detailAction).description}</p>
                </div>
              </div>
              {/* 预期收益 */}
              <div>
                <label className="text-[10px] text-text-muted font-bold uppercase pl-1 mb-1.5 block">预期收益</label>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <DollarSign size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-text-secondary font-bold leading-relaxed">{getStrategyDetail(detailAction).expectedBenefit}</p>
                  </div>
                </div>
              </div>
              {/* 风险提示 */}
              <div>
                <label className="text-[10px] text-text-muted font-bold uppercase pl-1 mb-1.5 block">风险提示</label>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Info size={12} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-text-secondary font-bold leading-relaxed">{getStrategyDetail(detailAction).riskHint}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setDetailAction(null)}
                className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-xl text-xs font-black hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setConfirmAction(detailAction);
                  setDetailAction(null);
                }}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                执行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 执行确认弹窗 */}
      {confirmAction && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="bg-bg-secondary border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                <Zap size={16} className="text-emerald-400" />
              </div>
              <p className="text-sm font-black text-text-primary uppercase tracking-widest">确认执行</p>
            </div>
            <p className="text-xs text-text-secondary mb-3 leading-relaxed">
              确认执行策略 <span className="text-emerald-400 font-black">{confirmAction.strategy}</span>？
            </p>
            <p className="text-[10px] text-text-muted mb-6 leading-relaxed">
              订单 {confirmAction.target_order} 的防御策略将立即生效。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-xl text-xs font-black hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleExecute}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg shadow-emerald-500/20"
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

export default PpoPreemptiveLog;
