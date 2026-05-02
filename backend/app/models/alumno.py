# c:\Users\Anahi\PRUEBAS_30728\backend\app\models\alumno.py
from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Alumno(Base):
    __tablename__ = "alumnos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    padre_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    recorrido_id: Mapped[int] = mapped_column(ForeignKey("recorridos.id", ondelete="RESTRICT"), nullable=False, index=True)
    parada_id: Mapped[int | None] = mapped_column(ForeignKey("paradas.id", ondelete="SET NULL"), nullable=True, index=True)
    fecha_nacimiento: Mapped[date] = mapped_column(Date, nullable=False)

    padre = relationship("Usuario", back_populates="alumnos_padre", foreign_keys=[padre_id])
    recorrido = relationship("Recorrido", back_populates="alumnos")
    parada = relationship("Parada", back_populates="alumnos")
    asistencias = relationship("Asistencia", back_populates="alumno", cascade="all, delete-orphan")
    pagos = relationship("Pago", back_populates="alumno", cascade="all, delete-orphan")
