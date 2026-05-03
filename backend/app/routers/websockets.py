import json
from decimal import Decimal
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import obtener_payload_desde_token, obtener_subject_desde_token
from app.models.sesion_ruta import EstadoSesionRuta, SesionRuta
from app.models.ubicacion_gps import UbicacionGPS
from app.models.usuario import RolUsuario, Usuario

router = APIRouter(tags=["WebSockets"])


def _extraer_token(websocket: WebSocket) -> str | None:
    auth_header = websocket.headers.get("authorization")
    if auth_header:
        partes = auth_header.split()
        if len(partes) == 2 and partes[0].lower() == "bearer":
            return partes[1]
    token = websocket.query_params.get("token")
    if token:
        return token
    return None


async def _autenticar_websocket(websocket: WebSocket, db) -> Usuario | None:
    token = _extraer_token(websocket)
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None

    try:
        payload = obtener_payload_desde_token(token)
        if payload.get("typ") != "access":
            raise ValueError("Se requiere un token de acceso")
        email = obtener_subject_desde_token(token)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None

    resultado = await db.execute(select(Usuario).where(Usuario.email == email))
    usuario = resultado.scalar_one_or_none()
    if usuario is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None
    return usuario


def _parsear_gps(message: str) -> tuple[Decimal, Decimal] | None:
    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        return None

    lat = data.get("lat")
    lng = data.get("lng")
    if lat is None or lng is None:
        return None
    try:
        return Decimal(str(lat)), Decimal(str(lng))
    except Exception:
        return None

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
    try:
        sesion_id_int = int(sesion_id)
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    async with AsyncSessionLocal() as db:
        usuario = await _autenticar_websocket(websocket, db)
        if usuario is None:
            return
        if usuario.rol != RolUsuario.conductor:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        resultado = await db.execute(select(SesionRuta).where(SesionRuta.id == sesion_id_int))
        sesion = resultado.scalar_one_or_none()
        if sesion is None or sesion.conductor_id != usuario.id or sesion.estado != EstadoSesionRuta.en_curso:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await manager.connect(websocket, sesion_id)
        try:
            while True:
                data = await websocket.receive_text()
                coords = _parsear_gps(data)
                if coords is not None:
                    latitud, longitud = coords
                    db.add(
                        UbicacionGPS(
                            sesion_id=sesion.id,
                            latitud=latitud,
                            longitud=longitud,
                        )
                    )
                    try:
                        await db.commit()
                    except Exception:
                        await db.rollback()
                await manager.broadcast(data, sesion_id)
        except WebSocketDisconnect:
            manager.disconnect(websocket, sesion_id)

@router.websocket("/ws/gps/{sesion_id}")
async def websocket_padres(websocket: WebSocket, sesion_id: str):
    try:
        sesion_id_int = int(sesion_id)
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    async with AsyncSessionLocal() as db:
        usuario = await _autenticar_websocket(websocket, db)
        if usuario is None:
            return

        resultado = await db.execute(select(SesionRuta.id).where(SesionRuta.id == sesion_id_int))
        if resultado.scalar_one_or_none() is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await manager.connect(websocket, sesion_id)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket, sesion_id)
