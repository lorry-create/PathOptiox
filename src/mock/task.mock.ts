/**
 * 通用任务状态 Mock 数据
 * @description 模拟长耗时任务的状态变化（pending → running → success/failed）
 */
import type { MockHandler } from './index';

interface MockTaskState {
  task_id: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;
  task_type?: string;
  created_at?: string;
  finished_at?: string;
  error_msg?: string;
}

// 内存中维护的任务状态映射（不持久化，刷新即重置）
const taskStore: Map<string, MockTaskState> = new Map();

/**
 * 获取或创建任务状态
 * - 已存在：返回当前状态，并对 running 任务模拟进度推进
 * - 不存在：创建为 pending 状态
 */
const getOrCreateTask = (taskId: string): MockTaskState => {
  let task = taskStore.get(taskId);
  if (!task) {
    task = {
      task_id: taskId,
      status: 'pending',
      progress: 0,
      task_type: 'unknown',
      created_at: new Date().toISOString(),
    };
    taskStore.set(taskId, task);
    return task;
  }

  // running 任务模拟进度推进（每次查询 +10%）
  if (task.status === 'running' && task.progress < 1) {
    task.progress = Math.min(1, task.progress + 0.1);
    if (task.progress >= 1) {
      task.status = 'success';
      task.finished_at = new Date().toISOString();
    }
  }
  return task;
};

export const taskMockHandlers: MockHandler[] = [
  {
    method: 'GET',
    url: '/tasks/{task_id}',
    handler: (config) => {
      const taskId = (config.url as string).split('/').pop() || '';
      const task = getOrCreateTask(taskId);

      // 首次查询：pending → running
      if (task.status === 'pending') {
        task.status = 'running';
        task.progress = 0.05;
      }

      // 错误场景 Mock
      const mockError = (config.params as { mock_error?: string } | undefined)?.mock_error;
      if (mockError === '500') {
        throw { code: 500, message: '模拟服务端异常：任务查询失败' };
      }
      if (mockError === 'failed') {
        task.status = 'failed';
        task.error_msg = '模拟任务执行失败';
      }

      const result: Record<string, unknown> = {
        task_id: task.task_id,
        status: task.status,
        progress: task.progress,
        task_type: task.task_type,
        created_at: task.created_at,
      };

      if (task.status === 'success') {
        result.result = { message: '任务执行完成', task_id: task.task_id };
        result.finished_at = task.finished_at;
      }
      if (task.status === 'failed') {
        result.error_msg = task.error_msg || '任务执行失败';
        result.finished_at = new Date().toISOString();
      }

      return result;
    },
  },
];
