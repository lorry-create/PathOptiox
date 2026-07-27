import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { button: 'w-7 h-7', icon: 14 },
  md: { button: 'w-9 h-9', icon: 18 },
  lg: { button: 'w-11 h-11', icon: 22 },
};

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', size = 'md' }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const config = sizeConfig[size];

  const label = isDark ? '切换到亮色模式' : '切换到暗色模式';

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center rounded-lg text-text-muted hover:text-text-secondary transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] focus-visible:ring-offset-2 ${config.button} ${className}`}
      aria-label={label}
      title={label}
      type="button"
    >
      <Sun
        className={`absolute transition-all duration-300 ease-in-out ${
          isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        }`}
        size={config.icon}
      />
      <Moon
        className={`absolute transition-all duration-300 ease-in-out ${
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
        }`}
        size={config.icon}
      />
    </button>
  );
};

export default ThemeToggle;
