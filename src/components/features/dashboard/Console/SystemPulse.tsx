
import React, { useState } from 'react';

type ChartMode = 'business' | 'algorithm';

const SystemPulse: React.FC = () => {
  const [mode, setMode] = useState<ChartMode>('business');

  return (
    <div className="min-h-[150px] md:min-h-[250px] w-full bg-bg-primary rounded-2xl border border-border-default/50 relative overflow-hidden group">
      {/* 顶部 Tab 切换 */}
      <div className="absolute top-2 left-4 z-20 flex items-center gap-1 bg-bg-tertiary/60 backdrop-blur-md rounded-lg p-0.5 border border-border-default/40">
        <button
          onClick={() => setMode('business')}
          className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all duration-300 ${
            mode === 'business'
              ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          业务运营趋势
        </button>
        <button
          onClick={() => setMode('algorithm')}
          className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all duration-300 ${
            mode === 'algorithm'
              ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          引擎算法指标
        </button>
      </div>

      {mode === 'business' ? <BusinessTrendsChart /> : <AlgorithmChart />}
    </div>
  );
};

/** 业务运营趋势：近7天「平均成本下降率」「时效达成率」双折线 */
const BusinessTrendsChart: React.FC = () => {
  return (
    <>
      <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 440 250" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bizGreen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="bizBlue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="bizFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#10b981" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 科幻网格底纹 */}
        <g opacity="0.06">
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="250" stroke="white" strokeWidth="0.5" strokeDasharray="3 6" />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 25} x2="440" y2={i * 25} stroke="white" strokeWidth="0.5" strokeDasharray="3 6" />
          ))}
        </g>

        {/* 7天刻度 */}
        <g opacity="0.35">
          {['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].map((d, i) => (
            <text key={d} x={20 + i * 66.67} y="245" textAnchor="middle" className="fill-[var(--color-text-muted)]" style={{ fontSize: '8px', fontWeight: 800 }}>{d}</text>
          ))}
        </g>

        {/* 成本下降率面积填充（绿） */}
        <path
          d="M20,203 L86.67,173 L153.33,132 L220,115 L286.67,91 L353.33,67 L420,47 L420,250 L20,250 Z"
          fill="url(#bizFill)"
          className="animate-[pulse_3s_ease-in-out_infinite]"
        />

        {/* 平均成本下降率（绿） */}
        <path
          d="M20,203 L86.67,173 L153.33,132 L220,115 L286.67,91 L353.33,67 L420,47"
          fill="none"
          stroke="url(#bizGreen)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-[convergePulse_2s_ease-in-out_infinite]"
        />
        <path
          d="M20,203 L86.67,173 L153.33,132 L220,115 L286.67,91 L353.33,67 L420,47"
          fill="none"
          stroke="#10b981"
          strokeWidth="8"
          className="blur-md opacity-20"
          strokeLinecap="round"
        />

        {/* 时效达成率（蓝） */}
        <path
          d="M20,198 L86.67,181 L153.33,159 L220,127 L286.67,98 L353.33,76 L420,59"
          fill="none"
          stroke="url(#bizBlue)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 4"
        />

        {/* 终点标记 */}
        <circle cx="420" cy="47" r="4" fill="#10b981" className="animate-ping" />
        <circle cx="420" cy="47" r="2" fill="#10b981" />
        <circle cx="420" cy="59" r="3" fill="#06b6d4" />
      </svg>

      {/* 右上标签 */}
      <div className="absolute top-2 right-4 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">近7天业务运营趋势</span>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-3 left-4 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-500 rounded-full" />
          <span className="text-[8px] text-text-muted font-bold">平均成本下降率</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-px bg-cyan-500 rounded-full" style={{ borderTop: '1px dashed #06b6d4' }} />
          <span className="text-[8px] text-text-muted font-bold">时效达成率</span>
        </div>
      </div>

      <style>{`
        @keyframes convergePulse {
          0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 2px rgba(16,185,129,0.3)); }
          50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(16,185,129,0.5)); }
        }
      `}</style>
    </>
  );
};

/** 引擎算法指标：保留原 PPO 收敛曲线（Reward/Value Loss/Entropy） */
const AlgorithmChart: React.FC = () => {
  return (
    <>
      <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 440 250" preserveAspectRatio="none">
        <defs>
          <linearGradient id="convGreen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="convCyan" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="convAmber" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 科幻网格底纹 */}
        <g opacity="0.06">
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="250" stroke="white" strokeWidth="0.5" strokeDasharray="3 6" />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 25} x2="440" y2={i * 25} stroke="white" strokeWidth="0.5" strokeDasharray="3 6" />
          ))}
        </g>

        {/* 面积填充 */}
        <path
          d="M0,210 L30,205 L60,185 L90,178 L120,152 L150,143 L180,110 L210,98 L240,73 L270,65 L300,52 L330,47 L360,42 L390,39 L420,37 L440,34 L440,250 L0,250 Z"
          fill="url(#convFill)"
          className="animate-[pulse_3s_ease-in-out_infinite]"
        />

        {/* 主收敛曲线 — 亮青色：PPO Reward */}
        <path
          d="M0,210 L30,205 L60,185 L90,178 L120,152 L150,143 L180,110 L210,98 L240,73 L270,65 L300,52 L330,47 L360,42 L390,39 L420,37 L440,34"
          fill="none"
          stroke="url(#convGreen)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-[convergePulse_2s_ease-in-out_infinite]"
        />
        <path
          d="M0,210 L30,205 L60,185 L90,178 L120,152 L150,143 L180,110 L210,98 L240,73 L270,65 L300,52 L330,47 L360,42 L390,39 L420,37 L440,34"
          fill="none"
          stroke="#10b981"
          strokeWidth="8"
          className="blur-md opacity-20"
          strokeLinecap="round"
        />

        {/* 辅助曲线 — 青色：Value Loss */}
        <path
          d="M0,158 L30,152 L60,143 L90,130 L120,125 L150,115 L180,104 L210,98 L240,91 L270,86 L300,83 L330,78 L360,76 L390,73 L420,73 L440,70"
          fill="none"
          stroke="url(#convCyan)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 4"
          className="animate-[convergePulse_3s_ease-in-out_infinite_0.5s]"
        />

        {/* 辅助曲线 — 琥珀色：Entropy */}
        <path
          d="M0,118 L30,115 L60,110 L90,104 L120,98 L150,94 L180,88 L210,86 L240,81 L270,78 L300,76 L330,73 L360,70 L390,70 L420,68 L440,68"
          fill="none"
          stroke="url(#convAmber)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3 5"
          opacity="0.6"
        />

        {/* 收敛终点标记 */}
        <circle cx="440" cy="34" r="4" fill="#10b981" className="animate-ping" />
        <circle cx="440" cy="34" r="2" fill="#10b981" />
      </svg>

      {/* 右上标签 */}
      <div className="absolute top-2 right-4 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">PPO Reward Convergence</span>
      </div>

      {/* 曲线图例 */}
      <div className="absolute bottom-3 left-4 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-500 rounded-full" />
          <span className="text-[8px] text-text-muted font-bold">Reward</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-px bg-cyan-500 rounded-full" style={{ borderTop: '1px dashed #06b6d4' }} />
          <span className="text-[8px] text-text-muted font-bold">Value Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-px bg-amber-500 rounded-full opacity-60" style={{ borderTop: '1px dotted #f59e0b' }} />
          <span className="text-[8px] text-text-muted font-bold">Entropy</span>
        </div>
      </div>

      <style>{`
        @keyframes convergePulse {
          0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 2px rgba(16,185,129,0.3)); }
          50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(16,185,129,0.5)); }
        }
      `}</style>
    </>
  );
};

export default SystemPulse;
