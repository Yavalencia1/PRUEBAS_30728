from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.routers.auth import obtener_usuario_actual
from app.models.usuario import Usuario

router = APIRouter(tags=["Dashboard"])

@router.get("/resumen")
async def dashboard_resumen(
    db: AsyncSession = Depends(get_db), 
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    return {
        "total_alumnos_activos": 142,
        "recorridos_activos": 5,
        "pagos_pendientes_mes": 450.0,
        "pagos_cobrados_mes": 3200.0,
        "ultimos_pagos_pendientes": [
            {"alumno": "Juan Pérez", "monto": 50.0},
            {"alumno": "María López", "monto": 50.0},
            {"alumno": "Carlos Ruiz", "monto": 50.0},
        ]
    }
