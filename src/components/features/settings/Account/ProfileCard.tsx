import React, { useState } from 'react';
import { Camera, BadgeCheck, ChevronRight, X, Check } from 'lucide-react';

const ProfileCard: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userData, setUserData] = useState({
    name: '管理员账户',
    role: '高级优化工程师',
    level: '8',
    bio: '专注于AI路径优化和供应链韧性分析，拥有5年行业经验。',
    email: 'admin@pathoptix.com',
    phone: '+86 138 0013 8000'
  });

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    setIsEditing(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group">
      {/* 成功提示 */}
      {showSuccess && (
        <div className="absolute top-6 right-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
          <Check size={16} className="text-emerald-500" />
          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">保存成功</span>
        </div>
      )}

      <div className="relative group mb-8">
        <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-[36px] opacity-20 group-hover:opacity-40 transition-opacity blur" />
        <img 
          src="https://picsum.photos/seed/pathoptix/200/200" 
          alt="Avatar" 
          className="w-40 h-40 rounded-[32px] border-4 border-border-default relative z-10 transition-all duration-300 group-hover:scale-[1.02]" 
        />
        <button className="absolute -bottom-2 -right-2 p-3 bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/30 hover:scale-110 active:scale-95 transition-all z-20">
          <Camera size={18} />
        </button>
      </div>

      {!isEditing ? (
        <>
          <div className="space-y-1 mb-8">
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-2xl font-black text-text-primary italic">{userData.name}</h3>
              <BadgeCheck size={20} className="text-cyan-400" />
            </div>
            <p className="text-xs text-text-muted font-bold uppercase tracking-[0.2em]">{userData.role} (Level {userData.level})</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 mb-8">
             <div className="bg-bg-primary/60 rounded-2xl p-4 border border-border-default shadow-inner">
                <div className="text-[10px] text-text-muted font-black uppercase mb-1">已接入节点</div>
                <div className="text-xl font-black text-text-primary italic">14</div>
             </div>
             <div className="bg-bg-primary/60 rounded-2xl p-4 border border-border-default shadow-inner">
                <div className="text-[10px] text-text-muted font-black uppercase mb-1">历史贡献值</div>
                <div className="text-xl font-black text-emerald-500 italic">4.2k</div>
             </div>
          </div>

          <button 
            onClick={handleEditClick}
            className="w-full py-4 bg-bg-secondary border border-border-default rounded-2xl text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-text-primary transition-all duration-300 flex items-center justify-center gap-2"
          >
            编辑个人公开资料 <ChevronRight size={14} />
          </button>
        </>
      ) : (
        <div className="w-full space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">编辑个人资料</h3>
            <button 
              onClick={handleCancelClick}
              className="p-2 bg-bg-secondary border border-border-default rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all duration-300"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[9px] text-text-muted font-black uppercase tracking-widest mb-2">用户名</label>
              <input 
                type="text" 
                name="name" 
                value={userData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-bg-primary border border-border-default rounded-xl text-sm text-text-primary focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
              />
            </div>

            <div>
              <label className="block text-[9px] text-text-muted font-black uppercase tracking-widest mb-2">职位</label>
              <input 
                type="text" 
                name="role" 
                value={userData.role}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-bg-primary border border-border-default rounded-xl text-sm text-text-primary focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
              />
            </div>

            <div>
              <label className="block text-[9px] text-text-muted font-black uppercase tracking-widest mb-2">等级</label>
              <input 
                type="text" 
                name="level" 
                value={userData.level}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-bg-primary border border-border-default rounded-xl text-sm text-text-primary focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
              />
            </div>

            <div>
              <label className="block text-[9px] text-text-muted font-black uppercase tracking-widest mb-2">个人简介</label>
              <textarea 
                name="bio" 
                value={userData.bio}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 bg-bg-primary border border-border-default rounded-xl text-sm text-text-primary focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 resize-none"
              />
            </div>

            <div>
              <label className="block text-[9px] text-text-muted font-black uppercase tracking-widest mb-2">电子邮件</label>
              <input 
                type="email" 
                name="email" 
                value={userData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-bg-primary border border-border-default rounded-xl text-sm text-text-primary focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
              />
            </div>

            <div>
              <label className="block text-[9px] text-text-muted font-black uppercase tracking-widest mb-2">手机号码</label>
              <input 
                type="tel" 
                name="phone" 
                value={userData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-bg-primary border border-border-default rounded-xl text-sm text-text-primary focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleCancelClick}
              className="flex-1 py-4 bg-bg-secondary border border-border-default rounded-2xl text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-text-primary transition-all duration-300"
            >
              取消
            </button>
            <button 
              onClick={handleSaveClick}
              className="flex-1 py-4 bg-cyan-600 border border-cyan-500/30 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/20"
            >
              保存修改
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCard;