import React, { useState, useEffect } from 'react';
import { X, Package, Calendar, User, DollarSign, Activity, ChevronDown } from 'lucide-react';
import { orderApi } from '@services';
import type { Order } from '@services';
import { getStatusText, getStatusColor, mapStatusToValue } from '../../../utils/orderUtils';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onOrderUpdated: () => void;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ isOpen, onClose, orderId, onOrderUpdated }) => {
  if (!isOpen) return null;

  // 表单状态管理
  const [formData, setFormData] = useState<{
    orderId: string;
    customerName: string;
    date: string;
    amount: string;
    status: string;
  }>({
    orderId: '',
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    status: 'pending'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  // 获取订单详情
  const fetchOrderDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await orderApi.getOrders();
      const foundOrder = data.orders.find((o) => o.id === orderId);
      
      if (!foundOrder) {
        throw new Error('Order not found');
      }
      
      setOrder(foundOrder);
      
      // 填充表单数据
      setFormData({
        orderId: foundOrder.id,
        customerName: foundOrder.customer_name,
        date: foundOrder.date,
        amount: foundOrder.amount.replace('$', '').replace(',', ''),
        status: mapStatusToValue(foundOrder.status)
      });
    } catch (err) {
      setError('获取订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 验证表单
      if (!formData.customerName) {
        throw new Error('请输入客户名称');
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('请输入有效的订单金额');
      }

      // 构建订单数据
      const orderData = {
        id: formData.orderId,
        customer_name: formData.customerName,
        date: formData.date,
        amount: `$${parseFloat(formData.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        status: getStatusText(formData.status),
        status_color: getStatusColor(formData.status)
      };

      // 发送请求到后端更新订单
      await orderApi.updateOrder(orderId, orderData);

      // 显示成功消息
      setSuccess('订单更新成功！');
      
      // 延迟关闭模态框并触发刷新
      setTimeout(() => {
        onClose();
        onOrderUpdated(); // 触发订单列表刷新
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : '更新订单时发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 初始化时获取订单详情
  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300 p-0 md:p-4">
      <div className="bg-bg-modal w-full h-full md:w-auto md:h-auto md:max-w-xl rounded-none md:rounded-[40px] border border-border-default shadow-[0_32px_128px_-16px_rgba(0,0,0,1)] overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 md:px-10 py-6 md:py-8 border-b border-border-default flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary tracking-tight">编辑订单</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Edit Logistics Order</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={loading}
            className="w-10 h-10 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center text-text-muted hover:text-text-primary transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 md:px-10 py-6 md:py-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] text-text-muted font-black uppercase tracking-widest pl-1">订单 ID</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-blue-400 transition-colors duration-300">
                  <span className="text-[10px] font-black">ID</span>
                </div>
                <input 
                  type="text" 
                  name="orderId"
                  value={formData.orderId}
                  onChange={handleInputChange}
                  disabled
                  className="w-full bg-bg-tertiary border border-border-default rounded-2xl pl-12 pr-4 py-4 text-sm text-text-secondary focus:outline-none focus:border-blue-500/50 transition-all duration-300 shadow-inner placeholder:text-text-muted font-mono disabled:bg-bg-elevated disabled:text-text-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-text-muted font-black uppercase tracking-widest pl-1">日期选择</label>
              <div className="relative group">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-blue-400 transition-colors duration-300" />
                <input 
                  type="date" 
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full bg-bg-tertiary border border-border-default rounded-2xl pl-12 pr-4 py-4 text-sm text-text-secondary focus:outline-none focus:border-blue-500/50 transition-all duration-300 shadow-inner [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-text-muted font-black uppercase tracking-widest pl-1">客户名称</label>
            <div className="relative group">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-blue-400 transition-colors duration-300" />
              <input 
                type="text" 
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="请输入客户或公司全称..."
                className="w-full bg-bg-tertiary border border-border-default rounded-2xl pl-12 pr-4 py-4 text-sm text-text-secondary focus:outline-none focus:border-blue-500/50 transition-all duration-300 shadow-inner placeholder:text-text-muted font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] text-text-muted font-black uppercase tracking-widest pl-1">订单金额</label>
              <div className="relative group">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-blue-400 transition-colors duration-300" />
                <input 
                  type="number" 
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-bg-tertiary border border-border-default rounded-2xl pl-12 pr-4 py-4 text-sm text-text-secondary focus:outline-none focus:border-blue-500/50 transition-all duration-300 shadow-inner placeholder:text-text-muted font-black tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-text-muted font-black uppercase tracking-widest pl-1">当前状态</label>
              <div className="relative group">
                <Activity size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-blue-400 transition-colors duration-300" />
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full bg-bg-tertiary border border-border-default rounded-2xl pl-12 pr-10 py-4 text-sm text-text-secondary focus:outline-none focus:border-blue-500/50 transition-all duration-300 shadow-inner appearance-none cursor-pointer font-bold"
                >
                  <option value="pending">待分配 (Pending)</option>
                  <option value="processing">处理中 (Processing)</option>
                  <option value="shipping">运输中 (In Transit)</option>
                  <option value="completed">已妥投 (Delivered)</option>
                  <option value="delayed">异常延误 (Delayed)</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 错误或成功消息 */}
          {error && (
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex gap-3 items-start">
              <div className="p-1.5 bg-red-500/20 rounded-lg text-red-400 shrink-0">
                <X size={14} />
              </div>
              <p className="text-[10px] text-red-400 leading-relaxed font-medium">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl flex gap-3 items-start">
              <div className="p-1.5 bg-green-500/20 rounded-lg text-green-400 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <p className="text-[10px] text-green-400 leading-relaxed font-medium">
                {success}
              </p>
            </div>
          )}

          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3 items-start mt-2">
             <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 shrink-0">
               <Package size={14} />
             </div>
             <p className="text-[10px] text-text-muted leading-relaxed font-medium">
               编辑订单信息后，系统将自动更新订单状态并通知相关部门。
             </p>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 md:px-10 py-6 md:py-8 bg-bg-primary/40 border-t border-border-default flex justify-end gap-4">
          <button 
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-8 py-4 bg-bg-elevated border border-border-default text-text-muted text-xs font-black rounded-2xl hover:bg-bg-tertiary transition-all duration-300 uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-12 py-4 bg-blue-600 text-white text-xs font-black rounded-2xl shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all duration-300 active:scale-95 uppercase tracking-[0.2em] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                更新中...
              </>
            ) : (
              "更新订单"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;