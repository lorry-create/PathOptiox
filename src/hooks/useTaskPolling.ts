import { useEffect, useRef, useState, useCallback } from 'react';
import { taskApi } from '@/services/modules/taskApi';
import type { TaskStatus } from '@/services/modules/taskApi';

/**
 * 通用任务轮询 Hook
 * @description 用于长耗时任务（训练、批量调度、全局重调度）的状态轮询。
 * 自动按设定间隔查询任务状态，直到任务成功或失败，自动清理定时器。
 *
 * @param taskId 任务 ID，为空时不启动轮询
 * @param interval 轮询间隔（毫秒），默认 2000ms
 * @param onSuccess 任务成功回调
 * @param onError 任务失败回调
 *
 * @example
 * ```tsx
 * const { taskStatus, isPolling, start, stop } = useTaskPolling({
 *   taskId: 'task_xxx',
 *   interval: 2000,
 *   onSuccess: (result) => console.log('任务完成', result),
 *   onError: (errorMsg) => console.error('任务失败', errorMsg),
 * });
 * ```
 */
interface UseTaskPollingOptions<T> {
  taskId?: string | null;
  interval?: number;
  onSuccess?: (result: T | undefined) => void;
  onError?: (errorMsg: string) => void;
}

interface UseTaskPollingResult<T> {
  taskStatus: TaskStatus<T> | null;
  isPolling: boolean;
  error: string | null;
  /** 手动启动轮询 */
  start: (id: string) => void;
  /** 手动停止轮询 */
  stop: () => void;
}

export function useTaskPolling<T = unknown>(
  options: UseTaskPollingOptions<T>
): UseTaskPollingResult<T> {
  const { taskId, interval = 2000, onSuccess, onError } = options;

  const [taskStatus, setTaskStatus] = useState<TaskStatus<T> | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 使用 ref 保存最新的回调，避免闭包陈旧
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    setIsPolling(false);
    activeTaskIdRef.current = null;
  }, [clearTimer]);

  const pollOnce = useCallback(async (id: string) => {
    try {
      const status = await taskApi.getTaskStatus<T>(id);
      // 任务 ID 已变更，丢弃过期结果
      if (activeTaskIdRef.current !== id) return;

      setTaskStatus(status);
      setError(null);

      if (status.status === 'success') {
        setIsPolling(false);
        activeTaskIdRef.current = null;
        onSuccessRef.current?.(status.result);
        return;
      }

      if (status.status === 'failed') {
        setIsPolling(false);
        activeTaskIdRef.current = null;
        const errMsg = status.error_msg || '任务执行失败';
        setError(errMsg);
        onErrorRef.current?.(errMsg);
        return;
      }

      // pending / running：继续轮询
      timerRef.current = setTimeout(() => pollOnce(id), interval);
    } catch (err) {
      if (activeTaskIdRef.current !== id) return;
      const errMsg = err instanceof Error ? err.message : '任务状态查询失败';
      setError(errMsg);
      // 网络错误时继续重试，避免短暂网络波动导致轮询中断
      timerRef.current = setTimeout(() => pollOnce(id), interval);
    }
  }, [interval]);

  const start = useCallback((id: string) => {
    clearTimer();
    activeTaskIdRef.current = id;
    setIsPolling(true);
    setError(null);
    pollOnce(id);
  }, [clearTimer, pollOnce]);

  // taskId 变化时自动启动/停止
  useEffect(() => {
    if (taskId) {
      start(taskId);
    } else {
      stop();
    }
    return () => {
      clearTimer();
      activeTaskIdRef.current = null;
    };
  }, [taskId, start, stop, clearTimer]);

  return { taskStatus, isPolling, error, start, stop };
}
