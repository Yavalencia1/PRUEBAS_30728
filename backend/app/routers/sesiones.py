from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.routers.auth import obtener_usuario_actual
from app.models.usuario import Usuario

router = APIRouter(tags=["Sesiones"])

estado_sesiones = {}
ultimo_sesion_id = 100

@router.post("/")
async def crear_sesion(db: AsyncSession = Depends(get_db)):
    global ultimo_sesion_id
    ultimo_sesion_id += 1
    session_id = str(ultimo_sesion_id)
    estado_sesiones[session_id] = "en_progreso"
    return {"id": session_id, "estado": "en_progreso"}

@router.patch("/{id}/terminar")
async def terminar_sesion(id: str, db: AsyncSession = Depends(get_db)):
    if id in estado_sesiones:
        estado_sesiones[id] = "completada"
    return {"id": id, "estado": "completada"}

@router.get("/activa")
async def sesion_activa(db: AsyncSession = Depends(get_db)):
    for s_id, estado in estado_sesiones.items():
        if estado == "en_progreso":
            return {"id": s_id, "estado": "en_progreso"}
    raise HTTPException(status_code=404, detail="No hay sesión activa")
