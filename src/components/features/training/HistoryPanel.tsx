
import React from 'react';
import { History } from 'lucide-react';
import { useToast } from '@/components/ui';

const HistoryPanel: React.FC = () => {
  return (
    <div className="bg-bg-secondary rounded-2xl p-4 md:p-6 border border-border-default flex flex-col gap-4 md:gap-6 min-h-[200px] xl:h-1/3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-text-secondary">
          <History size={16} className="text-blue-400" />
          <span className="text-xs font-bold tracking-wider uppercase">训练历史</span>
        </div>
        <span className="text-[10px] text-text-muted font-bold uppercase">总计: 42</span>
      </div>

      <div className="space-y-3 overflow-y-auto scrollbar-hide pr-1">
        <HistoryItem id="EXP_2024_01" rate={92} time="2h 15m" />
        <HistoryItem id="EXP_2024_02" rate={84} time="1h 40m" />
      </div>
    </div>
  );
};

interface HistoryItemProps {
  id: string;
  rate: number;
  time: string;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ id, rate, time }) => {
  const { showToast } = useToast();

  return (
    <div className="bg-bg-modal p-4 rounded-xl border border-border-default hover:border-blue-500/30 transition-all duration-300 cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[11px] font-black text-text-secondary group-hover:text-blue-400 transition-colors duration-300">{id}</span>
        <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black rounded">{rate}% 成功率</div>
      </div>
      <div className="flex justify-between text-[10px] text-text-muted font-bold uppercase">
        <span>学习率: 0.0005</span>
        <span>用时: {time}</span>
      </div>
      {/* 右下角操作按钮 */}
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border-default/50">
        <button
          onClick={(e) => {
            e.stopPropagation();
            showToast(`已加载参数 ${id}`);
          }}
          className="px-2 py-1 text-[10px] font-bold text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all duration-200 cursor-pointer"
        >
          加载参数
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            showToast(`${id} 已部署上线`);
          }}
          className="px-2 py-1 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all duration-200 cursor-pointer"
        >
          部署上线
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            showToast(`已删除 ${id}`);
          }}
          className="px-2 py-1 text-[10px] font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all duration-200 cursor-pointer"
        >
          删除
        </button>
      </div>
    </div>
  );
};

export default HistoryPanel;
