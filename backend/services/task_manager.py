"""通用任务管理器

用内存 dict 维护所有长耗时任务状态，全局单例。
支持任务类型：training / batch_dispatch / global_optimize

进度推进策略（修复后）：
- get_task 只读，绝不修改 progress。查询行为本身不会推进进度。
- 真实进度推进由业务层启动的后台 Worker 协程通过 update_progress / finish_task 完成。
- 这样进度增长与查询频率解耦，按真实时间推进。

支持暂停/恢复，暂停后 Worker 应停止推进（由业务层自行判断）。
任务结构对齐 schemas/task.py 的 TaskInfo 模型。
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from schemas.enums import TaskStatus


def _now_iso() -> str:
    """当前 UTC 时间 ISO 字符串"""
    return datetime.now(timezone.utc).isoformat()


class TaskManager:
    """任务管理器单例"""

    def __init__(self) -> None:
        self._tasks: Dict[str, Dict[str, Any]] = {}

    def create_task(self, task_type: str, result: Optional[Any] = None) -> str:
        """创建任务，返回 task_id"""
        task_id = uuid.uuid4().hex[:12]
        self._tasks[task_id] = {
            "task_id": task_id,
            "status": TaskStatus.running,
            "progress": 0.0,
            "result": result,
            "error_msg": None,
            "task_type": task_type,
            "created_at": _now_iso(),
            "finished_at": None,
        }
        return task_id

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """查询任务状态（只读）。

        修复说明：原先此方法会在每次查询时把 progress +8% 作为假进度模拟，
        导致前端轮询频率越高进度推进越快——进度增长与查询频率耦合，无法
        体现真实 Worker 状态。现已剥离该副作用，get_task 仅返回当前快照，
        进度推进完全交由业务层的后台 Worker 协程通过 update_progress 完成。
        """
        task = self._tasks.get(task_id)
        if task is None:
            return None
        return task

    def update_progress(self, task_id: str, progress: float) -> bool:
        """手动更新进度"""
        task = self._tasks.get(task_id)
        if task is None:
            return False
        task["progress"] = max(0.0, min(1.0, progress))
        if task["progress"] >= 1.0:
            self.finish_task(task_id)
        return True

    def pause_task(self, task_id: str) -> bool:
        """暂停任务"""
        task = self._tasks.get(task_id)
        if task is None:
            return False
        task["status"] = TaskStatus.paused
        return True

    def resume_task(self, task_id: str) -> bool:
        """恢复任务"""
        task = self._tasks.get(task_id)
        if task is None:
            return False
        task["status"] = TaskStatus.running
        return True

    def finish_task(self, task_id: str, result: Optional[Any] = None) -> bool:
        """完成任务"""
        task = self._tasks.get(task_id)
        if task is None:
            return False
        task["status"] = TaskStatus.success
        task["progress"] = 1.0
        task["finished_at"] = _now_iso()
        if result is not None:
            task["result"] = result
        return True

    def fail_task(self, task_id: str, error_msg: str) -> bool:
        """标记任务失败"""
        task = self._tasks.get(task_id)
        if task is None:
            return False
        task["status"] = TaskStatus.failed
        task["error_msg"] = error_msg
        task["finished_at"] = _now_iso()
        return True


# 全局单例
task_manager = TaskManager()
