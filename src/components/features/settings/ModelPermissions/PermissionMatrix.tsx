
import React from 'react';
import { Table, CheckCircle2, XCircle } from 'lucide-react';

const PermissionMatrix: React.FC = () => {
  const actions = [
    { label: "全局权重下发 (Weight Push)", l1: true, l2: false, l3: false },
    { label: "超参实时调节 (Hyperparams)", l1: true, l2: true, l3: false },
    { label: "训练环境快照回滚 (Rollback)", l1: true, l2: false, l3: false },
    { label: "数据同步日志审计 (Audit Log)", l1: true, l2: true, l3: true },
    { label: "新算力节点接入 (Node Add)", l1: true, l2: true, l3: false },
  ];

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl h-full flex flex-col">
      <div className="flex items-center gap-3 text-indigo-400 mb-8">
        <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <Table size={20} />
        </div>
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">操作审计权限矩阵</h3>
      </div>

      <div className="flex-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr className="border-b border-border-default">
              <th className="pb-4 text-left text-[9px] font-black text-text-muted uppercase tracking-widest">敏感指令 / 操作</th>
              <th className="pb-4 text-center text-[10px] font-black text-indigo-400 uppercase tracking-widest">L1 指挥</th>
              <th className="pb-4 text-center text-[10px] font-black text-text-muted uppercase tracking-widest">L2 训练</th>
              <th className="pb-4 text-center text-[10px] font-black text-text-muted uppercase tracking-widest">L3 审计</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {actions.map((action, idx) => (
              <tr key={idx} className="group hover:bg-bg-elevated/50 transition-colors duration-300">
                <td className="py-5 text-[11px] font-black text-text-muted group-hover:text-text-secondary transition-colors duration-300">{action.label}</td>
                <td className="py-5 text-center"><PermissionIcon active={action.l1} /></td>
                <td className="py-5 text-center"><PermissionIcon active={action.l2} /></td>
                <td className="py-5 text-center"><PermissionIcon active={action.l3} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 pt-6 border-t border-border-default">
        <p className="text-[10px] text-text-muted font-bold leading-relaxed italic">
          "矩阵定义的权限受 <span className="text-indigo-500">零信任安全网关</span> 实时拦截保护。任何 L1 操作均会生成不可篡改的链上审计记录。"
        </p>
      </div>
    </div>
  );
};

const PermissionIcon = ({ active }: { active: boolean }) => (
  <div className="flex justify-center">
    {active ? (
      <CheckCircle2 size={16} className="text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
    ) : (
      <XCircle size={16} className="text-text-muted opacity-40" />
    )}
  </div>
);

export default PermissionMatrix;
