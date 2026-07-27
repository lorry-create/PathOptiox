
import React from 'react';
import { ChevronLeft, LogOut } from 'lucide-react';
import ProfileCard from './ProfileCard';
import SecurityScoreCard from './SecurityScoreCard';
import KYCCard from './KYCCard';
import SecurityControlsCard from './SecurityControlsCard';

interface AccountViewProps {
  onBack: () => void;
  onLogout?: () => void;
}

const AccountView: React.FC<AccountViewProps> = ({ onBack, onLogout }) => {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={onBack}
            className="p-2.5 bg-bg-secondary border border-border-default rounded-xl text-text-muted hover:text-text-primary transition-all duration-300 hover:scale-110 shadow-xl"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg md:text-2xl font-black text-text-primary tracking-tight italic">账户安全与治理中心</h2>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1 hidden sm:block">Identity & Global Security Governance</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 md:px-6 py-2.5 bg-red-600/10 border border-red-500/20 text-red-500 text-xs font-black rounded-xl hover:bg-red-500/20 transition-all uppercase tracking-widest"
        >
          <LogOut size={14} /> 退出登录
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-4 space-y-4 md:space-y-6 lg:space-y-8">
          <ProfileCard />
          <SecurityScoreCard />
        </div>
        <div className="col-span-12 lg:col-span-8 space-y-4 md:space-y-6 lg:space-y-8">
          <KYCCard />
          <SecurityControlsCard />
        </div>
      </div>
    </div>
  );
};

export default AccountView;
