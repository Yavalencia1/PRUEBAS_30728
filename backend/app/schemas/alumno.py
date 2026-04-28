# c:\Users\Anahi\PRUEBAS_30728\backend\app\schemas\alumno.py
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class AlumnoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    fecha_nacimiento: date


class AlumnoCrear(AlumnoBase):
    padre_id: int
    recorrido_id: int
    parada_id: int | None = None


class AlumnoActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    apellido: str | None = Field(default=None, min_length=1, max_length=100)
    fecha_nacimiento: date | None = None
    parada_id: int | None = None


class AlumnoLectura(AlumnoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    padre_id: int
    recorrido_id: int
    parada_id: int | None
