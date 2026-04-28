import os

routers_dir = r"c:\Users\Anahi\PRUEBAS_30728\backend\app\routers"
main_py = r"c:\Users\Anahi\PRUEBAS_30728\backend\app\main.py"

# Routers to create with empty skeletons
skeletons = ['usuarios', 'recorridos', 'pagos', 'notificaciones']
for name in skeletons:
    with open(os.path.join(routers_dir, f"{name}.py"), "w", encoding="utf-8") as f:
        f.write(f'''from fastapi import APIRouter\n\nrouter = APIRouter(tags=["{name.capitalize()}"])\n''')

# Create dashboard.py
with open(os.path.join(routers_dir, "dashboard.py"), "w", encoding="utf-8") as f:
    f.write('''from fastapi import APIRouter, Depends
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
''')

# Create alumnos.py
with open(os.path.join(routers_dir, "alumnos.py"), "w", encoding="utf-8") as f:
    f.write('''from fastapi import APIRouter, Depends
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
''')

# Create sesiones.py
with open(os.path.join(routers_dir, "sesiones.py"), "w", encoding="utf-8") as f:
    f.write('''from fastapi import APIRouter, Depends, HTTPException
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
''')

# Create websockets.py
with open(os.path.join(routers_dir, "websockets.py"), "w", encoding="utf-8") as f:
    f.write('''from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast(self, message: str, session_id: str):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

manager = ConnectionManager()

@router.websocket("/ws/conductor/{sesion_id}")
async def websocket_conductor(websocket: WebSocket, sesion_id: str):
    await manager.connect(websocket, sesion_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data, sesion_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, sesion_id)

@router.websocket("/ws/gps/{sesion_id}")
async def websocket_padres(websocket: WebSocket, sesion_id: str):
    await manager.connect(websocket, sesion_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, sesion_id)
''')

# Update main.py
main_content = """from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.usuarios import router as usuarios_router
from app.routers.recorridos import router as recorridos_router
from app.routers.alumnos import router as alumnos_router
from app.routers.sesiones import router as sesiones_router
from app.routers.pagos import router as pagos_router
from app.routers.notificaciones import router as notificaciones_router
from app.routers.dashboard import router as dashboard_router
from app.routers.websockets import router as websockets_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list() or ["http://localhost:3000", "http://localhost:5000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = settings.api_v1_prefix
app.include_router(auth_router, prefix=f"{prefix}/auth")
app.include_router(usuarios_router, prefix=f"{prefix}/usuarios")
app.include_router(recorridos_router, prefix=f"{prefix}/recorridos")
app.include_router(alumnos_router, prefix=f"{prefix}/alumnos")
app.include_router(sesiones_router, prefix=f"{prefix}/sesiones")
app.include_router(pagos_router, prefix=f"{prefix}/pagos")
app.include_router(notificaciones_router, prefix=f"{prefix}/notificaciones")
app.include_router(dashboard_router, prefix=f"{prefix}/dashboard")
app.include_router(websockets_router)

@app.get("/")
async def raiz() -> dict:
    return {
        "ok": True,
        "data": {"app": settings.app_name, "env": settings.app_env},
        "mensaje": "RouteKids API activa",
    }
"""
with open(main_py, "w", encoding="utf-8") as f:
    f.write(main_content)

# Delete endpoints_extra.py if it exists
try:
    os.remove(os.path.join(routers_dir, "endpoints_extra.py"))
except:
    pass

print("Done")
