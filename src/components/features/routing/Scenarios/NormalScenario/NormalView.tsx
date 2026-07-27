
import React from 'react';
import ComparisonTable from '../../ComparisonTable';
import SensitivityChart from '../../SensitivityChart';
import RobustDetail from '../../RobustDetail';
import type { SchemeItem, OptimizeExplanation } from '@/services';
import type { ComputeState, SchemeId } from '../../RouteOptimizationView';

interface NormalViewProps {
  /** 4 套方案数据（cost / robust / speed / green） */
  schemes?: SchemeItem[];
  /** LLM 决策解释（4 字段） */
  explanation?: OptimizeExplanation | null;
  startLabel?: string;
  endLabel?: string;
  compute?: ComputeState;
  weights?: { cost: number; time: number; carbon: number; risk: number };
  networkModel?: string;
  onReOptimize?: () => void;
  selectedScheme?: SchemeId;
  onSchemeChange?: (id: SchemeId) => void;
}

const NormalView: React.FC<NormalViewProps> = ({
  schemes = [],
  explanation = null,
  startLabel,
  endLabel,
  compute,
  weights,
  networkModel,
  onReOptimize,
  selectedScheme = 'robust',
  onSchemeChange,
}) => {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
      {/* Middle Grid: Comparison Table + Sensitivity Chart */}
      <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
        <div className="col-span-12 xl:col-span-8">
          <ComparisonTable
            schemes={schemes}
            startLabel={startLabel}
            endLabel={endLabel}
            compute={compute}
            selectedScheme={selectedScheme}
            onSchemeChange={onSchemeChange}
          />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <SensitivityChart compute={compute} selectedScheme={selectedScheme} onSchemeChange={onSchemeChange} />
        </div>
      </div>

      {/* Bottom Section: Robust Detail */}
      <RobustDetail
        schemes={schemes}
        explanation={explanation}
        startLabel={startLabel}
        endLabel={endLabel}
        compute={compute}
        weights={weights}
        networkModel={networkModel}
        onReOptimize={onReOptimize}
        selectedScheme={selectedScheme}
        onSchemeChange={onSchemeChange}
      />
    </div>
  );
};

export default NormalView;
