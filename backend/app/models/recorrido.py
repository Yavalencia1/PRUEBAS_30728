# c:\Users\Anahi\PRUEBAS_30728\backend\app\models\recorrido.py
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Recorrido(Base):
    __tablename__ = "recorridos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    dueno_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    dueno = relationship("Usuario", back_populates="recorridos_dueno")
    rutas = relationship("Ruta", back_populates="recorrido", cascade="all, delete-orphan")
    alumnos = relationship("Alumno", back_populates="recorrido")
