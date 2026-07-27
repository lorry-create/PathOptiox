import React from 'react';
import { Fingerprint, Building2, BadgeCheck, CheckCircle2 } from 'lucide-react';

const KYCCard: React.FC = () => {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl space-y-8 relative overflow-hidden">
      <div className="flex items-center justify-between relative z-10 border-b border-border-default pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 border border-cyan-500/20 shadow-lg">
            <Fingerprint size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-text-primary tracking-tight uppercase">实名认证中心 (KYC)</h3>
            <p className="text-[9px] text-text-muted font-bold uppercase mt-0.5 tracking-tighter">Identity Compliance & Authentication</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse" />
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.1em]">Verified Member</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 relative z-10">
        <div className="space-y-6">
          <VerificationField label="真实姓名" value="张 * 华" status="VERIFIED" />
          <VerificationField label="证件类型" value="居民身份证" status="VERIFIED" />
          <VerificationField label="证件号码" value="3201**********0422" status="VERIFIED" />
        </div>
        
        <div className="bg-bg-primary/60 rounded-[32px] border border-border-default p-8 flex flex-col justify-between shadow-inner">
          <div className="space-y-6">
            <div className="flex items-center gap-4 group/item">
              <div className="p-3 bg-bg-secondary rounded-xl text-text-muted group-hover/item:text-cyan-400 transition-colors duration-300 shadow-md">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-[9px] text-text-muted font-black uppercase tracking-tighter">所属机构</p>
                <span className="text-sm font-bold text-text-secondary">PathOptix Global IDC</span>
              </div>
            </div>
            <div className="flex items-center gap-4 group/item">
              <div className="p-3 bg-bg-secondary rounded-xl text-text-muted group-hover/item:text-cyan-400 transition-colors duration-300 shadow-md">
                <BadgeCheck size={20} />
              </div>
              <div>
                <p className="text-[9px] text-text-muted font-black uppercase tracking-tighter">授权级别</p>
                <span className="text-sm font-bold text-text-secondary">全域优化指挥权 (L1)</span>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-border-default mt-6">
            <p className="text-[10px] text-text-muted leading-relaxed italic font-medium">
              "您的实名信息已根据 AES-256 标准加密。根据合规要求，下一次定期核验日期为：<span className="text-text-muted">2024-09-12</span>"
            </p>
          </div>
        </div>
      </div>

      <div className="absolute -top-10 -right-10 opacity-[0.03] pointer-events-none transform rotate-12">
        <Fingerprint size={280} />
      </div>
    </div>
  );
};

const VerificationField = ({ label, value, status }: any) => (
  <div className="space-y-2 group">
    <div className="text-[10px] font-black text-text-muted uppercase tracking-widest group-hover:text-text-muted transition-colors duration-300 pl-1">{label}</div>
    <div className="flex items-center justify-between bg-bg-primary/60 p-5 rounded-2xl border border-border-default group-hover:border-border-default transition-all duration-300 shadow-inner">
      <span className="text-sm font-bold text-text-secondary">{value}</span>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
          <CheckCircle2 size={10} className="text-emerald-500" />
        </div>
        <span className="text-[9px] font-black text-emerald-500 tracking-widest uppercase">{status}</span>
      </div>
    </div>
  </div>
);

export default KYCCard;
