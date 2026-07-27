"""initial schema with indexes

创建所有业务表并对齐当前 ORM 模型：
- orders / alerts / training_history / users / system_config
- users 表使用 hashed_password（bcrypt 哈希），与 JWT 鉴权一致
- 为高频过滤字段添加索引：orders.status / orders.date /
  alerts.handled / alerts.level / training_history.status

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-19 00:00:00

应用方式：
    alembic upgrade head
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ===== 订单表 =====
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("order_no", sa.String(length=32), nullable=False, comment="订单编号"),
        sa.Column("customer_name", sa.String(length=100), nullable=False, comment="客户名称"),
        sa.Column("date", sa.String(length=20), nullable=False, comment="订单日期 YYYY-MM-DD"),
        sa.Column("total_amount", sa.Float(), nullable=False, comment="订单总金额"),
        sa.Column("status", sa.String(length=20), nullable=False, comment="订单状态(小写字符串)"),
        sa.Column("sender", sa.String(length=200), nullable=True, comment="发件方"),
        sa.Column("receiver", sa.String(length=200), nullable=True, comment="收件方"),
        sa.Column("goods_description", sa.String(length=500), nullable=True, comment="货物描述"),
        sa.Column("shipping_method", sa.String(length=20), nullable=True, comment="运输方式"),
        sa.Column("estimated_delivery", sa.String(length=20), nullable=True, comment="预计送达日期"),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="创建时间"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, comment="更新时间"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_no", name="uq_orders_order_no"),
    )
    op.create_index("ix_orders_id", "orders", ["id"])
    op.create_index("ix_orders_order_no", "orders", ["order_no"])
    # 高频过滤字段索引
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_orders_date", "orders", ["date"])

    # ===== 风险预警表 =====
    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("alert_no", sa.String(length=32), nullable=False, comment="预警编号"),
        sa.Column("level", sa.String(length=20), nullable=False, comment="风险等级(小写字符串)"),
        sa.Column("title", sa.String(length=200), nullable=False, comment="预警标题"),
        sa.Column("content", sa.Text(), nullable=False, comment="预警内容"),
        sa.Column("time", sa.String(length=32), nullable=False, comment="预警时间 YYYY-MM-DD HH:mm"),
        sa.Column("affected_route", sa.String(length=200), nullable=False, comment="受影响路线"),
        sa.Column("affected_orders", sa.Text(), nullable=True, comment="受影响订单ID列表(JSON 数组字符串)"),
        sa.Column("daily_loss", sa.Float(), nullable=False, comment="日损失金额"),
        sa.Column("ai_suggestion", sa.Text(), nullable=True, comment="AI 建议"),
        sa.Column("handled", sa.Boolean(), nullable=False, comment="是否已处置"),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="创建时间"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, comment="更新时间"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("alert_no", name="uq_alerts_alert_no"),
    )
    op.create_index("ix_alerts_id", "alerts", ["id"])
    op.create_index("ix_alerts_alert_no", "alerts", ["alert_no"])
    # 高频过滤字段索引
    op.create_index("ix_alerts_level", "alerts", ["level"])
    op.create_index("ix_alerts_handled", "alerts", ["handled"])

    # ===== 训练历史表 =====
    op.create_table(
        "training_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("model_id", sa.String(length=64), nullable=False, comment="模型ID"),
        sa.Column("version_name", sa.String(length=100), nullable=False, comment="版本名称"),
        sa.Column("created_at_str", sa.String(length=32), nullable=False, comment="创建时间 YYYY-MM-DD HH:mm"),
        sa.Column("reward", sa.Float(), nullable=False, comment="奖励值"),
        sa.Column("status", sa.String(length=20), nullable=False, comment="状态(saved/deployed/archived)"),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="记录创建时间"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, comment="记录更新时间"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model_id", name="uq_training_history_model_id"),
    )
    op.create_index("ix_training_history_id", "training_history", ["id"])
    op.create_index("ix_training_history_model_id", "training_history", ["model_id"])
    # 高频过滤字段索引
    op.create_index("ix_training_history_status", "training_history", ["status"])

    # ===== 用户表（使用 hashed_password，对齐 JWT 鉴权）=====
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False, comment="用户名"),
        sa.Column("hashed_password", sa.String(length=128), nullable=False, comment="密码哈希值（bcrypt）"),
        sa.Column("email", sa.String(length=128), nullable=True, comment="邮箱"),
        sa.Column("full_name", sa.String(length=64), nullable=True, comment="姓名"),
        sa.Column("is_admin", sa.Boolean(), nullable=False, comment="是否管理员"),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="创建时间"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, comment="更新时间"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_username", "users", ["username"])

    # ===== 系统配置表 =====
    op.create_table(
        "system_config",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("config_key", sa.String(length=64), nullable=False, comment="配置键"),
        sa.Column("config_value", sa.Text(), nullable=True, comment="配置值(字符串)"),
        sa.Column("description", sa.String(length=200), nullable=True, comment="配置说明"),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="创建时间"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, comment="更新时间"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("config_key", name="uq_system_config_config_key"),
    )
    op.create_index("ix_system_config_id", "system_config", ["id"])
    op.create_index("ix_system_config_config_key", "system_config", ["config_key"])


def downgrade() -> None:
    op.drop_index("ix_system_config_config_key", table_name="system_config")
    op.drop_index("ix_system_config_id", table_name="system_config")
    op.drop_table("system_config")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")

    op.drop_index("ix_training_history_status", table_name="training_history")
    op.drop_index("ix_training_history_model_id", table_name="training_history")
    op.drop_index("ix_training_history_id", table_name="training_history")
    op.drop_table("training_history")

    op.drop_index("ix_alerts_handled", table_name="alerts")
    op.drop_index("ix_alerts_level", table_name="alerts")
    op.drop_index("ix_alerts_alert_no", table_name="alerts")
    op.drop_index("ix_alerts_id", table_name="alerts")
    op.drop_table("alerts")

    op.drop_index("ix_orders_date", table_name="orders")
    op.drop_index("ix_orders_status", table_name="orders")
    op.drop_index("ix_orders_order_no", table_name="orders")
    op.drop_index("ix_orders_id", table_name="orders")
    op.drop_table("orders")
