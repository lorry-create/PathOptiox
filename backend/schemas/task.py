"""通用任务模块 Pydantic 数据模型

注意：文档中泛型模型名为 TaskStatus[T]，但 TaskStatus 已是枚举名，
为避免命名冲突，此处将泛型模型命名为 TaskInfo[T]。
"""
from typing import Generic, Optional, TypeVar

from pydantic import Field

from .common import SchemaBase
from .enums import TaskStatus

T = TypeVar("T")


class TaskInfo(SchemaBase, Generic[T]):
    """通用任务状态模型（泛型）

    对齐前端 task.mock.ts 的 MockTaskState 结构。
    result 字段为泛型，不同任务类型可携带不同结果数据。
    """

    task_id: str = Field(description="任务ID")
    status: TaskStatus = Field(description="任务状态")
    progress: float = Field(description="进度(0-1)")
    result: Optional[T] = Field(default=None, description="任务结果")
    error_msg: Optional[str] = Field(default=None, description="错误信息(failed时存在)")
    task_type: Optional[str] = Field(default=None, description="任务类型标识")
    created_at: Optional[str] = Field(default=None, description="创建时间(ISO)")
    finished_at: Optional[str] = Field(default=None, description="完成时间(ISO)")
