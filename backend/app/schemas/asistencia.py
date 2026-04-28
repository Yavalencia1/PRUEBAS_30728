# c:\Users\Anahi\PRUEBAS_30728\backend\app\schemas\asistencia.py
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AsistenciaBase(BaseModel):
    sesion_id: int
    alumno_id: int
    estado: str


class AsistenciaCrear(AsistenciaBase):
    hora_subida: datetime | None = None
    hora_bajada: datetime | None = None


class AsistenciaActualizar(BaseModel):
    hora_subida: datetime | None = None
    hora_bajada: datetime | None = None
    estado: str | None = None


class AsistenciaLectura(AsistenciaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hora_subida: datetime | None
    hora_bajada: datetime | None
