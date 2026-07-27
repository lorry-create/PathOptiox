
import React, { useState, useEffect } from 'react';
import { Play, Pause, Save, LineChart as ChartIcon } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useChartTheme } from '@hooks/useChartTheme';

const dummyData = Array.from({ length: 20 }, (_, i) => ({
  step: i,
  reward: 20 + Math.sin(i * 0.5) * 10 + Math.random() * 5,
  loss: 80 - i * 3 + Math.random() * 5
}));

const Monitor: React.FC = () => {
  const maxSteps = 1500;
  const [progress, setProgress] = useState(750);
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isTraining) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= maxSteps) {
            setIsTraining(false);
            return maxSteps;
          }
          return prev + 1;
        });
      }, 100); // 模拟训练步进速度
    }
    return () => clearInterval(interval);
  }, [isTraining]);

  const handleStart = () => {
    if (progress >= maxSteps) setProgress(0);
    setIsTraining(true);
  };

  const handlePause = () => {
    setIsTraining(false);
  };

  const handleSaveBest = () => {
    alert(`[系统通知] 成功捕获并保存当前最优权重！\n当前回合: ${progress}\n评估奖励: +482.4`);
  };

  const percent = ((progress / maxSteps) * 100).toFixed(1);
  const chartTheme = useChartTheme();

  return (
    <div className="bg-bg-secondary rounded-3xl p-4 md:p-8 border border-border-default shadow-2xl space-y-4 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-text-primary">训练监控</h2>
          <p className="text-xs text-text-muted mt-1 uppercase tracking-widest">实时奖励/损失同步</p>
        </div>
        <div className="flex gap-2 md:gap-3 flex-wrap">
          <button
            onClick={handleStart}
            disabled={isTraining}
            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 md:gap-2 transition-all ${
              isTraining ? 'bg-blue-600/50 text-white/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95'
            }`}
          >
            <Play size={14} fill="currentColor" /> 开始
          </button>
          <button
            onClick={handlePause}
            disabled={!isTraining}
            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 md:gap-2 transition-all ${
              !isTraining ? 'bg-bg-tertiary/50 text-text-muted cursor-not-allowed' : 'bg-bg-tertiary hover:bg-bg-tertiary text-text-muted text-text-secondary active:scale-95'
            }`}
          >
            <Pause size={14} fill="currentColor" /> 暂停
          </button>
          <button
            onClick={handleSaveBest}
            className="px-4 md:px-6 py-2 md:py-2.5 bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-black flex items-center gap-1.5 md:gap-2 transition-all hover:bg-emerald-600/20 active:scale-95"
          >
            <Save size={14} /> 保存最优
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-text-muted">
          <div className="flex items-center gap-2">
            <span>回合训练进度</span>
            <span className="text-text-muted text-text-secondary font-mono">({progress} / {maxSteps})</span>
          </div>
          <span className="text-blue-400 font-mono">{percent}%</span>
        </div>
        <div className="w-full h-3 bg-bg-secondary rounded-full p-0.5 border border-border-default">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all duration-300 ease-linear" 
            style={{ width: `${percent}%` }} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 h-40 md:h-48">
        <ChartBox title="奖励曲线" data={dummyData} dataKey="reward" color="#3B82F6" chartTheme={chartTheme} />
        <ChartBox title="损失函数" data={dummyData} dataKey="loss" color="#EF4444" chartTheme={chartTheme} />
      </div>
    </div>
  );
};

const ChartBox = ({ title, data, dataKey, color, chartTheme }: any) => (
  <div className="bg-bg-modal rounded-2xl p-4 border border-border-default flex flex-col relative overflow-hidden group">
    <span className="text-[10px] text-text-muted font-black uppercase mb-2 absolute top-4 left-4 z-10">{title}</span>
    <div className="flex-1 opacity-60 group-hover:opacity-100 transition-opacity mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke={chartTheme?.gridColor} />
          <XAxis stroke={chartTheme?.axisTextColor} fontSize={10} />
          <YAxis stroke={chartTheme?.axisTextColor} fontSize={10} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default Monitor;
