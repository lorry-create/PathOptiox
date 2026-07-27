"""add CHECK constraints for enum columns

S2-T04: 枚举字段增加 CHECK 约束（DB-2）
- orders.status: CHECK IN ('pending', 'in_transit', 'delivered', 'exception')
- orders.shipping_method: CHECK IS NULL OR IN ('land', 'sea', 'air', 'rail', 'land_customs')
- alerts.level: CHECK IN ('low', 'moderate', 'high', 'critical')
- training_history.status: CHECK IN ('saved', 'deployed', 'archived')

SQLite 不支持直接 ALTER TABLE ADD CONSTRAINT，使用 batch_alter_table 重建表。
重建时会复制数据，若现有数据违反约束则迁移失败。

Revision ID: 0005_add_check_constraints
Revises: 0004_change_date_types
Create Date: 2026-07-22 00:03:00

应用方式：
    alembic upgrade head
回滚：
    alembic downgrade 0004_change_date_types
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0005_add_check_constraints"
down_revision: Union[str, None] = "0004_change_date_types"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. orders 表：status + shipping_method CHECK 约束
    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.create_check_constraint(
            "ck_orders_status",
            "status IN ('pending', 'in_transit', 'delivered', 'exception')",
        )
        batch_op.create_check_constraint(
            "ck_orders_shipping_method",
            "shipping_method IS NULL OR shipping_method IN ('land', 'sea', 'air', 'rail', 'land_customs')",
        )

    # 2. alerts 表：level CHECK 约束
    with op.batch_alter_table("alerts", schema=None) as batch_op:
        batch_op.create_check_constraint(
            "ck_alerts_level",
            "level IN ('low', 'moderate', 'high', 'critical')",
        )

    # 3. training_history 表：status CHECK 约束
    with op.batch_alter_table("training_history", schema=None) as batch_op:
        batch_op.create_check_constraint(
            "ck_training_history_status",
            "status IN ('saved', 'deployed', 'archived')",
        )


def downgrade() -> None:
    # 移除 CHECK 约束（batch_alter_table 重建表时不带约束）
    with op.batch_alter_table("training_history", schema=None) as batch_op:
        batch_op.drop_constraint("ck_training_history_status", type_="check")

    with op.batch_alter_table("alerts", schema=None) as batch_op:
        batch_op.drop_constraint("ck_alerts_level", type_="check")

    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.drop_constraint("ck_orders_shipping_method", type_="check")
        batch_op.drop_constraint("ck_orders_status", type_="check")
