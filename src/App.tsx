
import React, { useState, useCallback, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import useBreakpoint from './hooks/useBreakpoint';
import { useHashRoute } from './hooks/useHashRoute';
import { DashboardView } from './components/features/dashboard';
import { RouteOptimizationView } from './components/features/routing';
import type { RouteOptimizationParams } from './components/features/routing';
import { TrainingOptimizationView } from './components/features/training';
import { CarbonMonitoringView } from './components/features/carbon';
import { SettingsView } from './components/features/settings';
import { ComplianceSecurityView } from './components/features/compliance';
import { OrderManagementView } from './components/features/orders';
import { CustomerServiceView } from './components/features/customer-service';
import { ToastProvider } from './components/ui';
import { LoginView } from './components/features/auth';
import { authApi } from '@services';
import { useGlobalStore } from './stores/useGlobalStore';

// 合法视图清单：URL Hash 路由据此校验，非法 hash 回退到 'dashboard'
const VALID_VIEWS = [
  'dashboard',
  'route',
  'opti',
  'carbon',
  'compliance',
  'orders',
  'customer_service',
  'settings',
] as const;
const DEFAULT_VIEW = 'dashboard';

const App: React.FC = () => {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';

  // 视图状态通过 URL Hash 持久化：刷新后保持当前页面
  const [activeView, setActiveView] = useHashRoute(VALID_VIEWS, DEFAULT_VIEW);
  const [routeParams, setRouteParams] = useState<RouteOptimizationParams>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('pathoptix-sidebar-collapsed');
    return saved === 'true';
  });
  const [isMobileSidebarVisible, setIsMobileSidebarVisible] = useState(false);

  // ===== 鉴权状态管理 =====
  // 【临时禁用登录验证】isAuthenticated 始终为 true，跳过登录视图直接进入主应用
  // 原逻辑：启动时根据 localStorage 中是否存在 access_token 判断登录态
  // const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
  //   return !!localStorage.getItem('access_token');
  // });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // 【临时禁用登录验证】不再监听 auth:logout 事件，避免 401 时被踢回登录页
  // 原逻辑：监听 axiosInstance 派发的 auth:logout 事件（401 响应时触发）
  // useEffect(() => {
  //   const handleAuthLogout = () => {
  //     setIsAuthenticated(false);
  //     setActiveView('dashboard');
  //   };
  //   window.addEventListener('auth:logout', handleAuthLogout);
  //   return () => window.removeEventListener('auth:logout', handleAuthLogout);
  // }, [setActiveView]);
  useEffect(() => {}, []);

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  // 【临时禁用登录验证】登出按钮不再清除登录态，保持始终登录
  // 原逻辑：authApi.logout() + setIsAuthenticated(false)
  const handleLogout = useCallback(() => {
    authApi.logout();
    // 仍然登出但保持登录态（不切回登录视图）
    setActiveView('dashboard');
  }, []);

  // 窗口断点变化时自动调整 Sidebar 状态
  useEffect(() => {
    if (isMobile) {
      // 移动端：隐藏侧边栏
      setIsMobileSidebarVisible(false);
    } else if (isTablet) {
      // 平板：自动折叠为图标模式
      setIsMobileSidebarVisible(false);
      setIsSidebarCollapsed(true);
      localStorage.setItem('pathoptix-sidebar-collapsed', 'true');
    }
    // 桌面端：保持用户上次的折叠偏好，不做强制修改
  }, [isMobile, isTablet]);

  // S2-T06: 应用启动时从后端 system_config 表同步全局状态
  // 包括极绿模式、Agent 全托管、RAG 开关、当前模型 ID
  const loadFromServer = useGlobalStore((s) => s.loadFromServer);
  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileSidebarVisible(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('pathoptix-sidebar-collapsed', String(next));
        return next;
      });
    }
  }, [isMobile]);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarVisible(false);
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView onViewChange={setActiveView} />;
      case 'route': return <RouteOptimizationView key={JSON.stringify(routeParams)} initialParams={routeParams} />;
      case 'opti': return <TrainingOptimizationView />;
      case 'carbon': return <CarbonMonitoringView onViewChange={setActiveView} />;
      case 'compliance': return <ComplianceSecurityView onNavigateToRoute={(params) => { setRouteParams(params); setActiveView('route'); }} />;
      case 'orders': return <OrderManagementView />;
      case 'customer_service': return <CustomerServiceView />;
      case 'settings': return <SettingsView onLogout={handleLogout} />;
      default: return <DashboardView onViewChange={setActiveView} />;
    }
  };

  // 未登录时仅渲染登录视图，不加载主应用骨架
  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <LoginView onLogin={handleLogin} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
    <div className="flex h-screen bg-bg-primary text-text-secondary overflow-hidden font-inter transition-colors duration-300">
      {/* 移动端遮罩层 */}
      {isMobile && isMobileSidebarVisible && (
        <div
          className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300"
          onClick={closeMobileSidebar}
        />
      )}

      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={isMobile ? false : isSidebarCollapsed}
        isMobileOverlay={isMobile}
        isMobileVisible={isMobileSidebarVisible}
        onMobileClose={closeMobileSidebar}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* 移动端汉堡菜单按钮 */}
        {isMobile && (
          <button
            onClick={() => setIsMobileSidebarVisible(true)}
            className="absolute top-4 left-4 z-10 p-2 rounded-xl bg-bg-secondary/80 border border-border-default text-text-secondary hover:text-brand-primary hover:border-brand-primary/30 transition-all duration-300 backdrop-blur-sm"
            aria-label="打开菜单"
          >
            <Menu size={20} />
          </button>
        )}

        <Header onLogout={handleLogout} onViewChange={setActiveView} isSidebarCollapsed={isMobile ? false : isSidebarCollapsed} onToggleSidebar={toggleSidebar} />
        <div className="flex-1 overflow-y-auto">
          {renderView()}
        </div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 blur-[150px] rounded-full -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full -z-10" />
      </main>
    </div>
    </ToastProvider>
  );
};

export default App;
