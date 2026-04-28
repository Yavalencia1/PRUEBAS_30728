from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.routers.auth import obtener_usuario_actual
from app.models.usuario import Usuario

router = APIRouter(tags=["Alumnos"])

@router.get("/")
async def listar_alumnos(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    return [
        {"id": "1", "nombre": "Juan Pérez", "parada": "Calle Principal 123", "presente": False},
        {"id": "2", "nombre": "María López", "parada": "Av. Siempre Viva 742", "presente": False},
        {"id": "3", "nombre": "Carlos Ruiz", "parada": "Plaza Mayor", "presente": False},
    ]
