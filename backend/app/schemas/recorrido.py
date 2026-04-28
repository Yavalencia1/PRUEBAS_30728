# c:\Users\Anahi\PRUEBAS_30728\backend\app\schemas\recorrido.py
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RecorridoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    descripcion: str | None = None
    activo: bool = True


class RecorridoCrear(RecorridoBase):
    dueno_id: int


class RecorridoActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    descripcion: str | None = None
    activo: bool | None = None


class RecorridoLectura(RecorridoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dueno_id: int
    creado_en: datetime
