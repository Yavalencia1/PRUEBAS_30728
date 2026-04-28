# c:\Users\Anahi\PRUEBAS_30728\backend\app\models\ubicacion_gps.py
from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UbicacionGPS(Base):
    __tablename__ = "ubicaciones_gps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sesion_id: Mapped[int] = mapped_column(ForeignKey("sesiones_ruta.id", ondelete="CASCADE"), nullable=False, index=True)
    latitud: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    longitud: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    registrado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    sesion = relationship("SesionRuta", back_populates="ubicaciones")
    registrado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    sesion = relationship("SesionRuta", back_populates="ubicaciones")
