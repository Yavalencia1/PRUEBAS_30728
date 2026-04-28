# c:\Users\Anahi\PRUEBAS_30728\backend\app\models\parada.py
from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal

from app.core.database import Base


class Parada(Base):
    __tablename__ = "paradas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ruta_id: Mapped[int] = mapped_column(ForeignKey("rutas.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    latitud: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    longitud: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)

    ruta = relationship("Ruta", back_populates="paradas")
    alumnos = relationship("Alumno", back_populates="parada")
