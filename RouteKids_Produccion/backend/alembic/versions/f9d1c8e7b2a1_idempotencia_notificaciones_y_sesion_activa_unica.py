"""Idempotencia para notificaciones y sesión activa única por conductor

Revision ID: f9d1c8e7b2a1
Revises: a16670a825ec
Create Date: 2026-05-02 20:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f9d1c8e7b2a1'
down_revision = 'a16670a825ec'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        'uq_asistencias_sesion_alumno',
        'asistencias',
        ['sesion_id', 'alumno_id'],
    )
    op.create_index(
        'uq_sesiones_ruta_conductor_en_curso',
        'sesiones_ruta',
        ['conductor_id'],
        unique=True,
        postgresql_where=sa.text("estado = 'en_curso'"),
    )


def downgrade() -> None:
    op.drop_index('uq_sesiones_ruta_conductor_en_curso', table_name='sesiones_ruta')
    op.drop_constraint('uq_asistencias_sesion_alumno', 'asistencias', type_='unique')
