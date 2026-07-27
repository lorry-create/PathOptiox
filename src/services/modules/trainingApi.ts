import { httpClient } from '../api/httpClient';

// ================================================================
// 类型定义
// ================================================================

/**
 * PPO 核心参数（完整版，对齐前端 ParamConfig 组件全部配置项）
 */
export interface PpoParams {
  learning_rate: number;
  clip_epsilon: number;
  entropy_coef: number;       // 已有
  gamma: number;
  gae_lambda: number;
  // 新增字段
  batch_size: number;         // 批大小
  epochs: number;             // 每轮更新次数
  value_loss_coef: number;    // 价值损失系数
  use_dqn: boolean;           // 是否启用 DQN 替代 PPO
  // 4 个奖励权重
  reward_cost: number;
  reward_time: number;
  reward_carbon: number;
  reward_risk: number;
}

/**
 * MARL 多智能体参数（完整版）
 */
export interface MarlParams {
  num_agents: number;
  communication_rounds: number;
  shared_memory: boolean;
  // 新增字段
  coop_algorithm: 'maddpg' | 'coma' | 'qmix';   // 合作算法
  global_reward_weight: number;                  // 全局奖励权重
  // 4 个智能体开关
  agent_pickup: boolean;
  agent_trunk: boolean;
  agent_compliance: boolean;
  agent_delivery: boolean;
}

/**
 * 预测与状态空间参数（完整版）
 */
export interface PredictParams {
  sequence_length: number;
  hidden_size: number;
  num_layers: number;
  // 新增字段
  forecast_days: number;       // 预测天数
  // 4 个特征开关
  feature_weather: boolean;
  feature_port_congestion: boolean;
  feature_fuel_price: boolean;
  feature_policy: boolean;
  // 3 个数据源开关
  source_historical: boolean;
  source_realtime: boolean;
  source_external: boolean;
  // 融合方法
  fusion_method: 'concat' | 'attention' | 'gating';
}

export interface TrainingStartRequest {
  network_model: string;
  ppo_params: PpoParams;
  marl_params: MarlParams;
  predict_params: PredictParams;
}

export interface TrainingStartResponse {
  task_id: string;
}

export interface TrainingStatusResponse {
  task_id: string;
  progress: number;
  current_episode: number;
  total_episodes: number;
  reward: number;
  loss: number;
  status: 'running' | 'paused' | 'finished';
  logs: string[];
}

export interface TrainingSaveRequest {
  version_name: string;
}

export interface TrainingSaveResponse {
  model_id: string;
}

export interface TrainingDeployResponse {
  success: boolean;
}

export interface TrainingHistoryItem {
  model_id: string;
  version_name: string;
  created_at: string;
  reward: number;
  status: 'saved' | 'deployed' | 'archived';
}

export interface NetworkModel {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

/**
 * 暂停/恢复训练响应
 */
export interface TrainingControlResponse {
  task_id: string;
  status: 'running' | 'paused';
}

// ================================================================
// API
// ================================================================

export const trainingApi = {
  startTraining: (params: TrainingStartRequest) =>
    httpClient.post<TrainingStartResponse>('/training/start', params, {
      showLoading: true,
      retry: 0,
    }),

  getTrainingStatus: (taskId: string) =>
    httpClient.get<TrainingStatusResponse>(`/training/${taskId}/status`, {
      showLoading: false,
      retry: 1,
    }),

  /**
   * 暂停训练（v2.1.0 新增）
   * 调用后训练进度停止增长，可后续通过 resume 恢复
   */
  pauseTraining: (taskId: string) =>
    httpClient.post<TrainingControlResponse>(`/training/${taskId}/pause`, {}, {
      showLoading: true,
      retry: 0,
    }),

  /**
   * 恢复训练（v2.1.0 新增）
   * 从暂停时的进度继续累加
   */
  resumeTraining: (taskId: string) =>
    httpClient.post<TrainingControlResponse>(`/training/${taskId}/resume`, {}, {
      showLoading: true,
      retry: 0,
    }),

  saveModel: (taskId: string, params: TrainingSaveRequest) =>
    httpClient.post<TrainingSaveResponse>(`/training/${taskId}/save`, params, {
      showLoading: true,
    }),

  deployModel: (taskId: string) =>
    httpClient.post<TrainingDeployResponse>(`/training/${taskId}/deploy`, {}, {
      showLoading: true,
    }),

  getHistory: () =>
    httpClient.get<TrainingHistoryItem[]>('/training/history', {
      showLoading: false,
    }),

  getNetworkModels: () =>
    httpClient.get<NetworkModel[]>('/models', {
      showLoading: false,
    }),
};
