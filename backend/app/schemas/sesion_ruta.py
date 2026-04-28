# c:\Users\Anahi\PRUEBAS_30728\backend\app\schemas\sesion_ruta.py
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SesionRutaBase(BaseModel):
    ruta_id: int
    conductor_id: int


class SesionRutaCrear(SesionRutaBase):
    pass


class SesionRutaActualizar(BaseModel):
    estado: str | None = None
    fin: datetime | None = None


class SesionRutaLectura(SesionRutaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    inicio: datetime
    fin: datetime | None
    estado: str
