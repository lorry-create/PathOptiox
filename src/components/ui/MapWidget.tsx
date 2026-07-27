
import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface HubNode {
  id: string;
  name: string;
  x: number;
  y: number;
  level: 'normal' | 'congested' | 'severe';
  orders: number;
}

const HUBS: HubNode[] = [
  { id: 'sz', name: '深圳', x: 780, y: 290, level: 'normal', orders: 328 },
  { id: 'sh', name: '上海', x: 832, y: 232, level: 'congested', orders: 256 },
  { id: 'sg', name: '新加坡', x: 790, y: 365, level: 'congested', orders: 189 },
  { id: 'rt', name: '鹿特丹', x: 488, y: 175, level: 'normal', orders: 214 },
  { id: 'la', name: '洛杉矶', x: 182, y: 252, level: 'severe', orders: 167 },
];

// 流动运输线路（曲线）
const ROUTES: Array<{ d: string; highlight?: boolean }> = [
  { d: 'M780,290 Q620,120 488,175', highlight: true },   // 深圳 → 鹿特丹（主路径）
  { d: 'M780,290 Q480,260 182,252' },                     // 深圳 → 洛杉矶
  { d: 'M832,232 Q500,180 488,175' },                     // 上海 → 鹿特丹
  { d: 'M832,232 Q500,300 182,252' },                     // 上海 → 洛杉矶
  { d: 'M790,365 Q640,300 488,175' },                     // 新加坡 → 鹿特丹
  { d: 'M790,365 Q810,300 832,232' },                     // 新加坡 → 上海
];

const LEVEL_COLOR: Record<HubNode['level'], string> = {
  normal: '#10b981',
  congested: '#f59e0b',
  severe: '#ef4444',
};

const LEVEL_LABEL: Record<HubNode['level'], string> = {
  normal: '正常',
  congested: '拥堵',
  severe: '严重拥堵',
};

const MapWidget: React.FC = () => {
  const [hovered, setHovered] = useState<HubNode | null>(null);

  return (
    <div className="bg-bg-secondary/80 backdrop-blur-xl rounded-[32px] border border-border-default p-4 md:p-6 lg:p-10 relative overflow-hidden h-[300px] md:h-[400px] lg:h-[500px] xl:h-[600px] shadow-2xl flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start z-10 gap-3">
        <div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-cyan-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-[28px] md:h-[28px]">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <h3 className="text-lg md:text-2xl lg:text-3xl font-black text-text-primary tracking-tight italic">全球实时智能态势</h3>
          </div>
          <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.2em] mt-2 ml-1">
            全球物流网络运行监控
          </p>
        </div>

        <div className="px-3 md:px-4 py-1.5 md:py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-full flex items-center gap-2 md:gap-3 group cursor-pointer hover:bg-emerald-500/10 transition-all">
          <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-[9px] md:text-[10px] font-black text-text-secondary uppercase tracking-widest">AI智能调度 · 运行中</span>
        </div>
      </div>

      <div className="flex-1 relative mt-4">
        <svg viewBox="0 0 1000 500" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="pathHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 简化世界地图底图：大陆轮廓 */}
          <g fill="#64748b" opacity="0.08">
            {/* 北美洲 */}
            <path d="M120,110 L200,95 L270,120 L295,170 L285,220 L255,260 L215,275 L170,265 L130,230 L110,180 Z" />
            {/* 中美洲连接 */}
            <path d="M230,270 L260,290 L255,310 L235,300 Z" />
            {/* 南美洲 */}
            <path d="M255,300 L310,295 L335,335 L325,400 L295,445 L275,425 L265,365 Z" />
            {/* 欧洲 */}
            <path d="M460,140 L545,135 L570,170 L545,210 L500,215 L470,190 Z" />
            {/* 非洲 */}
            <path d="M490,225 L565,220 L595,265 L585,335 L550,385 L515,370 L495,310 Z" />
            {/* 亚洲 */}
            <path d="M575,125 L720,100 L820,115 L895,150 L915,210 L880,265 L820,285 L750,290 L680,275 L615,240 L585,185 Z" />
            {/* 印度次大陆 */}
            <path d="M700,225 L745,230 L740,275 L715,280 L700,255 Z" />
            {/* 东南亚群岛 */}
            <path d="M770,320 L810,315 L830,345 L800,360 L770,350 Z" />
            {/* 澳大利亚 */}
            <path d="M810,365 L890,355 L910,395 L865,420 L820,405 Z" />
          </g>

          {/* 经纬网格底纹 */}
          <g opacity="0.05" stroke="#64748b" strokeWidth="0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`lg${i}`} x1={0} y1={i * 50} x2={1000} y2={i * 50} />
            ))}
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={`lt${i}`} x1={i * 50} y1={0} x2={i * 50} y2={500} />
            ))}
          </g>

          {/* 运输线路 */}
          {ROUTES.map((route, idx) => (
            <g key={`route-${idx}`}>
              {/* 底层路径 */}
              <path
                d={route.d}
                fill="none"
                stroke={route.highlight ? 'url(#pathHighlight)' : '#334155'}
                strokeWidth={route.highlight ? 3.5 : 1.5}
                opacity={route.highlight ? 0.5 : 0.4}
                strokeLinecap="round"
              />
              {/* 流动虚线动画 */}
              <path
                d={route.d}
                fill="none"
                stroke={route.highlight ? 'url(#pathHighlight)' : '#06b6d4'}
                strokeWidth={route.highlight ? 3.5 : 1.5}
                strokeDasharray={route.highlight ? '120, 1000' : '6, 10'}
                strokeLinecap="round"
                filter={route.highlight ? 'url(#glow)' : undefined}
              >
                {route.highlight ? (
                  <animate attributeName="stroke-dashoffset" from="1120" to="0" dur="3s" repeatCount="indefinite" />
                ) : (
                  <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="2s" repeatCount="indefinite" />
                )}
              </path>
            </g>
          ))}

          {/* 主路径标注：深圳 → 鹿特丹 */}
          <text x="620" y="118" textAnchor="middle" className="fill-cyan-400" style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.1em' }}>
            主优化路径
          </text>

          {/* 节点 */}
          {HUBS.map(hub => {
            const color = LEVEL_COLOR[hub.level];
            const isHovered = hovered?.id === hub.id;
            return (
              <g
                key={hub.id}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(hub)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* 外环光晕 */}
                <circle cx={hub.x} cy={hub.y} r={isHovered ? 22 : 18} fill={color} fillOpacity={0.08} className="transition-all duration-300" />
                <circle cx={hub.x} cy={hub.y} r={isHovered ? 14 : 11} fill={color} fillOpacity={0.25} className="animate-pulse transition-all duration-300" />
                <circle cx={hub.x} cy={hub.y} r={isHovered ? 7 : 5} fill={color} filter="url(#glow)" className="transition-all duration-300" />
                {/* 节点名称 */}
                <text
                  x={hub.x}
                  y={hub.y + (hub.level === 'congested' || hub.level === 'severe' ? -22 : 26)}
                  textAnchor="middle"
                  className="transition-all duration-300"
                  style={{ fontSize: isHovered ? '14px' : '12px', fontWeight: 900, fill: isHovered ? color : '#9dabb9', letterSpacing: '0.05em' }}
                >
                  {hub.name}
                </text>
              </g>
            );
          })}

          {/* 流动光点（主路径） */}
          <circle r="4" fill="#fff" filter="url(#glow)">
            <animateMotion dur="4s" repeatCount="indefinite" path="M780,290 Q620,120 488,175" />
          </circle>
          <circle r="3" fill="#06b6d4" filter="url(#glow)">
            <animateMotion dur="4s" repeatCount="indefinite" begin="1.5s" path="M780,290 Q620,120 488,175" />
          </circle>

          {/* 节点 hover 详情浮窗 */}
          {hovered && (
            <g pointerEvents="none">
              {(() => {
                const tipW = 150;
                const tipH = 64;
                let tx = hovered.x - tipW / 2;
                let ty = hovered.y - tipH - 24;
                // 边界裁剪
                if (tx < 8) tx = 8;
                if (tx + tipW > 992) tx = 992 - tipW;
                if (ty < 8) ty = hovered.y + 24;
                const color = LEVEL_COLOR[hovered.level];
                return (
                  <>
                    <rect x={tx} y={ty} width={tipW} height={tipH} rx="10" fill="#151B28" stroke={color} strokeWidth="1" opacity="0.96" />
                    <circle cx={tx + 14} cy={ty + 18} r="4" fill={color} />
                    <text x={tx + 26} y={ty + 22} style={{ fontSize: '13px', fontWeight: 900, fill: '#ffffff' }}>{hovered.name}</text>
                    <text x={tx + 12} y={ty + 40} style={{ fontSize: '10px', fontWeight: 700, fill: '#9dabb9' }}>拥堵等级：</text>
                    <text x={tx + 78} y={ty + 40} style={{ fontSize: '10px', fontWeight: 800, fill: color }}>{LEVEL_LABEL[hovered.level]}</text>
                    <text x={tx + 12} y={ty + 56} style={{ fontSize: '10px', fontWeight: 700, fill: '#9dabb9' }}>在途订单：</text>
                    <text x={tx + 78} y={ty + 56} style={{ fontSize: '10px', fontWeight: 800, fill: '#06b6d4' }}>{hovered.orders} 单</text>
                  </>
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      <div className="absolute bottom-4 left-4 md:bottom-10 md:left-10 z-20">
        <div className="bg-bg-modal/60 backdrop-blur-md border border-border-default p-3 md:p-6 rounded-[16px] md:rounded-[28px] shadow-2xl group hover:border-cyan-500/30 transition-all">
          <h4 className="text-sm md:text-xl font-black text-text-primary tracking-tight italic group-hover:text-cyan-400 transition-colors">当前主路径：深圳→鹿特丹</h4>
          <div className="mt-2 space-y-1">
            <p className="text-[10px] md:text-xs text-text-muted font-bold">预计时效：19-22天</p>
            <p className="text-[10px] md:text-xs text-text-muted font-bold">预估成本：$4920</p>
          </div>
        </div>
      </div>

      <div className="hidden md:block absolute bottom-10 right-10 bg-bg-elevated/60 backdrop-blur-2xl border border-border-default p-6 rounded-2xl min-w-[180px] z-10 shadow-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-border-default pb-3">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">枢纽节点图例</span>
          <Info size={12} className="text-text-muted" />
        </div>
        <div className="space-y-3">
          <LegendItem color="bg-emerald-500" label="正常" />
          <LegendItem color="bg-amber-500" label="拥堵" />
          <LegendItem color="bg-red-500" label="严重拥堵" />
        </div>
      </div>
      
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 0)', backgroundSize: '30px 30px' }} />
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-3 group cursor-pointer">
    <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.5)] group-hover:scale-125 transition-transform`} />
    <span className="text-[11px] font-black text-text-secondary group-hover:text-text-primary transition-colors uppercase tracking-tight">{label}</span>
  </div>
);

export default MapWidget;
