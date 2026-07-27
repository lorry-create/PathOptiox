
import React, { useState, useEffect } from 'react';
import { Clock, Database, Cpu, HardDrive, Network } from 'lucide-react';

const BottomMetrics: React.FC = () => {
  // 动态数据状态
  const [gpuUtil, setGpuUtil] = useState(94);
  const [throughput, setThroughput] = useState(1850);
  const [vramUsed, setVramUsed] = useState(9.2);
  const [trainDays, setTrainDays] = useState(2);
  const [trainHours, setTrainHours] = useState(3);
  const [trainMins, setTrainMins] = useState(14);
  const [dataSize, setDataSize] = useState(18.7);

  // 模拟实时数据波动
  useEffect(() => {
    const timer = setInterval(() => {
      setGpuUtil(prev => Math.min(99, Math.max(85, prev + (Math.random() - 0.45) * 3)));
      setThroughput(prev => Math.min(2200, Math.max(1500, prev + Math.round((Math.random() - 0.45) * 50))));
      setVramUsed(prev => Math.min(14.5, Math.max(8.0, prev + (Math.random() - 0.5) * 0.3)));
      setTrainMins(prev => {
        const next = prev + 1;
        if (next >= 60) {
          setTrainHours(h => {
            const nh = h + 1;
            if (nh >= 24) {
              setTrainDays(d => d + 1);
              return 0;
            }
            return nh;
          });
          return 0;
        }
        return next;
      });
      setDataSize(prev => Math.min(22.0, Math.max(18.0, prev + (Math.random() - 0.4) * 0.05)));
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const fmt = (n: number, d: number) => Number(n.toFixed(d));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-6">
      <MetricCard
        icon={<Clock size={20} />}
        label="训练用时"
        value={`${trainDays}d ${String(trainHours).padStart(2, '0')}h ${String(trainMins).padStart(2, '0')}m`}
      />
      <MetricCard
        icon={<Database size={20} />}
        label="数据集"
        value={`${fmt(dataSize, 1)} GB`}
      />
      <MetricCard
        icon={<Cpu size={20} />}
        label="GPU 利用率"
        value={`${fmt(gpuUtil, 0)}%`}
        accent="text-amber-500"
      />
      <MetricCard
        icon={<HardDrive size={20} />}
        label="显存占用"
        value={`${fmt(vramUsed, 1)} / 16 GB`}
      />
      <MetricCard
        icon={<Network size={20} />}
        label="当前训练模型"
        value="全球主干网 v2.4"
        accent="text-emerald-500"
      />
    </div>
  );
};

const MetricCard = ({ icon, label, value, accent = "text-text-primary" }: any) => (
  <div className="bg-bg-secondary rounded-2xl p-3 xl:p-6 border border-border-default flex items-center gap-3 xl:gap-6 group hover:border-blue-500/30 transition-all duration-300">
    <div className="w-10 h-10 xl:w-14 xl:h-14 bg-bg-modal rounded-xl xl:rounded-2xl flex items-center justify-center text-text-muted group-hover:text-blue-400 transition-colors duration-300 shrink-0">
      {icon}
    </div>
    <div className="flex flex-col gap-0.5 xl:gap-1 min-w-0">
      <span className="text-[9px] xl:text-[10px] text-text-muted font-black uppercase tracking-widest truncate">{label}</span>
      <span className={`text-base xl:text-xl font-black ${accent} tabular-nums`}>{value}</span>
    </div>
  </div>
);

export default BottomMetrics;
