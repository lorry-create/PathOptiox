
import React, { useState, useEffect } from 'react';
import { X, Plane, Ship, Train, Truck, MapPin, Share2, Leaf, Clock, ShieldCheck, Check } from 'lucide-react';

interface CapacityMatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

const CapacityMatchingModal: React.FC<CapacityMatchingModalProps> = ({ isOpen, onClose, orderId }) => {
  const [selectedMode, setSelectedMode] = useState<string>('air');
  const [origin, setOrigin] = useState<string>('上海');
  const [destination, setDestination] = useState<string>('洛杉矶');

  // 随机地点列表
  const locations = [
    '上海', '北京', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆',
    '洛杉矶', '纽约', '伦敦', '巴黎', '东京', '新加坡', '迪拜', '悉尼', '法兰克福', '鹿特丹'
  ];

  // 随机生成地点
  const generateRandomLocations = () => {
    const randomIndex1 = Math.floor(Math.random() * locations.length);
    let randomIndex2 = Math.floor(Math.random() * locations.length);
    
    // 确保出发地和目的地不同
    while (randomIndex2 === randomIndex1) {
      randomIndex2 = Math.floor(Math.random() * locations.length);
    }
    
    setOrigin(locations[randomIndex1]);
    setDestination(locations[randomIndex2]);
  };

  // 当模态框打开时，生成随机地点
  useEffect(() => {
    if (isOpen) {
      generateRandomLocations();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const transportModes = [
    { id: 'air', icon: <Plane size={32} />, label: '空运-航班', sub: 'CA1234', price: '¥50/kg', cap: '50k Cap', status: '空闲', color: 'text-blue-400', bg: 'bg-blue-600/20' },
    { id: 'sea', icon: <Ship size={32} />, label: '海运-轮船', sub: 'MSC123', price: '¥10/kg', cap: '500k Cap', status: '空闲', color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
    { id: 'rail', icon: <Train size={32} />, label: '铁运-班列', sub: '中欧班列', price: '¥15/kg', cap: '200k Cap', status: '部分占用', color: 'text-orange-400', bg: 'bg-orange-600/10' },
    { id: 'road', icon: <Truck size={32} />, label: '陆运-卡车', sub: '国内干线', price: '¥20/kg', cap: '30k Cap', status: '已满', color: 'text-text-muted', bg: 'bg-bg-tertiary/40', disabled: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-0 md:p-4">
      <div className="bg-bg-secondary w-full h-full md:w-auto md:h-auto md:max-w-4xl rounded-none md:rounded-[40px] border border-border-default shadow-[0_32px_128px_-16px_rgba(0,0,0,1)] overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 md:px-10 py-6 md:py-8 border-b border-border-default flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
              <Share2 size={24} />
            </div>
            <h2 className="text-xl font-black text-text-primary tracking-tight">选择运输工具</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center text-text-muted hover:text-text-primary transition-all duration-300 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 md:py-10 space-y-8">
          {/* Order Detail Card */}
          <div className="bg-bg-tertiary border border-border-default rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center relative group gap-4 md:gap-0">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black rounded uppercase tracking-widest">订单详情</span>
                <span className="text-lg font-black text-text-primary tabular-nums tracking-tighter">{orderId}</span>
              </div>
              
              <div className="flex items-center gap-12">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <MapPin size={16} className="text-emerald-500" />
                    <div className="w-0.5 h-4 bg-bg-tertiary" />
                    <MapPin size={16} className="text-orange-500" />
                  </div>
                  <div className="flex flex-col gap-5">
                    <span className="text-sm font-bold text-text-secondary">{origin}</span>
                    <span className="text-sm font-bold text-text-secondary">{destination}</span>
                  </div>
                </div>

                <div className="flex gap-8 border-l border-border-default pl-8">
                  <div className="space-y-1">
                    <div className="text-[10px] text-text-muted font-black uppercase tracking-widest">总计重量</div>
                    <div className="text-sm font-black text-text-primary">150 kg</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-text-muted font-black uppercase tracking-widest">总计体积</div>
                    <div className="text-sm font-black text-text-primary">5 m³</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Snippet */}
            <div className="hidden md:block w-48 h-28 bg-bg-primary rounded-2xl border border-border-default overflow-hidden relative shadow-inner">
               <img 
                 src={`https://picsum.photos/seed/${origin}-${destination}/200/120?grayscale&blur=2`} 
                 className="w-full h-full object-cover opacity-30" 
                 alt="Route Map" 
               />
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                   <MapPin size={16} className="text-text-primary" />
                 </div>
               </div>
               <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[8px] text-text-primary font-bold uppercase tracking-widest">LIVE MAPPING</div>
            </div>
          </div>

          {/* Transport Mode Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {transportModes.map((mode) => (
              <button
                key={mode.id}
                disabled={mode.disabled}
                onClick={() => !mode.disabled && setSelectedMode(mode.id)}
                className={`flex flex-col h-72 border transition-all duration-300 rounded-3xl relative p-6 text-left group ${
                  selectedMode === mode.id 
                    ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.15)] ring-2 ring-blue-500/20' 
                    : 'bg-bg-tertiary border-border-default hover:border-border-input'
                } ${mode.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {/* Checkmark indicator */}
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 ${
                  selectedMode === mode.id ? 'bg-blue-600 border-blue-400' : 'border-border-input'
                }`}>
                  {selectedMode === mode.id && <Check size={14} className="text-text-primary" />}
                </div>

                <div className={`flex-1 flex items-center justify-center rounded-2xl mb-8 ${mode.bg} ${mode.color}`}>
                  {mode.icon}
                </div>

                <div className="space-y-1.5 mt-auto">
                  <div className="text-sm font-black text-text-primary">{mode.label}</div>
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{mode.sub}</div>
                  
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-border-default">
                    <span className="text-[10px] font-black text-text-secondary">{mode.price} | {mode.cap}</span>
                    <span className={`text-[10px] font-black uppercase flex items-center gap-1.5 ${
                      mode.status === '空闲' ? 'text-emerald-500' : 
                      mode.status === '部分占用' ? 'text-orange-500' : 'text-slate-600'
                    }`}>
                      <div className={`w-1 h-1 rounded-full ${
                        mode.status === '空闲' ? 'bg-emerald-500' : 
                        mode.status === '部分占用' ? 'bg-orange-500' : 'bg-bg-tertiary'
                      }`} />
                      {mode.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Details Bar */}
          <div className="bg-bg-tertiary border border-border-default rounded-3xl p-8 space-y-6">
             <div className="flex items-center justify-between border-b border-border-default pb-6">
                <div className="flex items-center gap-4">
                  <Leaf size={18} className="text-blue-400" />
                  <span className="text-xs font-bold text-text-muted">碳排放等级</span>
                </div>
                <span className="text-sm font-black text-text-primary">A级 (低排放 - 航空最优)</span>
             </div>
             <div className="flex items-center justify-between border-b border-border-default pb-6">
                <div className="flex items-center gap-4">
                  <Clock size={18} className="text-blue-400" />
                  <span className="text-xs font-bold text-text-muted">预估时效</span>
                </div>
                <span className="text-sm font-black text-text-primary italic tracking-tight">18-24 小时 (极快)</span>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ShieldCheck size={18} className="text-blue-400" />
                  <span className="text-xs font-bold text-text-muted">服务可靠性</span>
                </div>
                <span className="text-sm font-black text-text-primary">99.9% 准时率</span>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 md:px-10 py-6 md:py-8 bg-bg-primary/40 border-t border-border-default flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-bg-elevated border border-border-default text-text-muted text-sm font-black rounded-2xl hover:bg-bg-tertiary transition-all duration-300 uppercase tracking-[0.2em]"
          >
            取消
          </button>
          <button 
            onClick={onClose}
            className="px-12 py-4 bg-blue-600 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all duration-300 active:scale-95 uppercase tracking-[0.2em]"
          >
            确定方案
          </button>
        </div>
      </div>
    </div>
  );
};

export default CapacityMatchingModal;
