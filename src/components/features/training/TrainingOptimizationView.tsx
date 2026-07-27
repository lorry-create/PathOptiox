
import React, { useState, useCallback } from 'react';
import ParamConfig from './ParamConfig';
import ModelEval from './ModelEval';
import Monitor from './Monitor';
import Visualizer from './Visualizer';
import HistoryPanel from './HistoryPanel';
import LogPanel from './LogPanel';
import BottomMetrics from './BottomMetrics';

export interface PathStepLog {
  id: number;
  time: string;
  msg: string;
  color: string;
  routeLabel?: string;
}

const TrainingOptimizationView: React.FC = () => {
  const [pathStepLogs, setPathStepLogs] = useState<PathStepLog[]>([]);

  const addPathStepLog = useCallback((log: PathStepLog) => {
    setPathStepLogs(prev => [...prev.slice(-199), log]);
  }, []);

  return (
    <div className="p-3 md:p-6 bg-bg-primary min-h-full flex flex-col gap-3 md:gap-6 animate-in fade-in duration-700">
      <BottomMetrics />

      <div className="flex flex-col xl:flex-row flex-1 gap-3 md:gap-6 min-h-0">
        {/* 左侧：配置与评估 */}
        <div className="w-full xl:w-64 flex flex-col gap-3 md:gap-6 xl:shrink-0">
          <ParamConfig />
          <ModelEval />
        </div>

        {/* 中间：监控与可视化 */}
        <div className="flex-1 flex flex-col gap-3 md:gap-6 min-w-0">
          <Monitor />
          <Visualizer onPathStep={addPathStepLog} />
        </div>

        {/* 右侧：历史与日志 — min-h-0 确保 flex 子元素可收缩 */}
        <div className="w-full xl:w-80 flex flex-col gap-3 md:gap-6 xl:shrink-0 min-h-0">
          <HistoryPanel />
          <LogPanel pathStepLogs={pathStepLogs} />
        </div>
      </div>
    </div>
  );
};

export default TrainingOptimizationView;
