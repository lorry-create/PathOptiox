
import React, { useState } from 'react';
import { SlidersHorizontal, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui';

interface ConfigState {
  learningRate: string;
  iterations: string;
  epsilon: string;
  gamma: string;
  batchSize: string;
  optimizer: boolean;
  dqn: boolean;
  // 奖励权重系数
  rewardCost: string;
  rewardTime: string;
  rewardCarbon: string;
  rewardRisk: string;
  // MARL 多智能体参数
  agentCount: string;
  coopAlgo: string;
  globalReward: number;
  agentPickup: boolean;
  agentTrunk: boolean;
  agentCompliance: boolean;
  agentDelivery: boolean;
  // 预测与状态空间
  featFreight: boolean;
  featCongestion: boolean;
  featTime: boolean;
  featDemand: boolean;
  fusionMethod: string;
  srcHistory: boolean;
  srcPublic: boolean;
  srcWeather: boolean;
  forecastDays: string;
}

type TabKey = 'ppo' | 'marl' | 'predict';

const ParamConfig: React.FC = () => {
  const { showToast } = useToast();

  // 初始默认值
  const initialValues: ConfigState = {
    learningRate: "0.0005",
    iterations: "1500",
    epsilon: "0.1",
    gamma: "0.9",
    batchSize: "512",
    optimizer: true,
    dqn: true,
    rewardCost: "0.4",
    rewardTime: "0.25",
    rewardCarbon: "0.2",
    rewardRisk: "0.15",
    agentCount: "4",
    coopAlgo: "MADDPG",
    globalReward: 0.6,
    agentPickup: true,
    agentTrunk: true,
    agentCompliance: true,
    agentDelivery: true,
    featFreight: true,
    featCongestion: true,
    featTime: true,
    featDemand: true,
    fusionMethod: "直接拼接特征",
    srcHistory: true,
    srcPublic: true,
    srcWeather: true,
    forecastDays: "7",
  };

  // 当前表单编辑中的状态
  const [formData, setFormData] = useState<ConfigState>(initialValues);
  // 上次保存的状态（用于重置功能）
  const [savedData, setSavedData] = useState<ConfigState>(initialValues);
  // 当前激活的 Tab
  const [activeTab, setActiveTab] = useState<TabKey>('ppo');

  const handleInputChange = (field: keyof ConfigState, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    setSavedData({ ...formData });
    showToast('算法参数已成功保存！');
  };

  const handleReset = () => {
    setFormData({ ...savedData });
    showToast('已恢复上次保存的参数');
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'ppo', label: 'PPO核心参数' },
    { key: 'marl', label: 'MARL多智能体参数' },
    { key: 'predict', label: '预测与状态空间' },
  ];

  return (
    <div className="bg-bg-secondary rounded-2xl p-4 md:p-5 border border-border-default flex flex-col gap-4 md:gap-5 flex-1">
      <div className="flex items-center gap-2 text-text-secondary">
        <SlidersHorizontal size={16} className="text-cyan-400" />
        <span className="text-xs font-bold tracking-wider uppercase">算法参数配置</span>
      </div>

      {/* Tab 切换 */}
      <div className="flex p-1 bg-bg-modal border border-border-default rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === tab.key
                ? 'bg-cyan-600 text-white shadow-lg hover:bg-cyan-500'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 - 切换不丢失输入值，仅淡入淡出 */}
      <div className="transition-opacity duration-200">
        {activeTab === 'ppo' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <InputGroup
              label="学习率"
              value={formData.learningRate}
              onChange={(val) => handleInputChange('learningRate', val)}
            />
            <InputGroup
              label="迭代次数"
              value={formData.iterations}
              onChange={(val) => handleInputChange('iterations', val)}
            />
            <div className="flex gap-3 flex-col sm:flex-row">
              <InputGroup
                label="探索率"
                value={formData.epsilon}
                onChange={(val) => handleInputChange('epsilon', val)}
              />
              <InputGroup
                label="折扣因子"
                value={formData.gamma}
                onChange={(val) => handleInputChange('gamma', val)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-text-muted font-bold uppercase pl-1">批大小</label>
              <div className="relative">
                <select
                  value={formData.batchSize}
                  onChange={(e) => handleInputChange('batchSize', e.target.value)}
                  className="w-full bg-bg-modal border border-border-default rounded-lg py-2.5 px-3 text-xs text-text-secondary focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                >
                  <option value="128">128</option>
                  <option value="256">256</option>
                  <option value="512">512</option>
                  <option value="1024">1024</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            {/* 奖励权重系数分组 */}
            <div className="space-y-2 pt-2 border-t border-border-default/50">
              <label className="text-[10px] text-text-muted font-bold uppercase pl-1">奖励权重系数</label>
              <div className="grid grid-cols-4 gap-2">
                <RewardWeightInput
                  label="成本"
                  value={formData.rewardCost}
                  onChange={(val) => handleInputChange('rewardCost', val)}
                />
                <RewardWeightInput
                  label="时效"
                  value={formData.rewardTime}
                  onChange={(val) => handleInputChange('rewardTime', val)}
                />
                <RewardWeightInput
                  label="碳排放"
                  value={formData.rewardCarbon}
                  onChange={(val) => handleInputChange('rewardCarbon', val)}
                />
                <RewardWeightInput
                  label="运输风险"
                  value={formData.rewardRisk}
                  onChange={(val) => handleInputChange('rewardRisk', val)}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <ToggleItem
                label="优化器"
                active={formData.optimizer}
                onClick={() => handleInputChange('optimizer', !formData.optimizer)}
              />
              <ToggleItem
                label="基准算法对比"
                active={formData.dqn}
                onClick={() => handleInputChange('dqn', !formData.dqn)}
              />
            </div>
          </div>
        )}

        {activeTab === 'marl' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <InputGroup
              label="智能体数量"
              value={formData.agentCount}
              onChange={(val) => handleInputChange('agentCount', val)}
              type="number"
            />

            <SelectGroup
              label="协同算法"
              value={formData.coopAlgo}
              options={['MADDPG', 'COMA', 'QMIX']}
              onChange={(val) => handleInputChange('coopAlgo', val)}
            />

            <SliderGroup
              label="全局奖励权重"
              value={formData.globalReward}
              onChange={(val) => handleInputChange('globalReward', val)}
            />

            <div className="space-y-3 pt-2 border-t border-border-default/50">
              <label className="text-[10px] text-text-muted font-bold uppercase pl-1">智能体开关列表</label>
              <ToggleItem
                label="揽收智能体"
                active={formData.agentPickup}
                onClick={() => handleInputChange('agentPickup', !formData.agentPickup)}
              />
              <ToggleItem
                label="干线智能体"
                active={formData.agentTrunk}
                onClick={() => handleInputChange('agentTrunk', !formData.agentTrunk)}
              />
              <ToggleItem
                label="合规智能体"
                active={formData.agentCompliance}
                onClick={() => handleInputChange('agentCompliance', !formData.agentCompliance)}
              />
              <ToggleItem
                label="派送智能体"
                active={formData.agentDelivery}
                onClick={() => handleInputChange('agentDelivery', !formData.agentDelivery)}
              />
            </div>
          </div>
        )}

        {activeTab === 'predict' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-2">
              <label className="text-[10px] text-text-muted font-bold uppercase pl-1">预测特征</label>
              <div className="grid grid-cols-4 gap-2">
                <CheckboxItem label="运价预测" checked={formData.featFreight} onChange={(v) => handleInputChange('featFreight', v)} />
                <CheckboxItem label="港口拥堵预测" checked={formData.featCongestion} onChange={(v) => handleInputChange('featCongestion', v)} />
                <CheckboxItem label="时效预测" checked={formData.featTime} onChange={(v) => handleInputChange('featTime', v)} />
                <CheckboxItem label="需求预测" checked={formData.featDemand} onChange={(v) => handleInputChange('featDemand', v)} />
              </div>
            </div>

            <SelectGroup
              label="状态空间融合方式"
              value={formData.fusionMethod}
              options={['直接拼接特征', '注意力加权融合']}
              onChange={(val) => handleInputChange('fusionMethod', val)}
            />

            <div className="space-y-2">
              <label className="text-[10px] text-text-muted font-bold uppercase pl-1">预测数据源</label>
              <div className="grid grid-cols-3 gap-2">
                <CheckboxItem label="历史运营数据" checked={formData.srcHistory} onChange={(v) => handleInputChange('srcHistory', v)} />
                <CheckboxItem label="港口公开数据" checked={formData.srcPublic} onChange={(v) => handleInputChange('srcPublic', v)} />
                <CheckboxItem label="气象指数数据" checked={formData.srcWeather} onChange={(v) => handleInputChange('srcWeather', v)} />
              </div>
            </div>

            <InputGroup
              label="预测周期 (天)"
              value={formData.forecastDays}
              onChange={(val) => handleInputChange('forecastDays', val)}
              type="number"
            />
          </div>
        )}
      </div>

      {/* 共用底部按钮 */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/10 active:scale-95 cursor-pointer"
        >
          <Save size={14} /> 保存
        </button>
        <button
          onClick={handleReset}
          title="恢复上次保存的值"
          className="px-4 py-3 bg-bg-tertiary hover:bg-bg-tertiary text-text-muted rounded-lg transition-all duration-300 border border-border-input active:scale-95 cursor-pointer"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, value, onChange, type = 'text' }) => (
  <div className="space-y-2 flex-1">
    <label className="text-[10px] text-text-muted font-bold uppercase pl-1">{label}</label>
    <div className="relative group">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-modal border border-border-default rounded-lg py-2.5 px-3 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500/50 transition-all duration-300 shadow-inner"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-text-primary pointer-events-none group-focus-within:text-cyan-900 transition-colors duration-300">VAL</div>
    </div>
  </div>
);

interface RewardWeightInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

const RewardWeightInput: React.FC<RewardWeightInputProps> = ({ label, value, onChange }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] text-text-muted font-bold uppercase pl-0.5 block">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-bg-modal border border-border-default rounded-lg py-2 px-2 text-[11px] text-cyan-400 font-mono focus:outline-none focus:border-cyan-500/50 transition-all duration-300 shadow-inner text-center"
    />
  </div>
);

interface SelectGroupProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

const SelectGroup: React.FC<SelectGroupProps> = ({ label, value, options, onChange }) => (
  <div className="space-y-2">
    <label className="text-[10px] text-text-muted font-bold uppercase pl-1">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-modal border border-border-default rounded-lg py-2.5 px-3 text-xs text-text-secondary focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </div>
  </div>
);

interface SliderGroupProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
}

const SliderGroup: React.FC<SliderGroupProps> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center pl-1">
      <label className="text-[10px] text-text-muted font-bold uppercase">{label}</label>
      <span className="text-[11px] text-cyan-400 font-mono font-bold tabular-nums">{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-bg-modal rounded-full appearance-none cursor-pointer accent-cyan-500 border border-border-default"
    />
  </div>
);

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

const CheckboxItem: React.FC<CheckboxItemProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-1.5 bg-bg-modal border border-border-default rounded-lg py-2 px-2 cursor-pointer hover:border-cyan-500/40 transition-all duration-200">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-3 h-3 accent-cyan-500 cursor-pointer shrink-0"
    />
    <span className="text-[10px] text-text-secondary font-bold leading-tight">{label}</span>
  </label>
);

interface ToggleItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const ToggleItem: React.FC<ToggleItemProps> = ({ label, active, onClick }) => (
  <div className="flex items-center justify-between group cursor-pointer" onClick={onClick}>
    <span className="text-[10px] text-text-muted font-bold uppercase transition-colors duration-300 group-hover:text-text-muted text-text-secondary">{label}</span>
    <div className={`w-10 h-5 rounded-full p-1 flex items-center transition-all duration-300 ${active ? 'bg-cyan-500' : 'bg-bg-tertiary'}`}>
      <div className={`w-3 h-3 bg-white rounded-full shadow-md transition-transform duration-300 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </div>
);

export default ParamConfig;
