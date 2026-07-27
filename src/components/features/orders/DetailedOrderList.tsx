
import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, ChevronLeft, ChevronRight, MoreHorizontal, Download, ArrowUpDown, AlertCircle, Edit, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import EditOrderModal from './EditOrderModal';
import { orderApi } from '@services';
import type { Order } from '@services';

interface DetailedOrderListProps {
  filterType?: 'all' | 'delayed';
}

const DetailedOrderList: React.FC<DetailedOrderListProps> = ({ filterType = 'all' }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<{ [key: string]: boolean }>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 从后端API获取订单数据
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      // 构建请求参数
      const filters = debouncedSearchTerm ? { keyword: debouncedSearchTerm } : undefined;

      const data = await orderApi.getOrders(filters);
      // 根据过滤类型筛选订单
      let filteredOrders = data.orders;
      if (filterType === 'delayed') {
        filteredOrders = filteredOrders.filter((order: Order) => order.status === '异常延误');
      }
      setOrders(filteredOrders);
      // 重置到第一页
      setCurrentPage(1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取订单数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 删除订单
  const deleteOrder = async (orderId: string) => {
    if (!confirm('确定要删除这个订单吗？')) {
      return;
    }
    
    try {
      await orderApi.deleteOrder(orderId);

      // 重新获取订单数据
      fetchOrders();
      // 关闭操作菜单
      setShowActionMenu(prev => ({ ...prev, [orderId]: false }));
    } catch (err) {
      alert('删除订单失败，请稍后重试');
    }
  };

  // 编辑订单
  const editOrder = (orderId: string) => {
    // 打开编辑模态框
    setOrderToEdit(orderId);
    setIsEditModalOpen(true);
    // 关闭操作菜单
    setShowActionMenu(prev => ({ ...prev, [orderId]: false }));
  };

  // 获取运输方式（模拟数据）
  const getTransportType = (index: number) => {
    return ['海运', '空运', '铁运'][index % 3];
  };

  // 下载订单数据为Excel
  const downloadOrders = () => {
    // 准备导出数据
    const exportData = orders.map((order, idx) => {
      return {
        '订单编号': order.id,
        '客户/实体': order.customer_name,
        '运输方式': getTransportType(idx),
        '状态': order.status,
        '交易金额': order.amount,
        '创建日期': order.date
      };
    });

    // 创建工作簿和工作表
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // 设置列宽
    const wscols = [
      { wch: 15 }, // 订单编号
      { wch: 20 }, // 客户/实体
      { wch: 15 }, // 运输方式
      { wch: 15 }, // 状态
      { wch: 15 }, // 交易金额
      { wch: 15 }  // 创建日期
    ];
    worksheet['!cols'] = wscols;

    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '订单数据');

    // 生成Excel文件并下载
    const fileName = `订单数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
    
    try {
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      alert('下载失败，请稍后重试');
    }
  };

  // 切换操作菜单显示
  const toggleActionMenu = (orderId: string) => {
    setShowActionMenu(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // 初始化时获取订单数据，搜索词变化时重新获取
  useEffect(() => {
    fetchOrders();
  }, [filterType, debouncedSearchTerm]);

  // 计算分页信息
  const totalCount = orders.length;
  const totalPages = Math.ceil(totalCount / 10);
  const startIndex = (currentPage - 1) * 10;
  const endIndex = Math.min(currentPage * 10, totalCount);
  const paginatedOrders = orders.slice(startIndex, endIndex);

  return (
    <div className="bg-bg-secondary border border-border-default rounded-[32px] p-8 shadow-2xl flex flex-col gap-8">
      {/* 内部工具栏 */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder={filterType === 'delayed' ? "在延误订单中搜索..." : "在全量订单中搜索..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-bg-primary border border-border-default rounded-xl pl-10 pr-4 py-3 text-xs text-text-muted focus:outline-none focus:border-blue-500 w-80 transition-all duration-300"
            />
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>
          {filterType === 'delayed' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-[10px] font-black uppercase">
              <AlertCircle size={14} /> 过滤器: 异常延误已激活
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={downloadOrders}
            className="p-3 bg-bg-primary border border-border-default text-text-muted rounded-xl hover:text-text-primary transition-all duration-300"
            title="下载订单数据为Excel"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* 详细表格 */}
      <div className="overflow-x-auto rounded-2xl border border-border-default">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-bg-primary border-b border-border-default">
              <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest">
                <div className="flex items-center gap-2 cursor-pointer hover:text-text-secondary transition-colors duration-300">
                  订单编号 <ArrowUpDown size={10} />
                </div>
              </th>
              <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest">客户/实体</th>
              <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest">运输方式</th>
              <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest text-center">状态</th>
              {filterType === 'delayed' && <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest">异常原因</th>}
              <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">交易金额</th>
              <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default/30">
            {loading ? (
              <tr>
                <td colSpan={filterType === 'delayed' ? 7 : 6} className="p-20 text-center">
                  <div className="text-text-muted text-sm font-medium">加载订单数据中...</div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={filterType === 'delayed' ? 7 : 6} className="p-20 text-center">
                  <div className="text-red-400 text-sm font-medium mb-4">{error}</div>
                  <button
                    onClick={fetchOrders}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
                  >
                    重试
                  </button>
                </td>
              </tr>
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={filterType === 'delayed' ? 7 : 6} className="p-20 text-center">
                  <div className="text-text-muted text-sm font-medium">暂无订单数据</div>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order, idx) => (
                <tr key={order.id} className="group hover:bg-bg-tertiary/5 transition-all duration-300">
                  <td className="p-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-blue-400 font-mono italic">{order.id}</span>
                      <span className="text-[9px] text-text-muted font-bold uppercase mt-1">创建日期: {order.date}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="text-sm font-bold text-text-secondary">{order.customer_name}</span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-border-default" />
                      <span className="text-xs font-medium text-text-muted">{getTransportType(idx)}</span>
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border border-white/5 ${order.status === '异常延误' ? 'bg-red-500/10 text-red-500' : order.status === '运输中' ? 'bg-blue-500/10 text-blue-400' : order.status === '已处理' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-bg-tertiary/50 text-text-muted'}`}>
                      {order.status}
                    </span>
                  </td>
                  {filterType === 'delayed' && (
                    <td className="p-5">
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10 uppercase tracking-tighter italic">
                        清关滞留
                      </span>
                    </td>
                  )}
                  <td className="p-5 text-right font-mono text-xs font-black text-text-primary">
                    {order.amount}
                  </td>
                  <td className="p-5 text-right relative">
                    <button 
                      onClick={() => toggleActionMenu(order.id)}
                      className="p-2 text-text-muted hover:text-text-primary transition-colors duration-300"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    
                    {/* 操作菜单 */}
                    {showActionMenu[order.id] && (
                      <div className="absolute right-0 top-full mt-2 w-40 bg-bg-secondary border border-border-default rounded-xl shadow-xl z-10 py-2">
                        <button 
                          onClick={() => editOrder(order.id)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm font-medium text-text-secondary hover:bg-bg-tertiary/50 transition-colors duration-300"
                        >
                          <Edit size={14} />
                          编辑
                        </button>
                        <button 
                          onClick={() => deleteOrder(order.id)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页控制区 */}
      <div className="flex justify-between items-center bg-bg-primary p-6 rounded-3xl border border-border-default">
        <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">
          显示 <span className="text-text-primary">{startIndex + 1} - {endIndex}</span> 条记录，共 <span className="text-text-primary">{totalCount}</span> 项
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-2 rounded-xl bg-bg-elevated border border-border-default text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              // 处理分页逻辑，显示当前页附近的页码
              if (totalPages > 5) {
                if (currentPage > 3) {
                  if (currentPage < totalPages - 2) {
                    pageNum = currentPage - 2 + i;
                  } else {
                    pageNum = totalPages - 4 + i;
                  }
                }
              }
              return pageNum;
            }).map((p) => (
              <button 
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all duration-300 ${currentPage === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-bg-elevated border border-border-default text-text-muted hover:border-border-input hover:text-text-secondary'}`}
              >
                {p}
              </button>
            ))}
            {totalPages > 5 && (
              <button className="w-9 h-9 rounded-xl text-[10px] font-black bg-bg-elevated border border-border-default text-text-muted">
                ...
              </button>
            )}
          </div>

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-2 rounded-xl bg-bg-elevated border border-border-default text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-text-muted uppercase">跳至页码</span>
          <input 
            type="number" 
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (!isNaN(page) && page >= 1 && page <= totalPages) {
                setCurrentPage(page);
              }
            }}
            className="w-12 bg-bg-elevated border border-border-default rounded-lg p-1.5 text-center text-xs text-text-primary font-mono focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 编辑订单模态框 */}
      <EditOrderModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        orderId={orderToEdit || ''}
        onOrderUpdated={fetchOrders}
      />
    </div>
  );
};

export default DetailedOrderList;
