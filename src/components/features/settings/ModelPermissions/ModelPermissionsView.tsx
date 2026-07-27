
import React from 'react';
import { ChevronLeft, ShieldCheck, Lock, Save } from 'lucide-react';
import AccessControlList from './AccessControlList';
import PermissionMatrix from './PermissionMatrix';
import SecurityProtocols from './SecurityProtocols';

interface ModelPermissionsViewProps {
  onBack: () => void;
}

const ModelPermissionsView: React.FC<ModelPermissionsViewProps> = ({ onBack }) => {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto pb-24">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={onBack}
            className="p-2.5 bg-bg-secondary border border-border-default rounded-xl text-text-muted hover:text-text-primary transition-all duration-300 hover:scale-110 shadow-xl"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg md:text-2xl font-black text-text-primary tracking-tight italic">模型训练与权重权限管理</h2>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1 hidden sm:block">Deep Reinforcement Learning Access Governance</p>
          </div>
        </div>
        <div className="flex gap-3 md:gap-4">
           <button className="flex items-center gap-2 px-4 md:px-6 py-3 bg-bg-secondary border border-border-default text-text-muted text-xs font-black rounded-xl hover:text-text-primary transition-all duration-300 uppercase tracking-widest">
             <ShieldCheck size={14} /> 紧急全域加锁
           </button>
           <button className="px-6 md:px-10 py-3 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 uppercase tracking-widest">
             <Save size={14} /> 应用权限更改
           </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
        {/* 左侧：成员与协议 */}
        <div className="col-span-12 lg:col-span-6 space-y-4 md:space-y-6 lg:space-y-8">
          <AccessControlList />
          <SecurityProtocols />
        </div>

        {/* 右侧：权限矩阵 */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 md:gap-6 lg:gap-8">
          <PermissionMatrix />
          
          <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900/20 border border-indigo-500/20 rounded-[32px] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden group">
             <div className="p-5 bg-indigo-600/20 rounded-3xl text-indigo-400 mb-8 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                <Lock size={48} />
             </div>
             <h4 className="text-lg font-black text-text-primary uppercase tracking-widest italic">零信任访问控制已生效</h4>
             <p className="text-[11px] text-text-muted mt-3 font-bold leading-relaxed max-w-[320px]">
               所有对于生产环境模型权重的更改申请必须通过 <span className="text-indigo-400 font-black">2FA 双重确认</span> 以及 <span className="text-indigo-400 font-black">多签名审批流</span>。
             </p>
             
             {/* 装饰性动效 */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px] rounded-full" />
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/5 blur-[60px] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelPermissionsView;
