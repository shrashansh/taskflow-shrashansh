"""Add created_by column to tasks

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NIL_UUID = "00000000-0000-0000-0000-000000000000"


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column(
            "created_by",
            sa.Uuid(),
            nullable=False,
            server_default=sa.text(f"'{NIL_UUID}'"),
        ),
    )
    op.alter_column("tasks", "created_by", server_default=None)
    op.create_foreign_key(
        "fk_tasks_created_by_users", "tasks", "users", ["created_by"], ["id"]
    )
    op.create_index("ix_tasks_created_by", "tasks", ["created_by"])


def downgrade() -> None:
    op.drop_index("ix_tasks_created_by", table_name="tasks")
    op.drop_constraint("fk_tasks_created_by_users", "tasks", type_="foreignkey")
    op.drop_column("tasks", "created_by")
