﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿
import React from 'react';

interface Props {
  isStress?: boolean;
}

const PressureMap: React.FC<Props> = ({ isStress }) => {
  return (
    <div className="bg-bg-secondary/60 border border-border-default rounded-[32px] p-4 sm:p-8 min-h-[280px] sm:h-[400px] flex flex-col relative overflow-hidden group">
      <div className="mb-6 relative z-10">
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">全球港口拥堵热力 (实时模拟)</h3>
      </div>

      <div className="flex-1 bg-bg-primary/40 rounded-2xl border border-border-default/50 flex items-center justify-center relative overflow-hidden">
        {/* 地图底图模拟 */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pointer-events-none" />
        <img 
          src="https://picsum.photos/seed/dark-world-map/800/400" 
          className="w-full h-full object-cover opacity-10 grayscale brightness-50" 
          alt="Map"
        />

        {/* 核心拥堵热力点 - 复刻图片中的红光 */}
        <div className="absolute top-[40%] left-[65%] w-20 h-20 bg-red-600/40 rounded-full blur-[25px] animate-pulse" />
        <div className="absolute top-[42%] left-[67%] w-8 h-8 bg-red-500 rounded-full blur-[8px]" />
        
        <div className="absolute top-[60%] left-[80%] w-16 h-16 bg-orange-600/30 rounded-full blur-[20px]" />
        <div className="absolute top-[62%] left-[82%] w-5 h-5 bg-orange-500 rounded-full blur-[6px]" />

        {/* 扫描线装饰 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent h-2 w-full animate-[scan_4s_linear_infinite]" />
      </div>

      <div className="absolute bottom-6 left-10 text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
         Suez Canal / Congestion Level: Critical
      </div>
    </div>
  );
};

export default PressureMap;
