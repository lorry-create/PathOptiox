
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Filter, Trash2, Download } from 'lucide-react';
import { useTheme } from '@hooks/useTheme';
import { useToast } from '@/components/ui';
import type { PathStepLog } from './TrainingOptimizationView';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  id: number;
  time: string;
  msg: string;
  color: string;
  level: LogLevel;
  routeLabel?: string;
}

interface LogPanelProps {
  pathStepLogs?: PathStepLog[];
}

const ROUTE_COLORS: Record<string, string> = {
  '西线': 'bg-cyan-400',
  '中线': 'bg-violet-400',
  '东线': 'bg-amber-400',
  '成本': 'bg-cyan-400',
  '时效': 'bg-violet-400',
  '鲁棒': 'bg-amber-400',
};

// 按级别上色：普通信息灰色、警告橙色、错误红色
const LEVEL_COLOR: Record<LogLevel, string> = {
  info: 'text-text-muted',
  warn: 'text-amber-500',
  error: 'text-red-500',
};

const LogPanel: React.FC<LogPanelProps> = ({ pathStepLogs = [] }) => {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, color: "text-emerald-500", level: 'info',  time: "14:24:01", msg: "环境初始化成功: Warehouse-Grid-v4" },
    { id: 2, color: "text-text-muted",  level: 'info',  time: "14:24:02", msg: "加载权重文件: dqn_v25_weights.h5" },
    { id: 3, color: "text-blue-400",    level: 'info',  time: "14:24:05", msg: "代理已注册: POS(0,0,0) 状态: 就绪" },
    { id: 4, color: "text-text-muted",  level: 'info',  time: "14:24:08", msg: "训练回合 748: R=142.5 L=0.0021" },
    { id: 5, color: "text-blue-500 font-black", level: 'info', time: "14:24:09", msg: "回合 749: 发现新的全局最优解 (R=151.6)" },
    { id: 6, color: "text-amber-500",   level: 'warn',  time: "14:24:11", msg: "[警告] 检测到 GPU 显存紧张 (85% 阈值)" },
    { id: 7, color: "text-slate-400",   level: 'info',  time: "14:24:12", msg: "训练回合 750: R=138.2 L=0.0019" },
  ]);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  // 路径步进日志注入
  useEffect(() => {
    if (pathStepLogs.length === 0) return;
    const latestLog = pathStepLogs[pathStepLogs.length - 1];
    setLogs(prev => {
      if (prev.some(l => l.id === latestLog.id)) return prev;
      // 路径步进日志默认按 info 级别显示，颜色由路线决定
      return [...prev.slice(-199), { ...latestLog, level: 'info' as LogLevel, routeLabel: latestLog.routeLabel }];
    });
  }, [pathStepLogs]);

  // 自动滚动到底部（仅在用户未手动上翻时）
  useEffect(() => {
    if (isAutoScrollRef.current && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // 检测用户是否手动上翻
  const handleScroll = () => {
    if (!logContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  // 常规训练日志（低频，60s 一次）
  useEffect(() => {
    const logMessages: { msg: string; color: string; level: LogLevel }[] = [
      { msg: "执行模型权重全局下发...", color: "text-blue-400", level: 'info' },
      { msg: "训练回合 {episode}: R={reward} L={loss}", color: "text-slate-400", level: 'info' },
      { msg: "发现新的全局最优解 (R={reward})", color: "text-blue-500 font-black", level: 'info' },
      { msg: "[警告] 节点响应延迟波动 (> 45ms)", color: "text-amber-500", level: 'warn' },
      { msg: "[警告] 苏伊士运河通航等待时长上升", color: "text-amber-500", level: 'warn' },
      { msg: "[错误] 鹿特丹港清关数据接口超时, 已切换备用通道", color: "text-red-500", level: 'error' },
      { msg: "[错误] 模型权重校验失败, 已回滚至上一检查点", color: "text-red-500", level: 'error' },
      { msg: "策略梯度更新完成，开始同步 Cluster B", color: "text-cyan-400", level: 'info' },
      { msg: "探索率 (Epsilon) 已衰减至 0.045", color: "text-text-muted", level: 'info' },
      { msg: "检查点已自动保存: checkpoint_750.h5", color: "text-emerald-500/80", level: 'info' },
      { msg: "环境步进成功，当前平均步骤奖励: +0.24", color: "text-text-muted", level: 'info' },
    ];

    const interval = setInterval(() => {
      const randomMsg = logMessages[Math.floor(Math.random() * logMessages.length)];
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      let finalMsg = randomMsg.msg
        .replace('{episode}', Math.floor(Math.random() * 1000 + 750).toString())
        .replace('{reward}', (Math.random() * 50 + 130).toFixed(1))
        .replace('{loss}', (Math.random() * 0.005).toFixed(4));

      const newLog: LogEntry = {
        id: Date.now(),
        time: timeStr,
        msg: finalMsg,
        color: randomMsg.color,
        level: randomMsg.level,
      };

      setLogs(prev => [...prev.slice(-199), newLog]);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleFilter = () => {
    showToast('日志筛选已开启');
  };

  const handleClear = () => {
    setLogs([]);
    showToast('日志已清空');
  };

  const handleDownload = () => {
    showToast('日志文件已开始下载');
  };

  return (
    <div className="bg-bg-secondary rounded-2xl p-4 md:p-6 border border-border-default flex flex-col h-[300px] xl:h-[700px] overflow-hidden">
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 text-text-secondary">
          <Terminal size={16} className="text-blue-400" />
          <span className="text-xs font-bold tracking-wider uppercase">实时日志</span>
        </div>
        <div className="flex items-center gap-3">
          {/* 3 个图标按钮 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleFilter}
              title="筛选"
              className="p-1.5 rounded-lg text-text-muted hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200 cursor-pointer"
            >
              <Filter size={13} />
            </button>
            <button
              onClick={handleClear}
              title="清空"
              className="p-1.5 rounded-lg text-text-muted hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200 cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={handleDownload}
              title="下载"
              className="p-1.5 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer"
            >
              <Download size={13} />
            </button>
          </div>
          <span className="w-px h-3 bg-border-default" />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">传输中</span>
          </div>
        </div>
      </div>

      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className={`flex-1 min-h-0 rounded-xl p-4 font-mono text-[10px] space-y-1.5 overflow-y-auto border border-border-default shadow-inner mt-4 ${isDark ? 'bg-black/40' : 'bg-bg-elevated'}`}
      >
        {logs.length === 0 && (
          <div className="text-text-muted text-center py-8">暂无日志</div>
        )}
        {logs.map((log: LogEntry) => (
          <LogLine
            key={log.id}
            color={log.color}
            level={log.level}
            time={log.time}
            msg={log.msg}
            routeLabel={log.routeLabel}
          />
        ))}
      </div>
    </div>
  );
};

interface LogLineProps {
  color: string;
  level: LogLevel;
  time: string;
  msg: string;
  routeLabel?: string;
}

const LogLine: React.FC<LogLineProps> = ({ color, level, time, msg, routeLabel }) => {
  // 路径步进日志保留路线颜色；其他日志按级别上色
  const textColor = routeLabel ? color : LEVEL_COLOR[level];
  return (
    <div className="flex gap-2 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-300">
      <span className="text-text-muted shrink-0">[{time}]</span>
      {routeLabel && (
        <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${ROUTE_COLORS[routeLabel] || 'bg-text-muted'}`} />
      )}
      <span className={textColor}>{msg}</span>
    </div>
  );
};

export default LogPanel;
