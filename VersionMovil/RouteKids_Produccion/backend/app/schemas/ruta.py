# c:\Users\Anahi\PRUEBAS_30728\backend\app\schemas\ruta.py
from pydantic import BaseModel, ConfigDict, Field


class RutaBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    descripcion: str | None = None
    tipo: str


class RutaCrear(RutaBase):
    recorrido_id: int


class RutaActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    descripcion: str | None = None
    tipo: str | None = None


class RutaLectura(RutaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recorrido_id: int
