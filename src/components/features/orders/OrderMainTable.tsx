
import React, { useState, useEffect } from 'react';
import { MoreVertical, ChevronRight, RefreshCw, ChevronDown, MapPin, Package, Clock, Truck, Edit3, Trash2 } from 'lucide-react';
import CapacityMatchingModal from './CapacityMatchingModal';
import CapacityAnalysisModal from './CapacityAnalysisModal';
import CarbonMonitoringModal from './CarbonMonitoringModal';
import EditOrderModal from './EditOrderModal';
import { orderApi } from '@services';
import type { Order, OrderFilters } from '@services';
import { getOrderStatusMeta, getTransportModeMeta } from '@/constants/enums';

interface OrderMainTableProps {
  searchKeyword?: string;
  isSearching?: boolean;
  filterStatus?: string | null;
  filterDateRange?: string | null;
  isFiltering?: boolean;
}

// 金额格式化：12345.6 -> "$12,345.60"
const formatCurrency = (value: number | undefined | null): string => {
  if (value === null || value === undefined) return '-';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const OrderMainTable: React.FC<OrderMainTableProps> = ({
  searchKeyword = '',
  isSearching = false,
  filterStatus = null,
  filterDateRange = null,
  isFiltering = false
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isMatchingModalOpen, setIsMatchingModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isCarbonModalOpen, setIsCarbonModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: OrderFilters = {};
      if (searchKeyword.trim()) {
        filters.keyword = searchKeyword;
      }
      if (isFiltering) {
        if (filterStatus) filters.status = filterStatus;
        if (filterDateRange) filters.dateRange = filterDateRange;
      }

      const resp = await orderApi.getOrders(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      setOrders(resp?.orders ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取订单数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 切换订单行展开/收起
  const handleToggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
  };

  // 组件挂载时获取订单数据，当搜索关键词、搜索状态或过滤器条件变化时重新获取
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword, isSearching, filterStatus, filterDateRange, isFiltering]);

  const handleOpenMatching = (id: string) => {
    setSelectedOrderId(id);
    setIsMatchingModalOpen(true);
  };

  const handleOpenAnalysis = (id: string) => {
    setSelectedOrderId(id);
    setIsAnalysisModalOpen(true);
  };

  const handleOpenCarbon = (id: string) => {
    setSelectedOrderId(id);
    setIsCarbonModalOpen(true);
  };

  const handleOpenEdit = (id: string) => {
    setSelectedOrderId(id);
    setIsEditModalOpen(true);
    setShowDeleteMenu(null);
  };

  // S2-T08: 编辑成功后刷新订单列表
  const handleOrderUpdated = () => {
    setIsEditModalOpen(false);
    fetchOrders();
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('确定要删除这个订单吗？')) {
      return;
    }

    try {
      await orderApi.deleteOrder(orderId);
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      setShowDeleteMenu(null);
    } catch (err) {
      alert('删除订单失败，请稍后重试');
    }
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-3xl p-8 shadow-2xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">活跃订单列表</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2 border border-border-default rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary/50 transition-all duration-300"
          >
            <RefreshCw size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">刷新</span>
          </button>
          <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest">全部导出</button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-muted text-sm font-medium">加载订单数据中...</div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-red-400 text-sm font-medium">{error}</div>
            <button
              onClick={fetchOrders}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
            >
              重试
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border-default">
                <th className="pb-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">订单 ID</th>
                <th className="pb-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">客户名称</th>
                <th className="pb-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">日期</th>
                <th className="pb-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">金额</th>
                <th className="pb-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">当前状态</th>
                <th className="pb-4 text-right pr-4 text-[10px] font-black text-text-muted uppercase tracking-widest">快速操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/20">
              {orders.map((order, idx) => {
                const statusMeta = getOrderStatusMeta(order.status);
                const transportMeta = order.shipping_method
                  ? getTransportModeMeta(order.shipping_method)
                  : null;
                const isExpanded = expandedOrderId === order.id;
                return (
                  <React.Fragment key={idx}>
                    <tr
                      className={`group hover:bg-bg-tertiary/10 cursor-pointer transition-colors duration-300 ${isExpanded ? 'bg-bg-tertiary/10' : ''}`}
                      onClick={() => handleToggleExpand(order.id)}
                    >
                    <td className="py-6 font-mono text-xs text-blue-400 font-black">
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          size={14}
                          className={`text-text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                        {order.id}
                      </div>
                    </td>
                    <td className="py-6 text-sm font-bold text-text-secondary">{order.customer_name}</td>
                    <td className="py-6 text-xs text-text-muted font-medium tracking-tighter">{order.date}</td>
                    <td className="py-6 text-xs font-black text-text-primary">{formatCurrency(order.total_amount)}</td>
                    <td className="py-6">
                      <span className={`px-3 py-1 ${statusMeta.colorClass} border rounded-full text-[10px] font-black`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="py-6 text-right">
                      <div className="flex items-center justify-end gap-2 pr-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenMatching(order.id); }}
                          className="flex flex-col items-center justify-center w-[54px] h-[54px] border border-amber-500/40 rounded-xl text-amber-500 hover:bg-amber-500/10 transition-all group/btn cursor-pointer"
                        >
                          <span className="text-[10px] font-black leading-tight tracking-tighter">匹配运</span>
                          <span className="text-[10px] font-black leading-tight tracking-tighter">力</span>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenAnalysis(order.id); }}
                          className="flex flex-col items-center justify-center w-[54px] h-[54px] border border-blue-500/40 rounded-xl text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer"
                        >
                          <span className="text-[10px] font-black leading-tight tracking-tighter">运力分</span>
                          <span className="text-[10px] font-black leading-tight tracking-tighter">析</span>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenCarbon(order.id); }}
                          className="flex flex-col items-center justify-center w-[54px] h-[54px] border border-border-default rounded-xl text-text-muted hover:bg-bg-tertiary transition-all duration-300 cursor-pointer"
                        >
                          <span className="text-[10px] font-black leading-tight tracking-tighter">碳排监</span>
                          <span className="text-[10px] font-black leading-tight tracking-tighter">测</span>
                        </button>

                        <div className="relative group">
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowDeleteMenu(showDeleteMenu === order.id ? null : order.id); }}
                            className="p-2 ml-2 text-text-muted hover:text-text-primary transition-colors duration-300 rounded-lg hover:bg-bg-tertiary/50 cursor-pointer"
                          >
                            <MoreVertical size={18} />
                          </button>
                          {showDeleteMenu === order.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-bg-elevated border border-border-default rounded-lg shadow-2xl z-50 overflow-hidden">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenEdit(order.id); }}
                                className="w-full px-4 py-3 text-left text-sm text-blue-400 hover:bg-bg-tertiary hover:text-blue-300 transition-all duration-300 flex items-center gap-2 cursor-pointer"
                              >
                                <Edit3 size={16} />
                                <span className="font-medium">编辑订单</span>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-bg-tertiary hover:text-red-300 transition-all duration-300 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 size={16} />
                                <span className="font-medium">删除订单</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-bg-tertiary/5">
                      <td colSpan={6} className="px-8 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 shrink-0">
                              <MapPin size={14} />
                            </div>
                            <div>
                              <div className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">收发货方</div>
                              <div className="text-xs text-text-secondary font-bold leading-relaxed">
                                {order.sender || '-'}
                              </div>
                              <div className="text-[10px] text-text-muted font-medium">→ {order.receiver || '-'}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                              <Package size={14} />
                            </div>
                            <div>
                              <div className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">物品描述</div>
                              <div className="text-xs text-text-secondary font-bold leading-relaxed">
                                {order.goods_description || '-'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 shrink-0">
                              <Clock size={14} />
                            </div>
                            <div>
                              <div className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">预计时效</div>
                              <div className="text-xs text-text-secondary font-bold leading-relaxed">
                                {order.estimated_delivery || '-'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 shrink-0">
                              <Truck size={14} />
                            </div>
                            <div>
                              <div className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">运输方式</div>
                              <div className="text-xs text-text-secondary font-bold leading-relaxed">
                                {transportMeta ? transportMeta.label : (order.shipping_method || '-')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CapacityMatchingModal
        isOpen={isMatchingModalOpen}
        onClose={() => setIsMatchingModalOpen(false)}
        orderId={selectedOrderId || 'ORD-2024-001'}
      />

      <CapacityAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        orderId={selectedOrderId || 'ORD-2024-001'}
      />

      <CarbonMonitoringModal
        isOpen={isCarbonModalOpen}
        onClose={() => setIsCarbonModalOpen(false)}
        orderId={selectedOrderId || 'ORD-2024-001'}
      />

      {/* S2-T08: 订单编辑弹窗 */}
      <EditOrderModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        orderId={selectedOrderId || ''}
        onOrderUpdated={handleOrderUpdated}
      />
    </div>
  );
};

export default OrderMainTable;
