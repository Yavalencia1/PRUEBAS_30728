# c:\Users\Anahi\PRUEBAS_30728\backend\app\models\ruta.py
from __future__ import annotations

from enum import Enum

from sqlalchemy import Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TipoRuta(str, Enum):
    ida = "ida"
    vuelta = "vuelta"
    ida_vuelta = "ida_vuelta"


class Ruta(Base):
    __tablename__ = "rutas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recorrido_id: Mapped[int] = mapped_column(ForeignKey("recorridos.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    tipo: Mapped[TipoRuta] = mapped_column(SAEnum(TipoRuta, name="tipo_ruta"), nullable=False)

    recorrido = relationship("Recorrido", back_populates="rutas")
    paradas = relationship("Parada", back_populates="ruta", cascade="all, delete-orphan")
    sesiones = relationship("SesionRuta", back_populates="ruta", cascade="all, delete-orphan")
