import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

const positionStyles: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-3',
};

const arrowStyles: Record<string, string> = {
  right: '-left-[5px] top-1/2 -translate-y-1/2 border-b border-r',
  left: '-right-[5px] top-1/2 -translate-y-1/2 border-b border-l',
  top: 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b',
  bottom: 'top-[-5px] left-1/2 -translate-x-1/2 border-t border-l',
};

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'right',
  className = '',
}) => {
  return (
    <div className={`relative inline-flex group ${className}`}>
      {children}
      <div
        className={`
          absolute ${positionStyles[position]}
          px-3 py-1.5
          bg-bg-elevated/95 backdrop-blur-sm
          border border-border-default
          rounded-lg shadow-sm
          text-text-primary text-xs font-medium
          whitespace-nowrap
          pointer-events-none
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
          z-50
        `}
      >
        {content}
        <span className={`absolute w-1.5 h-1.5 bg-bg-elevated border-border-default rotate-45 ${
          arrowStyles[position]
        }`} />
      </div>
    </div>
  );
};

export default Tooltip;
