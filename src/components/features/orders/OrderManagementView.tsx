
import React, { useState } from 'react';
import OrderMetrics from './OrderMetrics';
import OrderMainTable from './OrderMainTable';
import LiveTracking from './LiveTracking';
import InventoryAlerts from './InventoryAlerts';
import CreateOrderModal from './CreateOrderModal';
import DetailedOrderList from './DetailedOrderList';
import FilterModal from './FilterModal';
import { useToast } from '@/components/ui';
import { Package, Search, Filter, ChevronLeft, Zap, X } from 'lucide-react';

const OrderManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
  const [activeFilter, setActiveFilter] = useState<'all' | 'delayed'>('all');
  const [orderRefreshKey, setOrderRefreshKey] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<string | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isBatchScheduleModalOpen, setIsBatchScheduleModalOpen] = useState(false);

  // 批量智能调度确认
  const handleConfirmBatchSchedule = () => {
    setIsBatchScheduleModalOpen(false);
    showToast('MARL全局调度已启动，预计处理128条待分配订单');
  };

  const handleShowDetail = (filter: 'all' | 'delayed') => {
    setActiveFilter(filter);
    setViewMode('detail');
  };

  // 处理订单创建成功后的刷新
  const handleOrderCreated = () => {
    setOrderRefreshKey(prev => prev + 1);
    setIsCreateModalOpen(false);
  };

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    // 通过更新key来强制刷新OrderMainTable组件
    setOrderRefreshKey(prev => prev + 1);
  };

  // 处理清除搜索
  const handleClearSearch = () => {
    setSearchKeyword('');
    setIsSearching(false);
    // 通过更新key来强制刷新OrderMainTable组件
    setOrderRefreshKey(prev => prev + 1);
  };

  // 处理打开过滤器模态框
  const handleOpenFilterModal = () => {
    setIsFilterModalOpen(true);
  };

  // 处理应用过滤器
  const handleApplyFilter = (status: string | null, dateRange: string | null) => {
    setFilterStatus(status);
    setFilterDateRange(dateRange);
    setIsFiltering(true);
    setIsFilterModalOpen(false);
    // 通过更新key来强制刷新OrderMainTable组件
    setOrderRefreshKey(prev => prev + 1);
  };

  // 处理清除过滤器
  const handleClearFilter = () => {
    setFilterStatus(null);
    setFilterDateRange(null);
    setIsFiltering(false);
    // 通过更新key来强制刷新OrderMainTable组件
    setOrderRefreshKey(prev => prev + 1);
  };

  if (viewMode === 'detail') {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 animate-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode('overview')}
            className="p-3 bg-bg-secondary border border-border-default rounded-2xl text-text-muted hover:text-text-primary transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-text-primary tracking-tight">
              {activeFilter === 'delayed' ? '异常延误订单明细' : '订单明细账单'}
            </h2>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">
              {activeFilter === 'delayed' ? 'Critical Logistics Exceptions & Delay Tracking' : 'Comprehensive Order Ledger & History'}
            </p>
          </div>
        </div>
        <DetailedOrderList filterType={activeFilter} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 max-w-[1800px] mx-auto w-full">
      {/* 头部标题区 */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
              <Package size={28} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">智能订单调度中心</h2>
              <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                E-Commerce Fulfillment & Global Order Sync
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 md:gap-4 items-center">
           <form onSubmit={handleSearch} className="relative w-full md:w-auto">
             <input
               type="text"
               placeholder="搜索订单、运单号..."
               value={searchKeyword}
               onChange={(e) => setSearchKeyword(e.target.value)}
               className="bg-bg-secondary border border-border-default rounded-xl pl-10 pr-4 py-3 text-xs text-text-secondary focus:outline-none focus:border-blue-500 transition-all duration-300 w-full md:w-64"
             />
             <Search
               size={14}
               className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer hover:text-blue-400 transition-colors duration-300"
               onClick={handleSearch}
             />
             {searchKeyword && (
               <button
                 type="button"
                 onClick={handleClearSearch}
                 className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-400 transition-colors duration-300"
               >
                 ×
               </button>
             )}
           </form>
           <div className="flex gap-2">
             <div className="relative">
               <button
                 onClick={handleOpenFilterModal}
                 className="px-5 py-3 bg-bg-secondary border border-border-default text-text-muted rounded-xl text-xs font-bold flex items-center gap-2 hover:text-text-secondary transition-all duration-300"
               >
                 <Filter size={14} /> 过滤器
                 {isFiltering && (
                   <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                     1
                   </span>
                 )}
               </button>
             </div>
             {isFiltering && (
               <button
                 onClick={handleClearFilter}
                 className="px-5 py-3 bg-bg-secondary border border-border-default text-text-muted rounded-xl text-xs font-bold hover:text-red-400 transition-all duration-300"
               >
                 清除筛选
               </button>
             )}
           </div>
           <button
             onClick={() => setIsBatchScheduleModalOpen(true)}
             className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 hover:scale-105 transition-all duration-300 uppercase tracking-widest flex items-center gap-2 cursor-pointer"
           >
             <Zap size={14} />
             批量智能调度
           </button>
           <button
             onClick={() => setIsCreateModalOpen(true)}
             className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 hover:scale-105 transition-all duration-300 uppercase tracking-widest"
           >
             创建新订单
           </button>
        </div>
      </div>

      <OrderMetrics
        onDetailClick={() => handleShowDetail('all')}
        onDelayClick={() => handleShowDetail('delayed')}
        onTotalClick={handleClearFilter}
        onTransitClick={() => handleApplyFilter('运输中', null)}
        activeStatus={isFiltering ? filterStatus : null}
      />

      <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
        <div className="col-span-12 xl:col-span-8">
          <OrderMainTable 
            key={orderRefreshKey} 
            searchKeyword={searchKeyword}
            isSearching={isSearching}
            filterStatus={filterStatus}
            filterDateRange={filterDateRange}
            isFiltering={isFiltering}
          />
        </div>
        <div className="col-span-12 xl:col-span-4 space-y-4 md:space-y-6 lg:space-y-8">
          <LiveTracking />
          <InventoryAlerts />
        </div>
      </div>

      <CreateOrderModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onOrderCreated={handleOrderCreated}
      />

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyFilter}
      />

      {/* 批量智能调度确认弹窗 */}
      {isBatchScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300 p-4">
          <div className="bg-bg-modal w-full max-w-md rounded-[32px] border border-border-default shadow-[0_32px_128px_-16px_rgba(0,0,0,1)] overflow-hidden transform animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-8 py-6 border-b border-border-default flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
                  <Zap size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-text-primary tracking-tight">批量智能调度确认</h2>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">MARL Global Scheduling</p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchScheduleModalOpen(false)}
                className="w-9 h-9 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center text-text-muted hover:text-text-primary transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-8 py-6">
              <p className="text-sm text-text-secondary leading-relaxed">
                系统将启动 <span className="text-blue-400 font-black">MARL 全局调度</span>，自动处理
                <span className="text-blue-400 font-black"> 128 条</span> 待分配订单的智能运力匹配与路径优化。是否确认启动？
              </p>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-bg-primary/40 border-t border-border-default flex justify-end gap-3">
              <button
                onClick={() => setIsBatchScheduleModalOpen(false)}
                className="px-6 py-3 bg-bg-elevated border border-border-default text-text-muted text-xs font-black rounded-2xl hover:bg-bg-tertiary transition-all duration-300 uppercase tracking-[0.2em] cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleConfirmBatchSchedule}
                className="px-8 py-3 bg-blue-600 text-white text-xs font-black rounded-2xl shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all duration-300 active:scale-95 uppercase tracking-[0.2em] cursor-pointer"
              >
                确认启动
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagementView;
