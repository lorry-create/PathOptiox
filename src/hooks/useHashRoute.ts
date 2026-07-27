import { useCallback, useEffect, useState } from 'react';

/**
 * useHashRoute - 基于 window.location.hash 的轻量路由 Hook
 *
 * 设计目标：不引入 react-router-dom，仅在刷新后保留当前视图。
 * - URL 形如 `http://localhost:3000/#orders`，hash 值就是当前视图名
 * - 监听 hashchange 事件，支持浏览器前进/后退
 * - 设置新视图时同步写回 hash，确保刷新可恢复
 *
 * @param validViews 合法视图名清单（不在清单内的 hash 会回退到默认视图）
 * @param defaultView 默认视图
 */
export function useHashRoute(validViews: readonly string[], defaultView: string) {
  const parseHash = useCallback(
    (rawHash: string): string => {
      // 去除前导 '#' 与可能的查询参数，仅保留视图名
      const view = rawHash.replace(/^#\/?/, '').split('?')[0];
      return validViews.includes(view) ? view : defaultView;
    },
    [validViews, defaultView]
  );

  const [view, setViewState] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultView;
    return parseHash(window.location.hash);
  });

  // 监听浏览器前进/后退与外部 hash 修改
  useEffect(() => {
    const handleHashChange = () => {
      setViewState(parseHash(window.location.hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [parseHash]);

  // 切换视图时同步 hash（仅在视图真正变化时写入，避免循环触发）
  const setView = useCallback(
    (next: string) => {
      const normalized = validViews.includes(next) ? next : defaultView;
      setViewState(prev => {
        if (prev === normalized) return prev;
        // 使用 replaceState 避免 hash 变化触发额外 hashchange 事件
        // （setState 已同步视图，无需再让事件回路一遍）
        const newHash = `#${normalized}`;
        if (window.location.hash !== newHash) {
          window.history.replaceState(null, '', newHash);
        }
        return normalized;
      });
    },
    [validViews, defaultView]
  );

  return [view, setView] as const;
}
