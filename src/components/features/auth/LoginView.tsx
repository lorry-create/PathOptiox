
import React, { useState } from 'react';
import { authApi } from '@services';

interface LoginViewProps {
  onLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.login({ username, password });
      localStorage.setItem('access_token', response.access_token);
      onLogin();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || '登录失败，请检查用户名和密码。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-bg-secondary font-display text-text-primary overflow-hidden">
      {/* Left Section: Abstract Logistics Visualization */}
      <div className="hidden lg:flex w-[60%] relative overflow-hidden bg-bg-secondary items-center justify-center">
        <div className="absolute inset-0 network-gradient"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-bg-secondary"></div>
        <div className="absolute bottom-20 left-20 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-brand-primary text-4xl">hub</span>
            <h3 className="text-2xl font-bold">AI 驱动的全球调度</h3>
          </div>
          <p className="text-text-secondary text-lg leading-relaxed">
            实时分析数百万个数据点，为您的企业提供最高效的物流路径规划与资产优化方案。
          </p>
        </div>
      </div>

      {/* Right Section: Login Card */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center items-center px-8 sm:px-12 bg-bg-secondary relative">
        <div className="w-full max-w-[440px] glass-card p-10 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex flex-col gap-2 mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-brand-primary p-1.5 rounded-lg">
                <span className="material-symbols-outlined text-text-primary text-3xl">route</span>
              </div>
              <span className="text-2xl font-black tracking-tight text-text-primary italic">LogiOptima</span>
            </div>
            <h1 className="text-text-primary text-3xl font-bold leading-tight">企业级物流优化系统</h1>
            <p className="text-text-secondary text-base">欢迎回来，请输入您的凭据</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs font-bold animate-in fade-in">
                {error}
              </div>
            )}

            {/* Username Field */}
            <div className="flex flex-col gap-2">
              <label className="text-text-primary text-sm font-medium">用户名/邮箱</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-xl">person</span>
                <input
                  className="form-input w-full rounded-lg text-text-primary focus:outline-0 focus:ring-2 focus:ring-brand-primary/50 border border-border-input bg-bg-elevated h-14 pl-12 pr-4 placeholder:text-text-muted text-base transition-all"
                  placeholder="请输入用户名或邮箱"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-text-primary text-sm font-medium">密码</label>
              <div className="flex w-full items-stretch rounded-lg">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-xl">lock</span>
                  <input
                    className="form-input w-full rounded-l-lg text-text-primary focus:outline-0 focus:ring-2 focus:ring-brand-primary/50 border border-border-input bg-bg-elevated h-14 pl-12 pr-4 placeholder:text-text-muted text-base transition-all border-r-0"
                    placeholder="请输入密码"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex border border-border-input bg-bg-elevated items-center justify-center px-4 rounded-r-lg border-l-0 text-text-muted hover:text-text-primary transition-colors"
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Login Button */}
            <div className="mt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="glow-button flex w-full cursor-pointer items-center justify-center rounded-lg h-14 bg-brand-primary text-white text-lg font-bold tracking-wide transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span className="truncate">立即登录</span>
                )}
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative w-5 h-5 rounded border border-border-input bg-bg-elevated flex items-center justify-center group-hover:border-brand-primary transition-colors">
                  <span className="material-symbols-outlined text-brand-primary text-sm hidden group-has-[:checked]:block">check</span>
                  <input defaultChecked className="hidden" type="checkbox" />
                </div>
                <span className="text-text-muted text-sm group-hover:text-text-primary transition-colors">记住我</span>
              </label>
              <a className="text-brand-primary text-sm font-medium hover:underline" href="#">忘记密码?</a>
            </div>
          </form>


        </div>
      </div>
    </div>
  );
};

export default LoginView;
