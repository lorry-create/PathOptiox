"""add knowledge_base table (S3-T03)

S3-T03: 新增 RAG 知识库表，用于存储向量检索的知识条目。

Revision ID: 0006_add_knowledge_base
Revises: 0005_add_check_constraints
Create Date: 2026-07-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0006_add_knowledge_base"
down_revision: Union[str, None] = "0005_add_check_constraints"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "knowledge_base",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False, comment="条目标题"),
        sa.Column("category", sa.String(length=64), nullable=False, server_default="general", comment="分类"),
        sa.Column("content", sa.Text(), nullable=False, comment="正文内容"),
        sa.Column("source", sa.String(length=200), nullable=True, comment="来源"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column(
            "created_by",
            sa.Integer(),
            sa.ForeignKey("users.id", name="fk_kb_created_by_users"),
            nullable=True,
        ),
        sa.Column(
            "updated_by",
            sa.Integer(),
            sa.ForeignKey("users.id", name="fk_kb_updated_by_users"),
            nullable=True,
        ),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_kb_category", "knowledge_base", ["category"])
    op.create_index("ix_kb_title", "knowledge_base", ["title"])
    op.create_index("ix_kb_is_deleted", "knowledge_base", ["is_deleted"])


def downgrade() -> None:
    op.drop_table("knowledge_base")
