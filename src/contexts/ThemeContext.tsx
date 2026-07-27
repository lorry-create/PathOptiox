import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  isDark: true,
  isLight: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = 'pathoptix-theme';

/**
 * 读取持久化主题：
 * 1. 优先取 localStorage 中用户上次的选择
 * 2. 回退到系统偏好（prefers-color-scheme）
 * 3. 最终默认 'dark'（项目主基调）
 */
const readPersistedTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // localStorage 被禁用（隐私模式等），静默回退到系统偏好
  }
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
};

/**
 * 同步主题到 DOM 与 localStorage：
 * - document.documentElement.dataset.theme 供 CSS 选择器使用
 * - document.documentElement.classList 的 `dark` 供 Tailwind dark: 变体使用
 */
const syncThemeToDOM = (theme: Theme) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
};

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 初始化时同步读取 localStorage，避免刷新后回到默认主题
  const [theme, setThemeState] = useState<Theme>(readPersistedTheme);

  // 首次挂载时立即同步 DOM（防止 SSR/首屏闪烁），并在主题变化时持久化
  useEffect(() => {
    syncThemeToDOM(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // 隐私模式或配额超限，忽略写入错误
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === 'dark',
      isLight: theme === 'light',
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export { ThemeProvider, ThemeContext };
