import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Compass } from 'lucide-react';
import { useChartTheme } from '@hooks/useChartTheme';
import type { PathStepLog } from './TrainingOptimizationView';

/* ================================================================
 *  跨洋主干线地理坐标系统
 *  Canvas: 960×520
 *  覆盖范围：深圳 → 新加坡 → 鹿特丹 主干网
 *  Lon: -10°W → 130°E   (Δ140°)
 *  Lat:  60°N →  -5°S   (Δ65°)
 * ================================================================ */
const W = 960;
const H = 520;
const lon2x = (lon: number) => (lon + 10) * (W / 140);
const lat2y = (lat: number) => (60 - lat) * (H / 65);

/* 三大核心节点：深圳 / 新加坡 / 鹿特丹 */
const PORTS = {
  shenzhen:  { x: lon2x(114.05), y: lat2y(22.45),  label: '深圳',     en: 'Shenzhen' },
  singapore: { x: lon2x(103.85), y: lat2y(1.27),   label: '新加坡',   en: 'Singapore' },
  rotterdam: { x: lon2x(4.47),   y: lat2y(51.92),  label: '鹿特丹',   en: 'Rotterdam' },
};

/* 港口拥堵风险区（红色） */
const STORMS = [
  { cx: lon2x(103.85), cy: lat2y(1.27),  rx: 38, ry: 30, label: '新加坡港拥堵 CONGESTION',  penalty: -500, rot: 0 },
  { cx: lon2x(32.55),  cy: lat2y(31.20), rx: 42, ry: 32, label: '苏伊士拥堵 CONGESTION',    penalty: -800, rot: 10 },
  { cx: lon2x(4.47),   cy: lat2y(51.92), rx: 36, ry: 28, label: '鹿特丹港拥堵 CONGESTION',  penalty: -400, rot: -5 },
];

/* 简化的大陆轮廓 - 抽象示意 */
const COASTLINES = {
  // 欧洲西部
  europe: `M 0 0 L 80 0 L 130 18 L 175 8 L 215 28 L 245 22 L 270 45 L 260 75 L 240 95 L 210 105 L 175 95 L 140 105 L 110 92 L 80 100 L 50 88 L 25 70 L 0 60 Z`,
  // 非洲北部 + 中东
  africa: `M 175 105 L 215 100 L 260 110 L 305 125 L 335 155 L 350 195 L 365 235 L 360 280 L 340 310 L 305 320 L 270 310 L 245 280 L 230 245 L 215 210 L 200 175 L 190 145 L 180 120 Z`,
  // 中东/印度次大陆
  middleEast: `M 360 110 L 410 100 L 460 115 L 495 140 L 510 175 L 495 205 L 470 215 L 440 205 L 415 185 L 390 165 L 370 140 Z`,
  // 东南亚岛屿区
  seAsia: `M 745 320 L 780 310 L 815 325 L 830 345 L 820 365 L 790 370 L 760 360 L 745 340 Z`,
  // 中国大陆
  china: `M 760 195 L 815 175 L 870 165 L 920 175 L 950 200 L 945 240 L 920 270 L 880 285 L 840 280 L 800 265 L 775 240 L 760 215 Z`,
};

/* 探索路径（背景装饰） */
const EXPLORATION_PATHS = [
  `M ${PORTS.shenzhen.x} ${PORTS.shenzhen.y} C ${PORTS.shenzhen.x - 40} ${lat2y(15)} ${lon2x(95)} ${lat2y(8)} ${PORTS.singapore.x + 10} ${PORTS.singapore.y - 20}`,
  `M ${PORTS.singapore.x} ${PORTS.singapore.y} C ${lon2x(80)} ${lat2y(10)} ${lon2x(60)} ${lat2y(20)} ${lon2x(45)} ${lat2y(28)}`,
  `M ${lon2x(45)} ${lat2y(28)} C ${lon2x(35)} ${lat2y(35)} ${lon2x(20)} ${lat2y(45)} ${PORTS.rotterdam.x + 10} ${PORTS.rotterdam.y + 15}`,
];

/* 最优策略路径 - 经过新加坡到鹿特丹 */
const POLICY_D = `M ${PORTS.shenzhen.x} ${PORTS.shenzhen.y} C ${PORTS.shenzhen.x - 60} ${lat2y(10)} ${lon2x(95)} ${lat2y(0)} ${PORTS.singapore.x} ${PORTS.singapore.y} S ${lon2x(50)} ${lat2y(20)} ${lon2x(32)} ${lat2y(31)} S ${lon2x(15)} ${lat2y(45)} ${PORTS.rotterdam.x} ${PORTS.rotterdam.y}`;

/* ================================================================
 *  实时规划演示路径（3 条不同路线：深圳 → 鹿特丹，跨洋主干网）
 *
 *  每条路径的真实数据：
 *    成本最优路径: 经苏伊士运河直达, ~19天, $4,200, 碳排放 1,250t
 *    时效优先路径: 含空运联程, ~12天, $5,800, 碳排放 1,850t
 *    鲁棒性路径: 绕行好望角, ~28天, $5,100, 碳排放 1,580t
 * ================================================================ */
const DEMO_PATHS = [
  {
    id: 'demo-1',
    label: '成本最优路径',
    shortLabel: '成本',
    d: `M ${PORTS.shenzhen.x} ${PORTS.shenzhen.y} C ${PORTS.shenzhen.x - 50} ${lat2y(10)} ${lon2x(95)} ${lat2y(-2)} ${PORTS.singapore.x} ${PORTS.singapore.y} S ${lon2x(50)} ${lat2y(22)} ${lon2x(32.55)} ${lat2y(31.20)} S ${lon2x(15)} ${lat2y(45)} ${PORTS.rotterdam.x} ${PORTS.rotterdam.y}`,
    color: '#06b6d4',
    tailwindColor: 'text-cyan-400',
    duration: 55000,
    totalDist: 18500,
    totalDays: 19,
    totalCost: 4200,
    totalCarbon: 1250,
    rewardModifier: 0.6,
    waypoints: [
      { name: '深圳', lat: 22.45, lon: 114.05 },
      { name: '南海', lat: 5.0, lon: 110.0 },
      { name: '新加坡', lat: 1.27, lon: 103.85 },
      { name: '印度洋', lat: 10.0, lon: 65.0 },
      { name: '苏伊士运河', lat: 30.0, lon: 32.5 },
      { name: '地中海', lat: 38.0, lon: 18.0 },
      { name: '鹿特丹', lat: 51.92, lon: 4.47 },
    ],
  },
  {
    id: 'demo-2',
    label: '时效优先路径',
    shortLabel: '时效',
    d: `M ${PORTS.shenzhen.x} ${PORTS.shenzhen.y} C ${PORTS.shenzhen.x - 80} ${lat2y(30)} ${lon2x(80)} ${lat2y(45)} ${lon2x(60)} ${lat2y(50)} S ${lon2x(30)} ${lat2y(55)} ${PORTS.rotterdam.x + 5} ${PORTS.rotterdam.y - 10}`,
    color: '#8b5cf6',
    tailwindColor: 'text-violet-400',
    duration: 55000,
    totalDist: 9500,
    totalDays: 12,
    totalCost: 5800,
    totalCarbon: 1850,
    rewardModifier: -0.3,
    waypoints: [
      { name: '深圳', lat: 22.45, lon: 114.05 },
      { name: '中亚空域', lat: 40.0, lon: 80.0 },
      { name: '俄罗斯西部', lat: 50.0, lon: 40.0 },
      { name: '东欧', lat: 52.0, lon: 20.0 },
      { name: '鹿特丹', lat: 51.92, lon: 4.47 },
    ],
  },
  {
    id: 'demo-3',
    label: '鲁棒性路径',
    shortLabel: '鲁棒',
    d: `M ${PORTS.shenzhen.x} ${PORTS.shenzhen.y} C ${PORTS.shenzhen.x - 70} ${lat2y(0)} ${lon2x(85)} ${lat2y(-15)} ${lon2x(60)} ${lat2y(-25)} S ${lon2x(20)} ${lat2y(-30)} ${lon2x(0)} ${lat2y(-10)} S ${lon2x(-5)} ${lat2y(20)} ${lon2x(5)} ${lat2y(40)} S ${PORTS.rotterdam.x + 10} ${PORTS.rotterdam.y + 5} ${PORTS.rotterdam.x} ${PORTS.rotterdam.y}`,
    color: '#f59e0b',
    tailwindColor: 'text-amber-400',
    duration: 55000,
    totalDist: 26500,
    totalDays: 28,
    totalCost: 5100,
    totalCarbon: 1580,
    rewardModifier: 0.8,
    waypoints: [
      { name: '深圳', lat: 22.45, lon: 114.05 },
      { name: '爪哇海', lat: -8.0, lon: 110.0 },
      { name: '印度洋南端', lat: -25.0, lon: 60.0 },
      { name: '好望角', lat: -34.0, lon: 18.0 },
      { name: '南大西洋', lat: 0.0, lon: -5.0 },
      { name: '比斯开湾', lat: 45.0, lon: -5.0 },
      { name: '鹿特丹', lat: 51.92, lon: 4.47 },
    ],
  },
];

/* localStorage key */
const STORAGE_KEY = 'pathoptix-training-count';

/* ================================================================
 *  组件
 * ================================================================ */
interface VisualizerProps {
  onPathStep?: (log: PathStepLog) => void;
}

const Visualizer: React.FC<VisualizerProps> = ({ onPathStep }) => {
  const chartTheme = useChartTheme();
  const lonLines = [-5, 20, 45, 70, 95, 120];
  const latLines = [50, 30, 10, -10, -30];

  // 训练次数（从 localStorage 读取，默认 88，对应第 89 轮）
  const [trainCount, setTrainCount] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 88;
  });

  // 当前正在播放的演示路径索引（-1 = 未开始）
  const [activeDemo, setActiveDemo] = useState(-1);
  // 路径绘制进度 0~1
  const [drawProgress, setDrawProgress] = useState(0);
  // 已完成的历史路径（保留在地图上作为半透明轨迹）
  const [completedPaths, setCompletedPaths] = useState<{ d: string; color: string; label: string }[]>([]);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  // 已发射的日志步进标记（避免重复发射）
  const emittedStepsRef = useRef<Set<string>>(new Set());

  // ─── 实时状态观测数据（联动路径动画） ───
  const currentPath = activeDemo >= 0 ? DEMO_PATHS[activeDemo] : null;
  const progress = drawProgress;

  // 当前坐标：沿 waypoints 线性插值
  const observerCoord = (() => {
    if (!currentPath) return { lat: 22.45, lon: 114.05 };
    const wp = currentPath.waypoints;
    if (!wp || wp.length < 2) return { lat: 22.45, lon: 114.05 };
    const segCount = wp.length - 1;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const segIdx = Math.min(Math.floor(clampedProgress * segCount), segCount - 1);
    const segProgress = (clampedProgress * segCount) - segIdx;
    const from = wp[segIdx];
    const to = wp[segIdx + 1] || wp[segIdx];
    if (!from || !to) return { lat: 22.45, lon: 114.05 };
    return {
      lat: from.lat + (to.lat - from.lat) * segProgress,
      lon: from.lon + (to.lon - from.lon) * segProgress,
    };
  })();

  // 即时步奖励：基础值 + 路线奖励系数 + 探索率加成
  const epsilonNum = Math.max(0.01, 0.15 - trainCount * 0.001);
  const epsilon = epsilonNum.toFixed(3);
  const stepReward = currentPath
    ? ((20 + progress * 15 + Math.sin(progress * Math.PI) * 8) * currentPath.rewardModifier + epsilonNum * 10).toFixed(1)
    : '0.0';

  // Q-Value：随进度增长
  const qValue = currentPath
    ? (80 + progress * currentPath.totalDist * 0.005).toFixed(1)
    : '0.0';

  const nowStr = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  // 播放一轮 3 条路径
  const playCycle = useCallback(() => {
    let demoIdx = 0;
    emittedStepsRef.current.clear();
    const roundCompleted: { d: string; color: string; label: string }[] = [];

    const playNext = () => {
      if (demoIdx >= DEMO_PATHS.length) {
        // 一轮播放完毕，训练次数 +1
        setTrainCount(prev => {
          const next = prev + 1;
          localStorage.setItem(STORAGE_KEY, String(next));
          return next;
        });
        // 保留历史轨迹，开始下一轮
        setCompletedPaths(prev => [...prev, ...roundCompleted].slice(-12));
        demoIdx = 0;
        emittedStepsRef.current.clear();
        roundCompleted.length = 0;
        setTimeout(playNext, 5000);
        return;
      }

      const path = DEMO_PATHS[demoIdx];
      setActiveDemo(demoIdx);
      setDrawProgress(0);
      startTimeRef.current = performance.now();

      // 发射路径开始日志
      const startKey = `${path.id}-start`;
      if (!emittedStepsRef.current.has(startKey)) {
        emittedStepsRef.current.add(startKey);
        onPathStep?.({
          id: Date.now(),
          time: nowStr(),
          msg: `▶ [${path.shortLabel}] 开始规划 ${path.label} → 鹿特丹`,
          color: path.tailwindColor,
          routeLabel: path.shortLabel,
        });
      }

      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const p = Math.min(elapsed / path.duration, 1);
        setDrawProgress(p);

        // 根据进度发射路径步进日志
        const wp = path.waypoints;
        for (let i = 1; i < wp.length - 1; i++) {
          const stepThreshold = i / (wp.length - 1);
          const stepKey = `${path.id}-wp-${i}`;
          if (p >= stepThreshold && !emittedStepsRef.current.has(stepKey)) {
            emittedStepsRef.current.add(stepKey);
            const dist = Math.round(path.totalDist * stepThreshold);
            const baseReward = 20 + stepThreshold * 15 + Math.sin(stepThreshold * Math.PI) * 8;
            const reward = (baseReward * path.rewardModifier + epsilonNum * 10).toFixed(1);
            const rewardSign = parseFloat(reward) >= 0 ? '+' : '';
            const daysUsed = (path.totalDays * stepThreshold).toFixed(1);
            onPathStep?.({
              id: Date.now() + i,
              time: nowStr(),
              msg: `  ↳ [${path.shortLabel}] 途经 ${wp[i].name} (距起点 ${dist}km, 已用时 ${daysUsed}天, 步奖励 ${rewardSign}${reward})`,
              color: path.tailwindColor,
              routeLabel: path.shortLabel,
            });
          }
        }

        if (p < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          // 路径完成日志
          const endKey = `${path.id}-end`;
          if (!emittedStepsRef.current.has(endKey)) {
            emittedStepsRef.current.add(endKey);
            onPathStep?.({
              id: Date.now() + 100,
              time: nowStr(),
              msg: `✓ [${path.shortLabel}] ${path.label} 到达鹿特丹 (总距离 ${path.totalDist}km, ${path.totalDays}天, $${path.totalCost}, 碳排放 ${path.totalCarbon}t)`,
              color: 'text-emerald-400',
              routeLabel: path.shortLabel,
            });
          }
          // 记录已完成路径
          roundCompleted.push({ d: path.d, color: path.color, label: path.label });
          demoIdx++;
          setTimeout(playNext, 5000);
        }
      };

      animRef.current = requestAnimationFrame(animate);
    };

    playNext();
  }, [onPathStep]);

  useEffect(() => {
    playCycle();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playCycle]);

  // 计算当前演示路径的 stroke-dasharray / stroke-dashoffset
  const getDemoPathStyle = (idx: number) => {
    if (activeDemo !== idx) {
      return { opacity: 0, strokeDasharray: 'none', strokeDashoffset: 0 };
    }
    return {
      opacity: 1,
      strokeDasharray: '3000',
      strokeDashoffset: 3000 * (1 - drawProgress),
      transition: 'none',
    };
  };

  return (
    <div className="bg-bg-secondary rounded-3xl p-4 md:p-8 border border-border-default shadow-lg shadow-slate-200/50 flex-1 flex flex-col gap-4 md:gap-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 border border-blue-200">
            <Compass size={20} />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-text-primary">路径可视化</h3>
            <p className="text-[9px] md:text-[10px] text-text-muted font-bold uppercase tracking-widest">
              深圳 → 鹿特丹 主干网训练
            </p>
          </div>
        </div>

        {/* ─── 右上角：主干网 + 训练轮次 ─── */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-bg-tertiary/50 px-4 py-2 rounded-xl border border-border-default">
            <span className="text-xs text-text-muted font-bold">主干网</span>
            <span className="w-px h-4 bg-border-default" />
            <span className="text-sm text-cyan-400 font-black font-mono">第{trainCount + 1}</span>
            <span className="text-xs text-text-muted font-bold">轮训练</span>
          </div>
        </div>
      </div>

      {/* ─── 演示路径标签 ─── */}
      {activeDemo >= 0 && (
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {DEMO_PATHS.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                activeDemo === i
                  ? 'border-current bg-bg-tertiary/50 shadow-sm'
                  : 'border-border-default bg-transparent opacity-40'
              }`}
              style={{ color: activeDemo === i ? p.color : undefined }}
            >
              <div className={`w-2 h-2 rounded-full ${activeDemo === i ? 'animate-pulse' : ''}`} style={{ backgroundColor: p.color }} />
              {p.label}
              {activeDemo === i && (
                <span className="text-text-muted font-mono">{Math.round(drawProgress * 100)}%</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── SVG 地图主体 ─── */}
      <div className="flex-1 bg-sky-100 rounded-2xl border border-border-default relative overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">

          {/* ══════ Defs ══════ */}
          <defs>
            {STORMS.map((s, i) => (
              <React.Fragment key={`sd-${i}`}>
                <radialGradient id={`storm-${i}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity="0.7" />
                  <stop offset="30%" stopColor="#ea580c" stopOpacity="0.35" />
                  <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`storm-core-${i}`} cx="45%" cy="42%" r="35%">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                </radialGradient>
              </React.Fragment>
            ))}

            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="demo-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ══════ 1. 海洋背景 ══════ */}
          <rect width={W} height={H} fill={chartTheme.gridColor} />

          {/* ══════ 2. 经纬度网格 ══════ */}
          <g>
            {lonLines.map((lon) => {
              const x = lon2x(lon);
              return (
                <g key={`lon-${lon}`}>
                  <line x1={x} y1={0} x2={x} y2={H} stroke={chartTheme.axisTextColor} strokeWidth="0.5" strokeOpacity="0.3" />
                  <text x={x + 3} y={H - 6} fill={chartTheme.axisTextColor} fontSize="8" fontWeight="700" style={{ fontFamily: 'monospace' }}>{lon}°E</text>
                </g>
              );
            })}
            {latLines.map((lat) => {
              const y = lat2y(lat);
              return (
                <g key={`lat-${lat}`}>
                  <line x1={0} y1={y} x2={W} y2={y} stroke={chartTheme.axisTextColor} strokeWidth="0.5" strokeOpacity="0.3" />
                  <text x={4} y={y - 3} fill={chartTheme.axisTextColor} fontSize="8" fontWeight="700" style={{ fontFamily: 'monospace' }}>{lat}°N</text>
                </g>
              );
            })}
          </g>

          {/* ══════ 3. 陆地板块（抽象示意） ══════ */}
          <g>
            {Object.entries(COASTLINES).map(([key, d]) => (
              d && <path key={key} d={d} fill={chartTheme.tooltipStyle.backgroundColor} stroke={chartTheme.axisStroke} strokeWidth="1.2" />
            ))}
            <text x={lon2x(15.0)} y={lat2y(54.0)} fill={chartTheme.axisTextColor} fontSize="9" fontWeight="800" letterSpacing="0.15em" style={{ fontFamily: 'monospace' }}>欧洲 EU</text>
            <text x={lon2x(20.0)} y={lat2y(0.0)} fill={chartTheme.axisTextColor} fontSize="8" fontWeight="700" letterSpacing="0.1em" style={{ fontFamily: 'monospace' }}>非洲 AFRICA</text>
            <text x={lon2x(45.0)} y={lat2y(28.0)} fill={chartTheme.axisTextColor} fontSize="8" fontWeight="700" letterSpacing="0.1em" style={{ fontFamily: 'monospace' }} transform={`rotate(-25,${lon2x(45.0)},${lat2y(28.0)})`}>MIDDLE EAST</text>
            <text x={lon2x(95.0)} y={lat2y(-3.0)} fill={chartTheme.axisTextColor} fontSize="8" fontWeight="700" letterSpacing="0.1em" style={{ fontFamily: 'monospace' }}>东南亚 SE ASIA</text>
            <text x={lon2x(105.0)} y={lat2y(35.0)} fill={chartTheme.axisTextColor} fontSize="9" fontWeight="800" letterSpacing="0.15em" style={{ fontFamily: 'monospace' }}>中国 CHINA</text>
          </g>

          {/* ══════ 4. 港口拥堵风险区 ══════ */}
          <g style={{ mixBlendMode: 'multiply' }}>
            {STORMS.map((s, i) => (
              <g key={`storm-${i}`}>
                <ellipse cx={s.cx} cy={s.cy} rx={s.rx * 1.8} ry={s.ry * 1.8}
                  fill={`url(#storm-${i})`} opacity="0.7"
                  className="animate-pulse"
                  style={{ animationDuration: `${3 + i * 0.7}s`, animationDelay: `${i * 0.4}s` }}
                  transform={`rotate(${s.rot}, ${s.cx}, ${s.cy})`}
                />
                <ellipse cx={s.cx - 5} cy={s.cy - 5} rx={s.rx * 0.35} ry={s.ry * 0.35}
                  fill={`url(#storm-core-${i})`}
                  transform={`rotate(${s.rot}, ${s.cx}, ${s.cy})`}
                />
                <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
                  fill="none" stroke="#dc2626" strokeWidth="0.8"
                  strokeDasharray="4 3" opacity="0.45"
                  transform={`rotate(${s.rot}, ${s.cx}, ${s.cy})`}
                />
              </g>
            ))}
          </g>
          {STORMS.map((s, i) => (
            <text key={`sl-${i}`} x={s.cx} y={s.cy - s.ry - 12} textAnchor="middle"
              fill="#dc2626" fontSize="8" fontWeight="800"
              letterSpacing="0.06em" style={{ fontFamily: 'monospace' }}
              opacity="0.9">
              {s.label} (Penalty {s.penalty})
            </text>
          ))}

          {/* ══════ 5. 历史探索轨迹 ══════ */}
          <g opacity="0.5">
            {EXPLORATION_PATHS.map((d, i) => (
              <path key={`exp-${i}`}
                d={d}
                fill="none"
                stroke={i % 2 === 0 ? '#64748b' : '#78716c'}
                strokeWidth={1.0 + (i % 3) * 0.2}
                strokeDasharray="5 4"
                strokeLinecap="round"
                opacity={0.5 + (i % 3) * 0.15}
              />
            ))}
          </g>

          {/* ══════ 6. 最优策略路径 ══════ */}
          <path d={POLICY_D} fill="none" stroke="#0891b2" strokeWidth="12"
            strokeLinecap="round" strokeOpacity="0.1" filter="url(#glow-strong)" />
          <path d={POLICY_D} fill="none" stroke="#06b6d4" strokeWidth="5"
            strokeLinecap="round" strokeOpacity="0.25" filter="url(#glow)" />
          <path d={POLICY_D} fill="none" stroke="#06b6d4" strokeWidth="2.5"
            strokeLinecap="round" filter="url(#glow)" />
          <path d={POLICY_D} fill="none" stroke="#22d3ee" strokeWidth="2"
            strokeLinecap="round" strokeDasharray="2 10" strokeOpacity="0.7">
            <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="2s" repeatCount="indefinite" />
          </path>

          {/* ══════ 6.5 历史尝试轨迹 ══════ */}
          {completedPaths.map((cp, i) => (
            <path
              key={`hist-${i}`}
              d={cp.d}
              fill="none"
              stroke={cp.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity="0.3"
            />
          ))}

          {/* ══════ 6.6 实时规划演示路径（3 条动画） ══════ */}
          {DEMO_PATHS.map((demo, i) => (
            <g key={demo.id}>
              <path
                d={demo.d}
                fill="none"
                stroke={demo.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeOpacity="0.15"
                filter="url(#demo-glow)"
                style={getDemoPathStyle(i)}
              />
              <path
                d={demo.d}
                fill="none"
                stroke={demo.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#demo-glow)"
                style={getDemoPathStyle(i)}
              />
              {activeDemo === i && drawProgress > 0 && drawProgress < 1 && (
                <circle r="5" fill={demo.color} filter="url(#demo-glow)">
                  <animateMotion
                    key={`${demo.id}-${drawProgress}`}
                    dur={demo.duration + 'ms'}
                    repeatCount="1"
                    path={demo.d}
                  />
                </circle>
              )}
            </g>
          ))}

          {/* ══════ 7. 港口标注（三大核心节点） ══════ */}
          {Object.entries(PORTS).map(([key, p]) => {
            const isOrigin = key === 'shenzhen';
            const isDest = key === 'rotterdam';
            const isTransit = key === 'singapore';
            const color = isOrigin ? '#059669' : isDest ? '#d97706' : '#2563eb';
            return (
              <g key={key}>
                <circle cx={p.x} cy={p.y} r="14" fill={color} fillOpacity="0.12"
                  className="animate-ping" style={{ animationDuration: '2.5s' }} />
                <circle cx={p.x} cy={p.y} r="6" fill={color} />
                <circle cx={p.x} cy={p.y} r="10"
                  fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.3" />
                <text x={p.x} y={p.y - 18}
                  textAnchor="middle" fill={color} fontSize="10" fontWeight="800"
                  letterSpacing="0.04em" style={{ fontFamily: 'monospace' }}>
                  {p.label}{isTransit && ' · 中转'}
                </text>
                <text x={p.x} y={p.y - 8}
                  textAnchor="middle" fill={color} fontSize="7" fontWeight="600"
                  opacity="0.5" style={{ fontFamily: 'monospace' }}>
                  {p.en}
                </text>
              </g>
            );
          })}

          {/* ══════ 左上角: 区域标识 ══════ */}
          <text x="16" y="22" fill={chartTheme.axisTextColor} fontSize="11" fontWeight="900"
            letterSpacing="0.2em" style={{ fontFamily: 'monospace' }}>
            跨洋主干网 ASIA-EUROPE TRUNK
          </text>
          <text x="16" y="36" fill={chartTheme.axisTextColor} fontSize="8" fontWeight="600"
            style={{ fontFamily: 'monospace' }}>
            RL Policy Visualization · γ=0.99 · α=0.001 · PPO-Clip ε=0.2
          </text>
        </svg>

        {/* ══════ 左下角图例 ══════ */}
        <div className="hidden sm:flex absolute bottom-4 left-4 items-center gap-3 md:gap-5 bg-white/80 backdrop-blur-md px-3 md:px-5 py-2 md:py-2.5 rounded-full border border-border-default shadow-lg shadow-slate-200/50 z-10">
          <div className="flex items-center gap-2">
            <div className="w-5 h-[2px] bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.5)] rounded-full" />
            <span className="text-[8px] md:text-[9px] text-text-muted font-black uppercase tracking-tight">最优策略 (Policy)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-[2px] bg-text-muted rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #94a3b8 0, #94a3b8 4px, transparent 4px, transparent 7px)' }} />
            <span className="text-[8px] md:text-[9px] text-text-muted font-black uppercase tracking-tight">历史尝试 (Exploration)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400/30 border border-red-400/50" />
            <span className="text-[8px] md:text-[9px] text-red-500 font-black uppercase tracking-tight">港口拥堵 (Penalty)</span>
          </div>
        </div>

        {/* ══════ 右侧信息浮层（动态联动路径动画） ══════ */}
        <div className="hidden md:block absolute top-4 right-4 bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-border-default space-y-2.5 min-w-[220px] shadow-lg shadow-slate-200/50 z-10">
          <div className="text-[8px] text-text-muted font-black uppercase tracking-[0.2em] mb-3 border-b border-border-default pb-2">
            实时状态观测 · OBSERVER
          </div>
          <Row label="当前坐标" value={`Lat: ${observerCoord.lat.toFixed(1)}°N, Lon: ${observerCoord.lon.toFixed(1)}°E`} color="text-blue-600" />
          <Row label="即时步奖励" value={`+${stepReward}`} color="text-emerald-600" />
          <Row label="探索率 ε" value={`${epsilon} ↓`} color="text-amber-600" />
          <div className="pt-2 border-t border-border-default">
            <Row label="最大 Q-Value" value={qValue} color="text-cyan-600" />
          </div>
          {currentPath && (
            <div className="pt-2 border-t border-border-default">
              <Row label="当前路线" value={currentPath.shortLabel} color={currentPath.tailwindColor} />
              <Row label="已行距离" value={`${Math.round(currentPath.totalDist * progress)} / ${currentPath.totalDist} km`} color="text-text-secondary" />
              <Row label="目标港口" value="鹿特丹" color="text-amber-600" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface RowProps {
  label: string;
  value: string;
  color: string;
}

const Row: React.FC<RowProps> = ({ label, value, color }) => (
  <div className="flex justify-between items-center text-[11px]">
    <span className="text-text-muted font-bold">{label}</span>
    <span className={`${color} font-black font-mono tracking-tighter`}>{value}</span>
  </div>
);

export default Visualizer;
