"""基础服务类

提供通用 CRUD 操作占位，子类可继承并扩展业务逻辑。
保持业务逻辑与路由层、ORM 层解耦。
"""
from typing import Generic, List, Optional, TypeVar

from sqlalchemy.orm import Session

from models.base import BaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)


class BaseService(Generic[ModelType]):
    """基础服务类

    用法：
        class OrderService(BaseService[Order]):
            def __init__(self):
                super().__init__(model=Order)
    """

    def __init__(self, model: type[ModelType]):
        self.model = model

    def get(self, db: Session, id: int) -> Optional[ModelType]:
        """根据主键查询单条记录"""
        return db.query(self.model).filter(self.model.id == id).first()

    def get_multi(
        self, db: Session, skip: int = 0, limit: int = 20
    ) -> List[ModelType]:
        """分页查询多条记录"""
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: dict) -> ModelType:
        """创建记录（占位）"""
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int) -> bool:
        """根据主键删除记录（占位）"""
        obj = self.get(db, id)
        if obj is None:
            return False
        db.delete(obj)
        db.commit()
        return True
