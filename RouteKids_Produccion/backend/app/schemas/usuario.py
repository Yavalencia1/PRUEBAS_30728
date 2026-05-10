# c:\Users\Anahi\PRUEBAS_30728\backend\app\schemas\usuario.py
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    email: EmailStr
    telefono: str | None = Field(default=None, max_length=30)
    rol: str = Field(default="padre")


class UsuarioCrear(UsuarioBase):
    password: str = Field(min_length=8, max_length=128)


class UsuarioActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    apellido: str | None = Field(default=None, min_length=1, max_length=100)
    telefono: str | None = Field(default=None, max_length=30)
    rol: str | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UsuarioLectura(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    creado_en: datetime
