"""数据库连接模块

SQLAlchemy 2.0 语法，提供引擎、会话工厂、Base 基类和 get_db 依赖。
默认使用 SQLite，可通过 .env 切换 PostgreSQL 等其他数据库。

会话管理：
- 路由层：通过 Depends(get_db) 注入，请求结束自动关闭
- Service 层：通过 get_db_session() 上下文管理器使用，自动关闭

迁移管理（Alembic）：
    # 生成迁移脚本（修改 models/ 后执行）
    alembic revision --autogenerate -m "描述"
    # 执行迁移到最新版本
    alembic upgrade head
    # 回滚一个版本
    alembic downgrade -1
    # 查看当前版本
    alembic current
    # 查看历史
    alembic history
"""
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from config import settings


# 引擎：SQLite 需要 check_same_thread=False；其他数据库无需此参数
_connect_args = (
    {"check_same_thread": False}
    if settings.DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=_connect_args,
    echo=False,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 声明式基类

    所有 ORM 模型应继承此基类。
    通用字段（id、created_at、updated_at）定义在 models/base.py 的 BaseModel 中。
    """
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依赖函数：注入数据库会话

    用法：
        @router.get("/items")
        def list_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Service 层数据库会话上下文管理器

    用于路由层零修改的场景：Service 方法内部自行管理会话。
    退出时自动关闭会话（不自动 commit，需调用方显式 commit）。

    用法：
        with get_db_session() as db:
            db.add(obj)
            db.commit()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
