
import React from 'react';
import { MoreHorizontal, MessageSquare, AlertCircle } from 'lucide-react';

const SupportQueue: React.FC = () => {
  const tickets = [
    { id: 'TKT-8291', user: 'Liam Johnson', issue: '物流延迟查询 - APAC Hub', time: '2m ago', priority: 'HIGH', status: '处理中' },
    { id: 'TKT-8288', user: 'Sofia Garcia', issue: '订单地址变更请求', time: '5m ago', priority: 'MEDIUM', status: '待分配' },
    { id: 'TKT-8285', user: 'Zhang Wei', issue: '运费发票补开', time: '12m ago', priority: 'LOW', status: '处理中' },
    { id: 'TKT-8282', user: 'EuroLogistics Ltd', issue: 'API 接口同步异常报告', time: '18m ago', priority: 'CRITICAL', status: 'AI 介入' },
    { id: 'TKT-8279', user: 'Alice Brown', issue: '货物破损理赔申诉', time: '25m ago', priority: 'HIGH', status: '处理中' },
  ];

  return (
    <div className="bg-bg-secondary border border-border-default rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div className="flex items-center gap-3">
          <MessageSquare size={18} className="text-cyan-400" />
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">待办服务工单</h3>
        </div>
        <div className="flex gap-2">
           <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black rounded uppercase border border-red-500/20">3 条紧急</span>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default">
              <th className="pb-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">工单 ID</th>
              <th className="pb-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest hidden md:table-cell">用户</th>
              <th className="pb-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">问题描述</th>
              <th className="pb-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest hidden lg:table-cell">提交时间</th>
              <th className="pb-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">优先级</th>
              <th className="pb-4 hidden md:table-cell"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default/20">
            {tickets.map((tkt, idx) => (
              <tr key={idx} className="group hover:bg-bg-tertiary/10 cursor-pointer transition-colors duration-300">
                <td className="py-4 md:py-6 font-mono text-xs text-cyan-400 font-black">{tkt.id}</td>
                <td className="py-4 md:py-6 text-sm font-bold text-text-secondary hidden md:table-cell">{tkt.user}</td>
                <td className="py-4 md:py-6 text-xs text-text-muted font-medium max-w-[120px] md:max-w-xs truncate">{tkt.issue}</td>
                <td className="py-4 md:py-6 text-xs text-text-muted font-medium hidden lg:table-cell">{tkt.time}</td>
                <td className="py-4 md:py-6">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                    tkt.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    tkt.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-bg-tertiary/50 text-text-muted border-border-input'
                  }`}>
                    {tkt.priority}
                  </span>
                </td>
                <td className="py-4 md:py-6 text-right hidden md:table-cell">
                  <button className="p-2 text-text-muted hover:text-text-primary transition-colors duration-300">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupportQueue;
