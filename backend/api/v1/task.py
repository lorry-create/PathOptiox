"""通用任务模块路由"""
from fastapi import APIRouter, Depends, HTTPException

from dependencies import get_current_user
from services.task_manager import task_manager


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/{task_id}", summary="查询任务状态")
def get_task(task_id: str):
    """调用通用任务管理器，返回标准任务状态结构（只读快照）。

    修复后：get_task 不再有任何副作用，查询本身不会推进进度。
    进度由业务层启动的后台 Worker（如 order_service._run_batch_dispatch_worker）
    按真实时间通过 update_progress / finish_task 推进。
    """
    task = task_manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task
