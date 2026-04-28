# c:\Users\Anahi\PRUEBAS_30728\backend\app\models\pago.py
from __future__ import annotations

from datetime import date
from decimal import Decimal
from enum import Enum

from sqlalchemy import Date, Enum as SAEnum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EstadoPago(str, Enum):
    pendiente = "pendiente"
    pagado = "pagado"
    vencido = "vencido"


class Pago(Base):
    __tablename__ = "pagos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("alumnos.id", ondelete="CASCADE"), nullable=False, index=True)
    padre_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fecha_vencimiento: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_pago: Mapped[date | None] = mapped_column(Date, nullable=True)
    estado: Mapped[EstadoPago] = mapped_column(
        SAEnum(EstadoPago, name="estado_pago"),
        nullable=False,
        default=EstadoPago.pendiente,
    )
    referencia: Mapped[str | None] = mapped_column(String(100), nullable=True)

    alumno = relationship("Alumno", back_populates="pagos")
    padre = relationship("Usuario", back_populates="pagos_padre", foreign_keys=[padre_id])
