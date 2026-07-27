import { httpClient } from '../api/httpClient';

// ================================================================
// 类型定义
// ================================================================

/**
 * 通用任务状态
 * @description 用于训练任务、批量调度、全局重调度等长耗时任务的统一状态查询
 */
export interface TaskStatus<T = unknown> {
  task_id: string;
  /**
   * 任务状态：
   * - pending: 已创建，等待执行
   * - running: 执行中
   * - success: 成功完成
   * - failed: 执行失败
   */
  status: 'pending' | 'running' | 'success' | 'failed';
  /** 进度 0-1 */
  progress: number;
  /** 任务结果（status=success 时有值） */
  result?: T;
  /** 失败原因（status=failed 时有值） */
  error_msg?: string;
  /** 任务类型标识（如 training / batch_dispatch / global_optimize） */
  task_type?: string;
  /** 创建时间戳 */
  created_at?: string;
  /** 完成时间戳 */
  finished_at?: string;
}

// ================================================================
// API
// ================================================================

export const taskApi = {
  /**
   * 查询任务状态
   * @param taskId 任务 ID
   * @returns 统一任务状态结构
   */
  getTaskStatus: <T = unknown>(taskId: string) =>
    httpClient.get<TaskStatus<T>>(`/tasks/${taskId}`, {
      showLoading: false,
      retry: 2,
    }),
};
