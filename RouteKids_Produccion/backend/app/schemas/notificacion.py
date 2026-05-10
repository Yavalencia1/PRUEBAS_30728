# c:\Users\Anahi\PRUEBAS_30728\backend\app\schemas\notificacion.py
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificacionBase(BaseModel):
    titulo: str = Field(min_length=1, max_length=150)
    mensaje: str
    tipo: str
    leida: bool = False


class NotificacionCrear(NotificacionBase):
    usuario_id: int


class NotificacionActualizar(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=150)
    mensaje: str | None = None
    tipo: str | None = None
    leida: bool | None = None


class NotificacionLectura(NotificacionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    creado_en: datetime
