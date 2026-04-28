# c:\Users\Anahi\PRUEBAS_30728\backend\app\models\usuario.py
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RolUsuario(str, Enum):
    padre = "padre"
    conductor = "conductor"
    dueno = "dueno"
    admin = "admin"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[RolUsuario] = mapped_column(
        SAEnum(RolUsuario, name="rol_usuario"),
        nullable=False,
        default=RolUsuario.padre,
    )
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    recorridos_dueno = relationship("Recorrido", back_populates="dueno", cascade="all, delete-orphan")
    alumnos_padre = relationship("Alumno", back_populates="padre", foreign_keys="Alumno.padre_id")
    sesiones_conductor = relationship("SesionRuta", back_populates="conductor", foreign_keys="SesionRuta.conductor_id")
    pagos_padre = relationship("Pago", back_populates="padre", foreign_keys="Pago.padre_id")
    notificaciones = relationship("Notificacion", back_populates="usuario", cascade="all, delete-orphan")
