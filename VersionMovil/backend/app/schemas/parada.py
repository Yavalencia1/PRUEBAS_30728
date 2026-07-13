# c:\Users\Anahi\PRUEBAS_30728\backend\app\schemas\parada.py
from pydantic import BaseModel, ConfigDict, Field


class ParadaBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    orden: int = Field(ge=0)


class ParadaCrear(ParadaBase):
    ruta_id: int


class ParadaActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    latitud: float | None = Field(default=None, ge=-90, le=90)
    longitud: float | None = Field(default=None, ge=-180, le=180)
    orden: int | None = Field(default=None, ge=0)


class ParadaLectura(ParadaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ruta_id: int
