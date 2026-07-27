import { create } from 'zustand';
import { systemApi } from '@/services/modules/systemApi';

/**
 * 全局共享状态
 * @description 仅管理跨模块共享的状态，不替代所有本地 state
 * S2-T06: greenModeEnabled / agentAutoMode / ragEnabled / currentModelId
 *          在初始化时从后端 system_config 表同步
 */

/** 字符串转布尔：'true' -> true，其他 -> false */
function parseBool(val: string | undefined | null): boolean {
  return (val ?? '').toLowerCase() === 'true';
}

export interface GlobalState {
  // 当前生效模型 ID
  currentModelId: string;
  // 极绿调度开关状态
  greenModeEnabled: boolean;
  // 待处置高风险数量
  pendingRiskCount: number;
  // Agent 全托管开关
  agentAutoMode: boolean;
  // RAG 感知开关
  ragEnabled: boolean;

  // Actions
  setCurrentModel: (modelId: string) => void;
  setGreenMode: (enabled: boolean) => void;
  setPendingRiskCount: (count: number) => void;
  setAgentAutoMode: (enabled: boolean) => void;
  setRagEnabled: (enabled: boolean) => void;
  /** 从后端 system_config 表同步全局状态 */
  loadFromServer: () => Promise<void>;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  currentModelId: 'net_global_v3',
  greenModeEnabled: false,
  pendingRiskCount: 3,
  agentAutoMode: true,
  ragEnabled: true,

  setCurrentModel: (modelId) => set({ currentModelId: modelId }),
  setGreenMode: (enabled) => set({ greenModeEnabled: enabled }),
  setPendingRiskCount: (count) => set({ pendingRiskCount: count }),
  setAgentAutoMode: (enabled) => set({ agentAutoMode: enabled }),
  setRagEnabled: (enabled) => set({ ragEnabled: enabled }),

  loadFromServer: async () => {
    try {
      const res = await systemApi.getConfig();
      const configs = res.configs || {};
      set({
        greenModeEnabled: parseBool(configs.green_mode_enabled),
        agentAutoMode: parseBool(configs.agent_auto_mode),
        ragEnabled: parseBool(configs.rag_enabled),
        currentModelId: configs.current_model_id || 'net_global_v3',
      });
    } catch (err) {
      console.error('加载系统配置失败:', err);
    }
  },
}));
