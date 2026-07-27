
import React, { useState, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { MoreVertical, Eye, Download } from 'lucide-react';
import { useChartTheme } from '@hooks/useChartTheme';

interface ChartCardProps {
  title: string;
  type: 'pie' | 'donut';
  data: Array<{ name: string; value: number; color: string }>;
  centerLabel?: string;
  centerSub?: string;
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="none"
        className="transition-all duration-300 ease-out cursor-pointer"
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload, chartTheme }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ ...chartTheme.tooltipStyle, padding: '12px 16px' }}>
        <p style={{ fontSize: '12px', fontWeight: 900, fontStyle: 'italic' }}>
          {payload[0].name} : <span style={{ color: '#22d3ee' }}>{payload[0].value}%</span>
        </p>
      </div>
    );
  }
  return null;
};

const ChartCard: React.FC<ChartCardProps> = ({ title, type, data, centerLabel, centerSub }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const chartTheme = useChartTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuAction = (action: string) => {
    setMenuOpen(false);
    // 占位行为：实际项目中可触发明细弹窗或数据导出
    void action;
  };

  return (
    <div className="bg-bg-secondary/60 backdrop-blur-2xl rounded-[32px] p-6 border border-border-default flex flex-col h-[380px] shadow-2xl relative group overflow-hidden transition-all hover:border-border-input duration-300">
      <div className="flex justify-between items-center mb-2 z-10">
        <div className="flex items-center gap-3">
           <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor] ${title === '运输方式' ? 'text-cyan-400 bg-cyan-400' : 'text-emerald-400 bg-emerald-400'}`} />
           <h3 className="text-[11px] font-black text-text-primary uppercase tracking-[0.2em] italic opacity-80">{title}</h3>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-md hover:bg-bg-tertiary"
            aria-label="更多操作"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute top-full right-0 mt-1 w-32 bg-bg-secondary backdrop-blur-2xl border border-border-default rounded-xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 z-30">
              <button
                onClick={() => handleMenuAction('查看明细')}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                <Eye size={13} className="text-text-muted" />
                查看明细
              </button>
              <button
                onClick={() => handleMenuAction('导出数据')}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors border-t border-border-default/40"
              >
                <Download size={13} className="text-text-muted" />
                导出数据
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
        <div className="w-full h-full min-h-[200px] filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.7)]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex !== null ? activeIndex : undefined}
                activeShape={renderActiveShape}
                data={data}
                innerRadius={type === 'donut' ? '65%' : '0%'}
                outerRadius="85%"
                paddingAngle={0} 
                dataKey="value"
                stroke="none" 
                strokeWidth={0}
                startAngle={90}
                endAngle={450}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                className="outline-none"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    className="transition-all duration-700 hover:opacity-90"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip chartTheme={chartTheme} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {centerLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <span className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">{centerSub}</span>
            <span className="text-4xl font-black text-text-primary tracking-tighter italic leading-none drop-shadow-md">{centerLabel}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-2 px-2 z-10">
        {data.map((item, idx) => (
          <div 
            key={idx} 
            className={`flex items-center justify-between transition-all duration-300 ${activeIndex === idx ? 'scale-105 origin-left' : 'opacity-70'}`}
            onMouseEnter={() => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-sm shadow-[0_0_8px_rgba(0,0,0,0.3)]" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] font-black text-text-muted uppercase tracking-tight">{item.name}</span>
            </div>
            <span className="text-[13px] font-black text-text-primary italic tracking-tighter tabular-nums">{item.value}%</span>
          </div>
        ))}
      </div>

      <div className="absolute -bottom-10 -right-10 p-4 opacity-[0.03] pointer-events-none transform rotate-45 scale-150">
        <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2v20M2 12h20" />
        </svg>
      </div>
    </div>
  );
};

export default ChartCard;
