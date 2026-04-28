# c:\Users\Anahi\PRUEBAS_30728\backend\app\models\asistencia.py
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EstadoAsistencia(str, Enum):
    presente = "presente"
    ausente = "ausente"
    tarde = "tarde"


class Asistencia(Base):
    __tablename__ = "asistencias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sesion_id: Mapped[int] = mapped_column(ForeignKey("sesiones_ruta.id", ondelete="CASCADE"), nullable=False, index=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("alumnos.id", ondelete="CASCADE"), nullable=False, index=True)
    hora_subida: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    hora_bajada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    estado: Mapped[EstadoAsistencia] = mapped_column(
        SAEnum(EstadoAsistencia, name="estado_asistencia"),
        nullable=False,
        default=EstadoAsistencia.ausente,
    )

    sesion = relationship("SesionRuta", back_populates="asistencias")
    alumno = relationship("Alumno", back_populates="asistencias")
