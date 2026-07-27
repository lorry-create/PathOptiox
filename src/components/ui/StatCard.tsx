
import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useChartTheme } from '@hooks/useChartTheme';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  subtitle?: string;
  badge?: string;
  type: 'line' | 'bar' | 'none';
  color?: string;
  status?: 'warning' | 'success' | 'none';
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, trend, subtitle, badge, type, color = '#00F2FF', status, icon
}) => {
  const dummyData = useMemo(
    () => Array.from({ length: 10 }, (_, i) => ({ value: 20 + Math.random() * 80 })),
    []
  );
  const chartTheme = useChartTheme();

  return (
    <div className="bg-bg-secondary rounded-xl p-5 border border-border-default hover:border-border-input transition-all group overflow-hidden relative duration-300">
      <div className="flex justify-between items-start mb-4">
        <span className="text-text-muted text-xs font-medium">{label}</span>
        {status === 'warning' && <AlertCircle className="text-amber-500" size={16} />}
        {status === 'success' && <CheckCircle className="text-cyan-400" size={16} />}
        {label === '多目标综合达成率' && <TrendingUp className="text-cyan-400" size={16} />}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-text-primary tracking-tight">{value}</span>
        {trend && <span className="text-xs font-bold text-cyan-400">{trend}</span>}
        {badge && (
          <span className="ml-2 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400 rounded-full font-bold uppercase">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto">
        <div className="text-[10px] text-text-muted font-medium">{subtitle}</div>
        <div className="h-8 w-24">
          {type === 'line' && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={dummyData}>
                <Line type="monotone" dataKey="value" stroke={chartTheme.colors[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {type === 'bar' && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={dummyData}>
                <Bar dataKey="value" fill={chartTheme.colors[0]} radius={[1, 1, 0, 0]} fillOpacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      
      {type === 'line' && <div className="absolute bottom-0 left-0 h-1 bg-cyan-500 w-2/3 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />}
    </div>
  );
};

export default StatCard;
