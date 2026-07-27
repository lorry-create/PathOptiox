import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface CollapseToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { container: 'w-7 h-7', icon: 14 },
  md: { container: 'w-8 h-8', icon: 16 },
  lg: { container: 'w-9 h-9', icon: 18 },
};

const CollapseToggle: React.FC<CollapseToggleProps> = ({
  isCollapsed,
  onToggle,
  className = '',
  size = 'md',
}) => {
  const config = sizeConfig[size];

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary/50 transition-colors duration-200 ${config.container} ${className}`}
      aria-label={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
      aria-expanded={!isCollapsed}
    >
      {isCollapsed
        ? <PanelLeftOpen size={config.icon} />
        : <PanelLeftClose size={config.icon} />
      }
    </button>
  );
};

export default CollapseToggle;
