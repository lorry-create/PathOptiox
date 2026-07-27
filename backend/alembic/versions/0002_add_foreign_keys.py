"""add foreign keys and alert_order_rel table

S2-T01: 增加数据库外键约束（DB-1, DB-4）
- 新增 alert_order_rel 中间表替代 alerts.affected_orders JSON 列
- orders 增加 created_by 外键引用 users.id
- alerts 增加 handled_by 外键引用 users.id
- training_history 增加 created_by 外键引用 users.id
- 数据迁移：将现有 affected_orders JSON 解析到中间表
- 删除 alerts.affected_orders 列（SQLite 使用 batch_alter_table）

Revision ID: 0002_add_foreign_keys
Revises: 0001_initial
Create Date: 2026-07-22 00:00:00

应用方式：
    alembic upgrade head
回滚：
    alembic downgrade 0001_initial
"""
import json
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002_add_foreign_keys"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ===== 1. 为现有表添加外键列（nullable，兼容历史数据）=====
    # SQLite 不支持直接 ALTER TABLE ADD CONSTRAINT，使用 batch_alter_table

    # orders.created_by -> users.id
    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("created_by", sa.Integer(), nullable=True, comment="创建人用户ID")
        )
        batch_op.create_index("ix_orders_created_by", ["created_by"])
        batch_op.create_foreign_key(
            "fk_orders_created_by_users",
            "users",
            ["created_by"],
            ["id"],
        )

    # alerts.handled_by -> users.id
    with op.batch_alter_table("alerts", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("handled_by", sa.Integer(), nullable=True, comment="处置人用户ID")
        )
        batch_op.create_index("ix_alerts_handled_by", ["handled_by"])
        batch_op.create_foreign_key(
            "fk_alerts_handled_by_users",
            "users",
            ["handled_by"],
            ["id"],
        )

    # training_history.created_by -> users.id
    with op.batch_alter_table("training_history", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("created_by", sa.Integer(), nullable=True, comment="创建人用户ID")
        )
        batch_op.create_index("ix_training_history_created_by", ["created_by"])
        batch_op.create_foreign_key(
            "fk_training_history_created_by_users",
            "users",
            ["created_by"],
            ["id"],
        )

    # ===== 2. 创建 alert_order_rel 中间表 =====
    op.create_table(
        "alert_order_rel",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("alert_id", sa.Integer(), nullable=False, comment="预警ID"),
        sa.Column("order_id", sa.Integer(), nullable=False, comment="订单ID"),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="创建时间"),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["alert_id"], ["alerts.id"], ondelete="CASCADE", name="fk_alert_order_rel_alert_id"
        ),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], ondelete="CASCADE", name="fk_alert_order_rel_order_id"
        ),
        sa.UniqueConstraint("alert_id", "order_id", name="uq_alert_order_rel"),
        comment="预警-订单关联表（多对多）",
    )
    op.create_index("ix_alert_order_rel_alert_id", "alert_order_rel", ["alert_id"])
    op.create_index("ix_alert_order_rel_order_id", "alert_order_rel", ["order_id"])

    # ===== 3. 数据迁移：将 alerts.affected_orders JSON 解析到中间表 =====
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT id, affected_orders FROM alerts "
            "WHERE affected_orders IS NOT NULL AND affected_orders != ''"
        )
    ).fetchall()

    now = datetime.utcnow()
    for alert_id, affected_orders_json in rows:
        try:
            order_nos = json.loads(affected_orders_json)
            if not isinstance(order_nos, list):
                continue
        except (json.JSONDecodeError, TypeError):
            continue

        for order_no in order_nos:
            # 通过 order_no 查找 order_id
            result = conn.execute(
                sa.text("SELECT id FROM orders WHERE order_no = :order_no"),
                {"order_no": order_no},
            ).fetchone()
            if result:
                order_id = result[0]
                # INSERT OR IGNORE 兼容 SQLite，避免唯一约束冲突
                conn.execute(
                    sa.text(
                        "INSERT OR IGNORE INTO alert_order_rel "
                        "(alert_id, order_id, created_at) VALUES (:alert_id, :order_id, :created_at)"
                    ),
                    {"alert_id": alert_id, "order_id": order_id, "created_at": now},
                )

    # ===== 4. 删除 alerts.affected_orders JSON 列 =====
    with op.batch_alter_table("alerts", schema=None) as batch_op:
        batch_op.drop_column("affected_orders")


def downgrade() -> None:
    # ===== 1. 恢复 alerts.affected_orders JSON 列 =====
    with op.batch_alter_table("alerts", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("affected_orders", sa.Text(), nullable=True, comment="受影响订单ID列表(JSON 数组字符串)")
        )

    # ===== 2. 数据回迁：从中间表聚合回 JSON =====
    conn = op.get_bind()
    alerts = conn.execute(sa.text("SELECT id FROM alerts")).fetchall()
    for (alert_id,) in alerts:
        order_nos = conn.execute(
            sa.text(
                "SELECT o.order_no FROM alert_order_rel r "
                "JOIN orders o ON r.order_id = o.id "
                "WHERE r.alert_id = :alert_id"
            ),
            {"alert_id": alert_id},
        ).fetchall()
        order_no_list = [row[0] for row in order_nos]
        if order_no_list:
            conn.execute(
                sa.text("UPDATE alerts SET affected_orders = :json WHERE id = :alert_id"),
                {"json": json.dumps(order_no_list, ensure_ascii=False), "alert_id": alert_id},
            )

    # ===== 3. 删除中间表 =====
    op.drop_index("ix_alert_order_rel_order_id", table_name="alert_order_rel")
    op.drop_index("ix_alert_order_rel_alert_id", table_name="alert_order_rel")
    op.drop_table("alert_order_rel")

    # ===== 4. 移除外键列 =====
    with op.batch_alter_table("training_history", schema=None) as batch_op:
        batch_op.drop_constraint("fk_training_history_created_by_users", type_="foreignkey")
        batch_op.drop_index("ix_training_history_created_by")
        batch_op.drop_column("created_by")

    with op.batch_alter_table("alerts", schema=None) as batch_op:
        batch_op.drop_constraint("fk_alerts_handled_by_users", type_="foreignkey")
        batch_op.drop_index("ix_alerts_handled_by")
        batch_op.drop_column("handled_by")

    with op.batch_alter_table("orders", schema=None) as batch_op:
        batch_op.drop_constraint("fk_orders_created_by_users", type_="foreignkey")
        batch_op.drop_index("ix_orders_created_by")
        batch_op.drop_column("created_by")
