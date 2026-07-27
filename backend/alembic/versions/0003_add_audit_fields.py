"""add audit fields and soft delete to BaseModel tables

S2-T02: 增加审计字段与软删除（DB-5, DB-6）
- BaseModel 增加 created_by/updated_by/is_deleted/deleted_at
- orders/training_history 已有 created_by（S2-T01），仅加 updated_by/is_deleted/deleted_at
- alerts/users/system_config/logistics_node/logistics_link/link_price_factor/scene_factor 加全部 4 列
- 所有新增列 nullable（兼容历史数据），is_deleted 默认 False

Revision ID: 0003_add_audit_fields
Revises: 0002_add_foreign_keys
Create Date: 2026-07-22 00:01:00

应用方式：
    alembic upgrade head
回滚：
    alembic downgrade 0002_add_foreign_keys
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0003_add_audit_fields"
down_revision: Union[str, None] = "0002_add_foreign_keys"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# 所有继承 BaseModel 的表
_ALL_BASEMODEL_TABLES = [
    "orders",
    "alerts",
    "training_history",
    "users",
    "system_config",
    "logistics_node",
    "logistics_link",
    "link_price_factor",
    "scene_factor",
]

# 已有 created_by 的表（S2-T01 迁移 0002 添加）
_TABLES_WITH_CREATED_BY = {"orders", "training_history"}


def upgrade() -> None:
    # 为每张表添加审计列
    for table in _ALL_BASEMODEL_TABLES:
        needs_created_by = table not in _TABLES_WITH_CREATED_BY
        with op.batch_alter_table(table, schema=None) as batch_op:
            if needs_created_by:
                batch_op.add_column(
                    sa.Column("created_by", sa.Integer(), nullable=True, comment="创建人用户ID")
                )
                batch_op.create_index(f"ix_{table}_created_by", ["created_by"])
                batch_op.create_foreign_key(
                    f"fk_{table}_created_by_users", "users", ["created_by"], ["id"]
                )

            batch_op.add_column(
                sa.Column("updated_by", sa.Integer(), nullable=True, comment="更新人用户ID")
            )
            batch_op.add_column(
                sa.Column(
                    "is_deleted",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.text("0"),
                    comment="是否已软删除",
                )
            )
            batch_op.add_column(
                sa.Column("deleted_at", sa.DateTime(), nullable=True, comment="软删除时间")
            )

            batch_op.create_index(f"ix_{table}_updated_by", ["updated_by"])
            batch_op.create_index(f"ix_{table}_is_deleted", ["is_deleted"])


def downgrade() -> None:
    # 移除审计列
    for table in _ALL_BASEMODEL_TABLES:
        needs_created_by = table not in _TABLES_WITH_CREATED_BY
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.drop_index(f"ix_{table}_is_deleted")
            batch_op.drop_index(f"ix_{table}_updated_by")
            batch_op.drop_column("deleted_at")
            batch_op.drop_column("is_deleted")
            batch_op.drop_column("updated_by")

            if needs_created_by:
                batch_op.drop_constraint(f"fk_{table}_created_by_users", type_="foreignkey")
                batch_op.drop_index(f"ix_{table}_created_by")
                batch_op.drop_column("created_by")
