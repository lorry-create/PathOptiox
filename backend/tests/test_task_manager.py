"""TaskManager 单元测试

纯单元测试，不依赖数据库或 FastAPI。
覆盖 create / update_progress / pause / resume / finish / fail 全生命周期。
"""
import pytest

from services.task_manager import task_manager, TaskManager
from schemas.enums import TaskStatus


@pytest.mark.unit
class TestTaskManager:
    """TaskManager 单元测试"""

    def test_create_task_returns_id(self):
        """create_task 应返回 12 位 task_id"""
        mgr = TaskManager()
        task_id = mgr.create_task("test_type")
        assert len(task_id) == 12
        task = mgr.get_task(task_id)
        assert task is not None
        assert task["task_type"] == "test_type"
        assert task["status"] == TaskStatus.running
        assert task["progress"] == 0.0

    def test_get_task_nonexistent_returns_none(self):
        """查询不存在的任务应返回 None"""
        mgr = TaskManager()
        assert mgr.get_task("nonexistent") is None

    def test_update_progress_increases(self):
        """update_progress 应更新进度值"""
        mgr = TaskManager()
        task_id = mgr.create_task("test")
        mgr.update_progress(task_id, 0.5)
        assert mgr.get_task(task_id)["progress"] == 0.5

    def test_update_progress_clamped_to_1(self):
        """进度超过 1.0 应被截断为 1.0 并自动完成"""
        mgr = TaskManager()
        task_id = mgr.create_task("test")
        mgr.update_progress(task_id, 1.5)
        task = mgr.get_task(task_id)
        assert task["progress"] == 1.0
        assert task["status"] == TaskStatus.success

    def test_update_progress_clamped_to_0(self):
        """负进度应被截断为 0"""
        mgr = TaskManager()
        task_id = mgr.create_task("test")
        mgr.update_progress(task_id, -0.5)
        assert mgr.get_task(task_id)["progress"] == 0.0

    def test_pause_and_resume(self):
        """暂停 → 恢复 → 完成"""
        mgr = TaskManager()
        task_id = mgr.create_task("test")

        mgr.pause_task(task_id)
        assert mgr.get_task(task_id)["status"] == TaskStatus.paused

        mgr.resume_task(task_id)
        assert mgr.get_task(task_id)["status"] == TaskStatus.running

    def test_finish_task_attaches_result(self):
        """finish_task 应挂载结果并标记 success"""
        mgr = TaskManager()
        task_id = mgr.create_task("test")
        result = {"count": 42, "items": ["a", "b"]}
        mgr.finish_task(task_id, result)
        task = mgr.get_task(task_id)
        assert task["status"] == TaskStatus.success
        assert task["progress"] == 1.0
        assert task["result"] == result
        assert task["finished_at"] is not None

    def test_fail_task_attaches_error(self):
        """fail_task 应挂载错误信息并标记 failed"""
        mgr = TaskManager()
        task_id = mgr.create_task("test")
        mgr.fail_task(task_id, "执行超时")
        task = mgr.get_task(task_id)
        assert task["status"] == TaskStatus.failed
        assert task["error_msg"] == "执行超时"
        assert task["finished_at"] is not None

    def test_pause_nonexistent_returns_false(self):
        """暂停不存在的任务应返回 False"""
        mgr = TaskManager()
        assert mgr.pause_task("nonexistent") is False

    def test_finish_nonexistent_returns_false(self):
        """完成不存在的任务应返回 False"""
        mgr = TaskManager()
        assert mgr.finish_task("nonexistent") is False
