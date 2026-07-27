"""Alembic 迁移环境配置

从 backend/config.py 读取 DATABASE_URL，自动发现 models/ 下所有 ORM 模型。
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# 将 backend 目录加入 sys.path，以便导入项目模块
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from config import settings  # noqa: E402
from database import Base  # noqa: E402
import models  # noqa: E402,F401  (导入所有模型以便 autogenerate 发现)


# Alembic 配置对象
config = context.config

# 从 settings 覆盖 sqlalchemy.url（支持 .env 切换数据库）
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# 日志配置
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 目标 metadata（autogenerate 据此对比数据库现状）
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """离线模式：生成 SQL 脚本不连接数据库"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """在线模式：连接数据库执行迁移"""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
