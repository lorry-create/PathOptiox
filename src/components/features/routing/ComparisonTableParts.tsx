
import React, { useEffect, useState, useRef } from 'react';

// ================================================================
// 数字滚动动画组件
// ================================================================

interface NumberRollerProps {
  value: string;
  className?: string;
}

const NumberRoller: React.FC<NumberRollerProps> = ({ value, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;

    // 简单闪烁 + 快速切换效果
    let frame = 0;
    const totalFrames = 12;
    const chars = '0123456789$-,';
    const interval = setInterval(() => {
      frame++;
      if (frame >= totalFrames) {
        setDisplayValue(value);
        clearInterval(interval);
        return;
      }
      // 逐步锁定字符 (从左到右)
      const lockedCount = Math.floor((frame / totalFrames) * value.length);
      let scrambled = '';
      for (let i = 0; i < value.length; i++) {
        if (i < lockedCount || value[i] === ' ' || value[i] === '-') {
          scrambled += value[i];
        } else if (chars.includes(value[i])) {
          scrambled += chars[Math.floor(Math.random() * chars.length)];
        } else {
          scrambled += value[i];
        }
      }
      setDisplayValue(scrambled);
    }, 40);

    return () => clearInterval(interval);
  }, [value]);

  return <span className={className}>{displayValue}</span>;
};

// ================================================================
// 对比行
// ================================================================

interface ComparisonRowProps {
  label: string;
  baseValue: string;
  baseSub?: string;
  baseWarning?: boolean;
  baseType?: string;
  baseBarPercent?: number;
  baseBarColor?: string;
  robustValue: string;
  robustSub?: string;
  robustActive?: boolean;
  robustType?: string;
  robustBarColor?: string;
  robustBarPercent?: number;
  optimizationRate?: number;
  isStress?: boolean;
  rateLabel?: string;
}

const ComparisonRow: React.FC<ComparisonRowProps> = ({
  label, baseValue, baseSub, baseWarning, baseType, baseBarPercent, baseBarColor,
  robustValue, robustSub, robustActive, robustType, robustBarColor, robustBarPercent,
  optimizationRate, isStress, rateLabel
}) => (
  <div className="grid grid-cols-12 border-b border-border-default/20 py-5 items-center group">
    <div className="col-span-3">
      <div className="text-[10px] font-black text-text-muted uppercase tracking-wide">{label}</div>
    </div>
    <div className={`col-span-4 px-4 border-r border-border-default/50 ${isStress ? 'bg-red-500/[0.03]' : ''}`}>
      <NumberRoller
        value={baseValue}
        className={`text-lg font-black ${baseWarning ? 'text-orange-500' : 'text-text-secondary'} tracking-tighter`}
      />
      {baseSub && <div className="text-[9px] text-text-muted font-black mt-0.5 uppercase tracking-tighter">{baseSub}</div>}
      {baseType === 'bar' && (
        <div className="mt-3 h-1.5 w-32 bg-bg-primary rounded-full overflow-hidden">
          <div className={`h-full ${baseBarColor} opacity-80 transition-all duration-700`} style={{ width: `${baseBarPercent}%` }} />
        </div>
      )}
    </div>
    <div className={`col-span-5 px-6 py-2 rounded-xl transition-all duration-300 ${robustActive ? (isStress ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'bg-emerald-500/5') : ''}`}>
      <div className="flex items-center gap-2">
        <NumberRoller
          value={robustValue}
          className="text-lg font-black text-text-secondary tracking-tighter"
        />
        {optimizationRate != null && (
          <span className={`text-[8px] font-black uppercase tracking-tighter ${isStress ? 'text-emerald-400' : 'text-emerald-500'}`}>
            {rateLabel || '↑ 优化率'} {optimizationRate}%
          </span>
        )}
      </div>
      {robustSub && <div className="text-[9px] text-text-muted font-black mt-0.5 uppercase tracking-tighter">{robustSub}</div>}
      {robustType === 'bar' && (
        <div className="mt-3 h-1.5 w-full bg-bg-primary rounded-full overflow-hidden shadow-inner">
          <div className={`h-full ${robustBarColor} shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-700`} style={{ width: `${robustBarPercent}%` }} />
        </div>
      )}
    </div>
  </div>
);

export { NumberRoller, ComparisonRow };
