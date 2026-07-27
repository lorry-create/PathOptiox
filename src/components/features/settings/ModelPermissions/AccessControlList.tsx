
import React from 'react';
import { User, ShieldCheck, MoreHorizontal } from 'lucide-react';

const AccessControlList: React.FC = () => {
  const members = [
    { name: "Dr. Aris Chen", role: "首席科学家", level: "L1 - 全域指挥", status: "Active", avatar: "https://picsum.photos/seed/aris/80/80" },
    { name: "Sarah Miller", role: "高级算法工程师", level: "L2 - 模型训练", status: "Online", avatar: "https://picsum.photos/seed/sarah/80/80" },
    { name: "Kevin V.", role: "安全审计员", level: "L3 - 只读审计", status: "Active", avatar: "https://picsum.photos/seed/kevin/80/80" },
    { name: "System Bot", role: "自动化节点", level: "L1 - 权重分发", status: "Standby", avatar: "https://picsum.photos/seed/bot/80/80" },
  ];

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl space-y-8">
      <div className="flex items-center justify-between border-b border-border-default pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <User size={20} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">团队成员权限列表</h3>
        </div>

      </div>

      <div className="space-y-4">
        {members.map((member, idx) => (
          <div key={idx} className="flex items-center justify-between p-5 bg-bg-primary/40 border border-border-default rounded-[24px] hover:border-indigo-500/30 transition-all duration-300 group">
            <div className="flex items-center gap-5">
              <div className="relative">
                <img src={member.avatar} className="w-12 h-12 rounded-2xl border-2 border-border-default group-hover:border-indigo-500/50 transition-all duration-300" />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-bg-secondary rounded-full" />
              </div>
              <div>
                <div className="text-sm font-bold text-text-secondary group-hover:text-text-primary transition-colors duration-300">{member.name}</div>
                <div className="text-[10px] text-text-muted font-bold uppercase mt-0.5">{member.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <div className={`text-[10px] font-black uppercase tracking-widest ${idx === 0 ? 'text-indigo-400' : 'text-text-muted'}`}>
                  {member.level}
                </div>
                <div className="text-[9px] text-text-muted font-bold mt-0.5">{member.status}</div>
              </div>
              <button className="p-2 text-text-muted hover:text-text-primary"><MoreHorizontal size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccessControlList;
