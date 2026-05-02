"""Restrict alumnos.recorrido_id deletion

Revision ID: b4d9b9a1f7e2
Revises: a16670a825ec
Create Date: 2026-05-01 00:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "b4d9b9a1f7e2"
down_revision = "a16670a825ec"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS alumnos_recorrido_id_fkey")
    op.create_foreign_key(
        "alumnos_recorrido_id_fkey",
        "alumnos",
        "recorridos",
        ["recorrido_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.execute("ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS alumnos_recorrido_id_fkey")
    op.create_foreign_key(
        "alumnos_recorrido_id_fkey",
        "alumnos",
        "recorridos",
        ["recorrido_id"],
        ["id"],
        ondelete="CASCADE",
    )