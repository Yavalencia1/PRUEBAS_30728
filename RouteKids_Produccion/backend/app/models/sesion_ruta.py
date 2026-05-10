# c:\Users\Anahi\PRUEBAS_30728\backend\app\models\sesion_ruta.py
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, Integer, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EstadoSesionRuta(str, Enum):
    en_curso = "en_curso"
    completada = "completada"
    cancelada = "cancelada"


class SesionRuta(Base):
    __tablename__ = "sesiones_ruta"
    __table_args__ = (
        Index(
            "uq_sesiones_ruta_conductor_en_curso",
            "conductor_id",
            unique=True,
            postgresql_where=text("estado = 'en_curso'"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ruta_id: Mapped[int] = mapped_column(ForeignKey("rutas.id", ondelete="CASCADE"), nullable=False, index=True)
    conductor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    estado: Mapped[EstadoSesionRuta] = mapped_column(
        SAEnum(EstadoSesionRuta, name="estado_sesion_ruta"),
        nullable=False,
        default=EstadoSesionRuta.en_curso,
    )

    ruta = relationship("Ruta", back_populates="sesiones")
    conductor = relationship("Usuario", back_populates="sesiones_conductor", foreign_keys=[conductor_id])
    ubicaciones = relationship("UbicacionGPS", back_populates="sesion", cascade="all, delete-orphan")
    asistencias = relationship("Asistencia", back_populates="sesion", cascade="all, delete-orphan")
