"""change date column types to DATE/DATETIME

S2-T03: 日期字段改用 DATE/DATETIME 类型（DB-3）
- orders.date: String(20) → Date
- alerts.time: String(32) → DateTime
- training_history: 移除 created_at_str，统一用 BaseModel.created_at

数据迁移：
- alerts.time: "YYYY-MM-DD HH:mm" → "YYYY-MM-DD HH:mm:00"（补齐秒）
- training_history: created_at_str 值复制到 created_at（补齐秒），再删除 created_at_str 列

Revision ID: 0004_change_date_types
Revises: 0003_add_audit_fields
Create Date: 2026-07-22 00:02:00

应用方式：
    alembic upgrade head
回滚：
    alembic downgrade 0003_add_audit_fields
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0004_change_date_types"
down_revision: Union[str, None] = "0003_add_audit_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. 数据迁移：alerts.time 补齐秒（"YYYY-MM-DD HH:mm" → "YYYY-MM-DD HH:mm:00"）
    #    仅处理长度为 16 的值（即 "YYYY-MM-DD HH:mm" 格式），避免重复处理已有秒的值
    #    注意：使用 bindparam 传递 ":00" 字面值，避免 sa.text() 将 ":00" 解析为绑定参数
    bind.execute(
        sa.text(
            "UPDATE alerts SET time = time || :suffix "
            "WHERE time IS NOT NULL AND length(time) = 16"
        ).bindparams(sa.bindparam("suffix", value=":00"))
    )

    # 2. 数据迁移：training_history.created_at_str → created_at
    #    将 created_at_str 值（补齐秒）复制到 BaseModel.created_at（DateTime 列）
    #    仅处理长度为 16 的值，避免重复处理
    bind.execute(
        sa.text(
            "UPDATE training_history SET created_at = created_at_str || :suffix "
            "WHERE created_at_str IS NOT NULL AND length(created_at_str) = 16"
        ).bindparams(sa.bindparam("suffix", value=":00"))
    )

    # 3. 删除 training_history.created_at_str 列（数据已迁移到 created_at）
    #    注意：不使用 alter_column 改变 orders.date / alerts.time 的 SQLite 列类型。
    #    SQLite 是动态类型数据库，列类型声明仅为"类型提示"（type affinity），不影响数据存储。
    #    ORM 模型中使用 Date / DateTime 类型，SQLAlchemy 会在 Python 层负责 date/datetime
    #    对象与字符串的互转，无需改变 SQLite 的列类型声明。
    #    若使用 batch_alter_table + alter_column(type_=sa.Date())，SQLite 重建表时
    #    会使用 CAST 表达式复制数据，将 "2026-07-01" 截断为整数 2026，导致数据损坏。
    with op.batch_alter_table("training_history", schema=None) as batch_op:
        batch_op.drop_column("created_at_str")


def downgrade() -> None:
    bind = op.get_bind()

    # 1. 恢复 training_history.created_at_str 列
    with op.batch_alter_table("training_history", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "created_at_str",
                sa.String(length=32),
                nullable=True,
                comment="创建时间 YYYY-MM-DD HH:mm",
            )
        )

    # 2. 数据回迁：created_at → created_at_str（截取为 "YYYY-MM-DD HH:mm" 格式）
    #    SQLite 的 strftime 函数可将 datetime 格式化为指定字符串
    bind.execute(
        sa.text(
            "UPDATE training_history "
            "SET created_at_str = strftime('%Y-%m-%d %H:%M', created_at) "
            "WHERE created_at IS NOT NULL"
        )
    )

    # 注意：不回滚 orders.date / alerts.time 的 SQLite 列类型（详见 upgrade 注释）
    # SQLite 列类型仅为类型提示，不影响数据存储。ORM 模型的 Date/DateTime 类型
    # 在 Python 层处理转换，与 SQLite 列类型声明无关。
