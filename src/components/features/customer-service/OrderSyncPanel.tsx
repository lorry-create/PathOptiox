
import React, { useState } from 'react';
import { RefreshCw, Layers, CheckCircle, Bot, Zap, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui';

export interface ActiveOrder {
  id: string;
  status: string;
  shipper: string;
  receiver: string;
  item: string;
}

interface OrderSyncPanelProps {
  activeOrder: ActiveOrder;
  onOrderChange: (order: ActiveOrder) => void;
  onAgentTrigger: () => void;
}

const OrderSyncPanel: React.FC<OrderSyncPanelProps> = ({ activeOrder, onOrderChange, onAgentTrigger }) => {
  const { showToast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const generateOrderId = () => 'CN' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');

  const generateShipper = () => {
    const pool = ['智联电子制造', '环球科技有限公司', '未来物流集团', '星辰供应链', '速达运输服务'];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const generateReceiver = () => {
    const pool = ['环球商贸 (北京)', '科技前沿 (上海)', '创新企业 (深圳)', '未来发展 (广州)', '智慧物流 (杭州)'];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const generateItem = () => {
    const pool = ['工业级精密传感器 x12', '智能设备配件 x20', '电子元件套件 x50', '机械零部件 x8', '通信设备 x15'];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const handleSync = () => {
    onOrderChange({
      id: generateOrderId(),
      status: 'IN TRANSIT',
      shipper: generateShipper(),
      receiver: generateReceiver(),
      item: generateItem(),
    });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAgentTrigger = () => {
    if (isAgentRunning) return;
    setIsAgentRunning(true);
    onAgentTrigger();
    setTimeout(() => setIsAgentRunning(false), 5000);
  };

  return (
    <div className="bg-bg-tertiary rounded-2xl md:rounded-[32px] border border-border-default p-4 md:p-8 h-auto md:h-[600px] flex flex-col shadow-2xl relative">
      <div className="flex justify-between items-center mb-4 md:mb-8">
        <div className="flex items-center gap-3">
          <Layers size={20} className="text-blue-400" />
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">订单信息同步</h3>
        </div>
        <button onClick={handleSync} className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 hover:text-blue-400">
          <RefreshCw size={12} /> 刷新
        </button>
      </div>

      {showSuccess && (
        <div className="absolute top-4 right-4 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-black py-2 px-4 rounded-full flex items-center gap-2 shadow-lg shadow-green-500/10 animate-in slide-in-from-top-4 duration-300 z-10">
          <CheckCircle size={14} />
          同步成功
        </div>
      )}

      <div className="flex-1 space-y-6 overflow-y-auto scrollbar-hide">
        <div className="bg-bg-secondary border border-border-default rounded-3xl p-6 relative group hover:border-blue-500/30 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">当前活动订单</span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded border border-emerald-500/20">{activeOrder.status}</span>
          </div>
          <div className="text-2xl font-black text-text-primary tracking-tighter mb-4">{activeOrder.id}</div>
          <div className="space-y-2">
            <InfoItem label="发货方" value={activeOrder.shipper} />
            <InfoItem label="收货方" value={activeOrder.receiver} />
            <InfoItem label="物品描述" value={activeOrder.item} />
          </div>

          <div className="mt-4 flex items-start gap-2 bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2.5">
            <span className="text-xs leading-none mt-px">⚠️</span>
            <p className="text-[10px] text-amber-400/90 font-bold leading-relaxed">
              途经区域存在恶劣天气预警，可能延误2-3天
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] text-text-muted font-black uppercase tracking-widest pl-2">历史关联订单</h4>
          <HistoryCard id="CN77218841" date="2023-11-20" />
          <HistoryCard id="CN76550012" date="2023-11-15" />
        </div>
      </div>

      <button
        onClick={() => setShowConfirm(true)}
        disabled={isAgentRunning}
        className={`w-full mt-4 md:mt-8 py-4 md:py-5 text-white text-xs font-black rounded-2xl shadow-xl uppercase tracking-widest hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden disabled:hover:scale-100 ${
          isAgentRunning
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-orange-600/30'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-indigo-600/30 hover:shadow-indigo-500/40'
        }`}
      >
        {isAgentRunning ? (
          <>
            <Zap size={16} className="relative z-10 animate-pulse" />
            <span className="relative z-10">⚡ 引擎执行中...</span>
          </>
        ) : (
          <>
            <Bot size={16} className="relative z-10" />
            <span className="relative z-10">唤醒 AI 异常诊断与重路由</span>
          </>
        )}
      </button>

      {/* 二次确认弹窗 */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-bg-secondary border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20">
                <AlertTriangle size={16} className="text-orange-400" />
              </div>
              <p className="text-sm font-black text-text-primary uppercase tracking-widest">确认异常诊断</p>
            </div>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              将唤醒 AI 异常诊断与重路由引擎，重新规划运输路线，确认继续？
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-xl text-xs font-black hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  showToast('已生成3套备选方案');
                  setShowConfirm(false);
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-black hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoItem = ({ label, value }: any) => (
  <div className="flex justify-between items-center">
    <span className="text-[10px] text-text-muted font-bold uppercase">{label}</span>
    <span className="text-xs text-text-secondary font-medium">{value}</span>
  </div>
);

const HistoryCard = ({ id, date }: any) => (
  <div className="p-4 bg-bg-elevated/40 border border-border-default rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-bg-tertiary transition-colors duration-300">
    <span className="text-xs font-black text-text-secondary group-hover:text-text-primary">{id}</span>
    <span className="text-[10px] text-text-muted font-bold font-mono">{date}</span>
  </div>
);

export default OrderSyncPanel;
