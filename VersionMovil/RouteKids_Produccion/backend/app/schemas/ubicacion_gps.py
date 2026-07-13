# c:\Users\Anahi\PRUEBAS_30728\backend\app\schemas\ubicacion_gps.py
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UbicacionGPSBase(BaseModel):
    latitud: float
    longitud: float


class UbicacionGPSCrear(UbicacionGPSBase):
    sesion_id: int


class UbicacionGPSLectura(UbicacionGPSBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sesion_id: int
    registrado_en: datetime
