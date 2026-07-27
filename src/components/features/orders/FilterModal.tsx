import React, { useState } from 'react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (status: string | null, dateRange: string | null) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply }) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(selectedStatus, selectedDateRange);
  };

  const handleReset = () => {
    setSelectedStatus(null);
    setSelectedDateRange(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-bg-secondary border border-border-default rounded-none md:rounded-2xl p-6 w-full h-full md:w-auto md:h-auto md:max-w-md animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-text-primary">订单过滤器</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors duration-300"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">订单状态</label>
            <div className="space-y-2">
              {[
                { value: null, label: '全部状态' },
                { value: '运输中', label: '运输中' },
                { value: '已处理', label: '已处理' },
                { value: '异常延误', label: '异常延误' },
                { value: '已妥投', label: '已妥投' },
                { value: '待分配', label: '待分配' }
              ].map((option) => (
                <div key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    id={`status-${option.value}`}
                    name="status"
                    value={option.value}
                    checked={selectedStatus === option.value}
                    onChange={() => setSelectedStatus(option.value)}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`status-${option.value}`}
                    className="text-sm text-text-secondary cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">日期范围</label>
            <div className="space-y-2">
              {[
                { value: null, label: '全部日期' },
                { value: 'today', label: '今天' },
                { value: 'week', label: '本周' },
                { value: 'month', label: '本月' },
                { value: 'quarter', label: '本季度' }
              ].map((option) => (
                <div key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    id={`date-${option.value}`}
                    name="dateRange"
                    value={option.value}
                    checked={selectedDateRange === option.value}
                    onChange={() => setSelectedDateRange(option.value)}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`date-${option.value}`}
                    className="text-sm text-text-secondary cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-border-input rounded-xl text-sm text-text-muted hover:text-text-primary transition-colors duration-300"
          >
            重置
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border-input rounded-xl text-sm text-text-muted hover:text-text-primary transition-colors duration-300"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 rounded-xl text-sm text-white hover:bg-blue-700 transition-colors duration-300"
          >
            应用
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
