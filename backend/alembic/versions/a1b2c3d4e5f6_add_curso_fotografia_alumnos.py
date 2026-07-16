# c:\Users\Anahi\PRUEBAS_30728\backend\alembic\versions\a1b2c3d4e5f6_add_curso_fotografia_alumnos.py
"""add curso and fotografia to alumnos

Revision ID: a1b2c3d4e5f6
Revises: b7f3a9c2d1e4
Create Date: 2026-07-16 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'b7f3a9c2d1e4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('alumnos', sa.Column('curso', sa.String(100), nullable=True))
    op.add_column('alumnos', sa.Column('fotografia', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('alumnos', 'fotografia')
    op.drop_column('alumnos', 'curso')
