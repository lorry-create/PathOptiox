import React, { useState } from 'react';
import { Lock, Mail, Smartphone, Link as LinkIcon, X, Check } from 'lucide-react';

const SecurityControlsCard: React.FC = () => {
  const [email, setEmail] = useState('admin@pathoptix.io');
  const [phone, setPhone] = useState('+86 188 **** 8888');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentField, setCurrentField] = useState<'email' | 'phone' | '2fa' | 'third-party'>('email');
  const [newValue, setNewValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState<'push' | 'sms' | 'app'>('push');
  const [thirdPartyAccounts, setThirdPartyAccounts] = useState([
    { id: 1, name: 'GitHub', status: 'connected', lastUsed: '2026-01-20 14:30' },
    { id: 2, name: 'Google (Enterprise)', status: 'connected', lastUsed: '2026-01-15 09:15' }
  ]);

  // 打开模态框
  const openModal = (field: 'email' | 'phone' | '2fa' | 'third-party') => {
    setCurrentField(field);
    if (field === 'email' || field === 'phone') {
      setNewValue(field === 'email' ? email : phone);
    }
    setIsModalOpen(true);
    setUpdateSuccess(false);
  };

  // 关闭模态框
  const closeModal = () => {
    setIsModalOpen(false);
    setUpdateSuccess(false);
  };

  // 处理更新
  const handleUpdate = () => {
    if (!newValue.trim()) return;

    setIsUpdating(true);

    // 模拟更新过程（1秒）
    setTimeout(() => {
      if (currentField === 'email') {
        setEmail(newValue);
      } else {
        setPhone(newValue);
      }
      setIsUpdating(false);
      setUpdateSuccess(true);

      // 2秒后关闭模态框
      setTimeout(() => {
        closeModal();
      }, 2000);
    }, 1000);
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl space-y-8 relative z-10">
      <div className="flex items-center gap-3 text-blue-400 border-b border-border-default pb-4">
        <Lock size={18} />
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">核心安全控制</h3>
      </div>
      
      <div className="grid grid-cols-1 gap-5">
        <SecurityItem icon={<Mail size={18} />} label="关联电子邮件" value={email} action="更换绑定" onClick={() => openModal('email')} />
        <SecurityItem icon={<Smartphone size={18} />} label="关联手机号码" value={phone} action="更换绑定" onClick={() => openModal('phone')} />
        <SecurityItem 
          icon={<Smartphone size={18} />} 
          label="两步验证 (2FA)" 
          value="已通过系统推送/指纹增强开启" 
          status="success" 
          action="配置" 
          onClick={() => openModal('2fa')}
        />
        <SecurityItem 
          icon={<LinkIcon size={18} />} 
          label="关联第三方账号" 
          value="GitHub, Google (Enterprise)" 
          action="管理" 
          onClick={() => openModal('third-party')}
        />
      </div>

      {/* 模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
          <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">
                {currentField === 'email' ? '修改关联电子邮件' : 
                 currentField === 'phone' ? '修改关联手机号码' : 
                 currentField === '2fa' ? '两步验证配置' : '管理第三方账号'}
              </h4>
              <button 
                onClick={closeModal}
                className="p-2 bg-bg-secondary border border-border-default rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all duration-300"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              {/* 修改电子邮件/手机号码 */}
              {(currentField === 'email' || currentField === 'phone') && (
                <>
                  <div>
                    <label className="block text-[9px] text-text-muted font-black uppercase tracking-widest mb-2">
                      {currentField === 'email' ? '新电子邮件地址' : '新手机号码'}
                    </label>
                    <input 
                      type={currentField === 'email' ? 'email' : 'text'}
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      disabled={isUpdating || updateSuccess}
                      className={`w-full px-4 py-3 bg-bg-primary border border-border-default rounded-xl text-sm text-text-primary focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 ${isUpdating || updateSuccess ? 'opacity-50 cursor-not-allowed' : ''}`}
                      placeholder={currentField === 'email' ? '请输入新的电子邮件地址' : '请输入新的手机号码'}
                    />
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={closeModal}
                      disabled={isUpdating}
                      className={`flex-1 px-4 py-3 bg-bg-secondary border border-border-default rounded-xl text-xs font-black text-text-muted uppercase tracking-widest hover:bg-bg-tertiary hover:text-text-primary transition-all duration-300 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      取消
                    </button>
                    <button 
                      onClick={handleUpdate}
                      disabled={!newValue.trim() || isUpdating || updateSuccess}
                      className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${isUpdating ? 'bg-bg-tertiary text-text-primary cursor-not-allowed' : updateSuccess ? 'bg-emerald-600 text-white' : 'bg-cyan-600 text-white hover:bg-cyan-500'}`}
                    >
                      {isUpdating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          更新中...
                        </>
                      ) : updateSuccess ? (
                        <>
                          <Check size={14} />
                          更新成功
                        </>
                      ) : (
                        '保存修改'
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* 两步验证配置 */}
              {currentField === '2fa' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] text-text-muted font-black uppercase tracking-widest mb-2">
                        验证方式
                      </label>
                      <div className="space-y-3">
                        <div 
                          className={`p-4 bg-bg-primary border rounded-xl cursor-pointer transition-all duration-300 ${twoFAMethod === 'push' ? 'border-cyan-500 bg-cyan-500/5' : 'border-border-default hover:border-border-input'}`}
                          onClick={() => setTwoFAMethod('push')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${twoFAMethod === 'push' ? 'border-cyan-500 bg-cyan-500' : 'border-border-input'}`}>
                                {twoFAMethod === 'push' && <Check size={12} className="text-text-primary" />}
                              </div>
                              <span className="text-sm font-bold text-text-primary">系统推送/指纹增强</span>
                            </div>
                          </div>
                        </div>
                        <div 
                          className={`p-4 bg-bg-primary border rounded-xl cursor-pointer transition-all duration-300 ${twoFAMethod === 'sms' ? 'border-cyan-500 bg-cyan-500/5' : 'border-border-default hover:border-border-input'}`}
                          onClick={() => setTwoFAMethod('sms')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${twoFAMethod === 'sms' ? 'border-cyan-500 bg-cyan-500' : 'border-border-input'}`}>
                                {twoFAMethod === 'sms' && <Check size={12} className="text-text-primary" />}
                              </div>
                              <span className="text-sm font-bold text-text-primary">短信验证码</span>
                            </div>
                          </div>
                        </div>
                        <div 
                          className={`p-4 bg-bg-primary border rounded-xl cursor-pointer transition-all duration-300 ${twoFAMethod === 'app' ? 'border-cyan-500 bg-cyan-500/5' : 'border-border-default hover:border-border-input'}`}
                          onClick={() => setTwoFAMethod('app')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${twoFAMethod === 'app' ? 'border-cyan-500 bg-cyan-500' : 'border-border-input'}`}>
                                {twoFAMethod === 'app' && <Check size={12} className="text-text-primary" />}
                              </div>
                              <span className="text-sm font-bold text-text-primary">认证器应用 (如 Google Authenticator)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={closeModal}
                        className="flex-1 px-4 py-3 bg-bg-secondary border border-border-default rounded-xl text-xs font-black text-text-muted uppercase tracking-widest hover:bg-bg-tertiary hover:text-text-primary transition-all duration-300"
                      >
                        取消
                      </button>
                      <button 
                        onClick={() => {
                          // 模拟保存配置
                          setIsUpdating(true);
                          setTimeout(() => {
                            setIsUpdating(false);
                            setUpdateSuccess(true);
                            setTimeout(() => {
                              closeModal();
                            }, 2000);
                          }, 1000);
                        }}
                        className={`flex-1 px-4 py-3 bg-cyan-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-cyan-500 transition-all ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isUpdating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            保存中...
                          </>
                        ) : updateSuccess ? (
                          <>
                            <Check size={14} />
                            保存成功
                          </>
                        ) : (
                          '保存配置'
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 第三方账号管理 */}
              {currentField === 'third-party' && (
                <>
                  <div className="space-y-4">
                    {thirdPartyAccounts.map((account) => (
                      <div key={account.id} className="p-4 bg-bg-primary border border-border-default rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-text-primary">{account.name}</div>
                            <div className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-1">
                              上次使用: {account.lastUsed}
                            </div>
                          </div>
                          <button className="px-3 py-1.5 bg-bg-secondary border border-border-default rounded-lg text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-text-primary hover:bg-bg-tertiary transition-all duration-300">
                            解除关联
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-4">
                      <button 
                        onClick={closeModal}
                        className="flex-1 px-4 py-3 bg-bg-secondary border border-border-default rounded-xl text-xs font-black text-text-muted uppercase tracking-widest hover:bg-bg-tertiary hover:text-text-primary transition-all duration-300"
                      >
                        关闭
                      </button>
                      <button className="flex-1 px-4 py-3 bg-cyan-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-cyan-500 transition-all">
                        添加新账号
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SecurityItem = ({ icon, label, value, status, action, onClick }: any) => (
  <div className="flex items-center justify-between p-6 bg-bg-primary/40 border border-border-default rounded-[24px] hover:border-border-input transition-all duration-300 group shadow-sm">
    <div className="flex items-center gap-6">
      <div className="p-3 bg-bg-secondary border border-border-default rounded-xl text-text-muted group-hover:text-cyan-400 transition-colors duration-300 shadow-lg">
        {icon}
      </div>
      <div className="space-y-1">
        <div className="text-[9px] text-text-muted font-black uppercase tracking-widest">{label}</div>
        <div className={`text-sm font-bold ${status === 'success' ? 'text-emerald-400' : 'text-text-secondary'}`}>{value}</div>
      </div>
    </div>
    {action && (
      <button 
        onClick={onClick}
        className="px-5 py-2.5 bg-bg-tertiary border border-border-default rounded-xl text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-text-primary hover:border-border-default transition-all duration-300 active:scale-95 shadow-md"
      >
        {action}
      </button>
    )}
  </div>
);

export default SecurityControlsCard;