/**
 * 训练优化模块 Mock 数据
 */
import type { MockHandler } from './index';

export interface TrainingStatus {
  task_id: string;
  progress: number;
  current_episode: number;
  total_episodes: number;
  reward: number;
  loss: number;
  status: 'running' | 'paused' | 'finished';
  logs: string[];
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

// 持久化存储 key
const STORAGE_KEY_TRAINING = 'mock_training_state';

interface TrainingStateStore {
  task_id: string;
  status: 'running' | 'paused' | 'finished';
  progress: number;
  current_episode: number;
  total_episodes: number;
}

const DEFAULT_STATE: TrainingStateStore = {
  task_id: '',
  status: 'finished',
  progress: 0.65,
  current_episode: 650,
  total_episodes: 1000,
};

const loadState = (): TrainingStateStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRAINING);
    if (raw) {
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    }
  } catch {
    // localStorage 不可用时静默降级
  }
  return { ...DEFAULT_STATE };
};

const saveState = (state: TrainingStateStore): void => {
  try {
    localStorage.setItem(STORAGE_KEY_TRAINING, JSON.stringify(state));
  } catch {
    // 静默降级
  }
};

const buildTrainingStatus = (): TrainingStatus => {
  const state = loadState();
  return {
    task_id: state.task_id || 'task_' + Date.now(),
    progress: state.progress,
    current_episode: state.current_episode,
    total_episodes: 1000,
    reward: 12.34,
    loss: 0.0234,
    status: state.status,
    logs: [
      `[2026-07-05 10:23:45] Episode ${state.current_episode}/1000 | reward=12.34 | loss=0.0234`,
      '[2026-07-05 10:23:42] Agent sea_agent policy updated',
      `[2026-07-05 10:23:40] Episode ${state.current_episode - 1}/1000 | reward=11.98 | loss=0.0241`,
      '[2026-07-05 10:23:35] Buffer sampling, batch_size=64',
      `[2026-07-05 10:23:30] Episode ${state.current_episode - 2}/1000 | reward=12.56 | loss=0.0229`,
    ],
  };
};

const buildTrainingHistory = (): TrainingHistoryItem[] => [
  { model_id: 'model_20260704_v3', version_name: 'v3.2.1-ppo', created_at: '2026-07-04 18:30', reward: 13.45, status: 'deployed' },
  { model_id: 'model_20260703_v2', version_name: 'v3.2.0-ppo', created_at: '2026-07-03 15:20', reward: 12.88, status: 'saved' },
  { model_id: 'model_20260702_v1', version_name: 'v3.1.9-ppo', created_at: '2026-07-02 11:10', reward: 11.92, status: 'archived' },
  { model_id: 'model_20260701_v0', version_name: 'v3.1.8-ppo', created_at: '2026-07-01 09:00', reward: 10.76, status: 'archived' },
];

const buildNetworkModels = (): NetworkModel[] => [
  { id: 'net_global_v3', name: '全球供应链网络 v3', description: '覆盖 32 节点 / 128 边的全球物流网络', created_at: '2026-06-20' },
  { id: 'net_asia_v2', name: '亚太区域网络 v2', description: '聚焦亚太 12 节点的区域网络', created_at: '2026-06-15' },
  { id: 'net_eu_v1', name: '欧洲区域网络 v1', description: '欧洲 8 节点的基础网络', created_at: '2026-06-10' },
];

export const trainingMockHandlers: MockHandler[] = [
  {
    method: 'POST',
    url: '/training/start',
    handler: (config) => {
      // 接收完整参数（PPO/MARL/预测），Mock 透传不影响返回
      const _params = config.data;
      const task_id = 'task_' + Date.now();
      const newState: TrainingStateStore = {
        task_id,
        status: 'running',
        progress: 0,
        current_episode: 0,
        total_episodes: 1000,
      };
      saveState(newState);
      return { task_id };
    },
  },
  {
    method: 'GET',
    url: '/training/{task_id}/status',
    handler: (config) => {
      // 错误场景 Mock
      const mockError = (config.params as { mock_error?: string } | undefined)?.mock_error;
      if (mockError === '500') {
        throw { code: 500, message: '模拟服务端异常：训练任务不存在' };
      }

      const state = loadState();
      // 模拟运行中任务的进度增长
      if (state.status === 'running' && state.progress < 1) {
        const newEpisode = Math.min(state.total_episodes ?? 1000, state.current_episode + 5);
        const newProgress = newEpisode / 1000;
        const updated = {
          ...state,
          current_episode: newEpisode,
          progress: newProgress,
          status: newProgress >= 1 ? 'finished' as const : 'running' as const,
        };
        saveState(updated);
      }
      return buildTrainingStatus();
    },
  },
  {
    method: 'POST',
    url: '/training/{task_id}/pause',
    handler: (config) => {
      const taskId = (config.url as string).split('/')[2];
      const state = loadState();
      const updated = { ...state, task_id: taskId, status: 'paused' as const };
      saveState(updated);
      return { task_id: taskId, status: 'paused' as const };
    },
  },
  {
    method: 'POST',
    url: '/training/{task_id}/resume',
    handler: (config) => {
      const taskId = (config.url as string).split('/')[2];
      const state = loadState();
      const updated = { ...state, task_id: taskId, status: 'running' as const };
      saveState(updated);
      return { task_id: taskId, status: 'running' as const };
    },
  },
  {
    method: 'POST',
    url: '/training/{task_id}/save',
    handler: () => ({ model_id: 'model_' + Date.now() }),
  },
  {
    method: 'POST',
    url: '/training/{task_id}/deploy',
    handler: () => ({ success: true }),
  },
  {
    method: 'GET',
    url: '/training/history',
    handler: () => buildTrainingHistory(),
  },
  {
    method: 'GET',
    url: '/models',
    handler: () => buildNetworkModels(),
  },
];
