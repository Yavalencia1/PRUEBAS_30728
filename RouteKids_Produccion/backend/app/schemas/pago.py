# c:\Users\Anahi\PRUEBAS_30728\backend\app\schemas\pago.py
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PagoBase(BaseModel):
    monto: Decimal = Field(gt=0)
    fecha_vencimiento: date
    fecha_pago: date | None = None
    estado: str = Field(default="pendiente")
    referencia: str | None = None


class PagoCrear(PagoBase):
    alumno_id: int
    padre_id: int


class PagoActualizar(BaseModel):
    monto: Decimal | None = Field(default=None, gt=0)
    fecha_vencimiento: date | None = None
    fecha_pago: date | None = None
    estado: str | None = None
    referencia: str | None = None


class PagoLectura(PagoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alumno_id: int
    padre_id: int
