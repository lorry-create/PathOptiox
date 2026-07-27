
import React from 'react';
import StatCard from '@ui/StatCard';
import ChartCard from '@ui/ChartCard';
import MapWidget from '@ui/MapWidget';
import AlertPanel from '@ui/AlertPanel';
import { ToastProvider } from '@ui/Toast';
import ConsoleModule from './Console/ConsoleModule';

interface DashboardViewProps {
  onViewChange?: (view: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onViewChange }) => {
  return (
    <ToastProvider>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-10 max-w-[2000px] mx-auto w-full animate-in fade-in duration-700">
        {/* 1. 综合控制台模块 (核心位置：最顶端) */}
        <ConsoleModule />

        {/* 2. 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          <StatCard label="多目标综合达成率" value="93.1%" trend="+2.1%" type="line" color="#00F2FF" />
          <div onClick={() => onViewChange?.('compliance')} className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-95">
            <StatCard label="拥堵节点" value="14" subtitle="较昨日 +2" type="bar" color="#F59E0B" status="warning" />
          </div>
          <div onClick={() => onViewChange?.('opti')} className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-95">
            <StatCard label="模型引擎" value="v2.4" badge="稳定版" type="none" status="success" />
          </div>
          <StatCard label="平均交付周期" value="14.2d" subtitle="全球平均 · 较上周 -0.8d" type="none" />
        </div>

        {/* 3. 图表分析区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          <ChartCard title="运输方式" type="donut" data={[{ name: '海运', value: 65, color: '#00F2FF' }, { name: '空运', value: 20, color: '#4B5563' }, { name: '铁运/陆运', value: 15, color: '#F59E0B' }]} centerLabel="65%" centerSub="海运" />
          <ChartCard title="区域任务分布" type="pie" data={[{ name: '北美', value: 35, color: '#00F2FF' }, { name: '欧洲', value: 30, color: '#10B981' }, { name: '东南亚', value: 20, color: '#F59E0B' }, { name: '其他', value: 15, color: '#8B5CF6' }]} />
          <ChartCard title="成本结构" type="donut" data={[{ name: '干线运输', value: 50, color: '#00F2FF' }, { name: '关税清关', value: 25, color: '#F59E0B' }, { name: '仓储中转', value: 15, color: '#4B5563' }, { name: '其他', value: 10, color: '#9CA3AF' }]} />
        </div>

        {/* 4. 全球地图与实时警报 */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          <div className="xl:col-span-3"><MapWidget /></div>
          <div className="xl:col-span-1"><AlertPanel /></div>
        </div>
      </div>
    </ToastProvider>
  );
};

export default DashboardView;
