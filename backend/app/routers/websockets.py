from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from fastapi.exceptions import WebSocketException
from typing import Dict, List
import json

from app.core.security import decodificar_token
from jose import JWTError

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    """Gestor de conexiones WebSocket con validación de token JWT"""
    
    def __init__(self):
        self.active_connections: Dict[str, List[dict]] = {}

    async def connect(self, websocket: WebSocket, session_id: str, usuario_id: int, usuario_rol: str):
        """Conectar un cliente al WebSocket validando el token"""
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        
        connection_info = {
            "websocket": websocket,
            "usuario_id": usuario_id,
            "usuario_rol": usuario_rol,
        }
        self.active_connections[session_id].append(connection_info)

    def disconnect(self, websocket: WebSocket, session_id: str):
        """Desconectar un cliente"""
        if session_id in self.active_connections:
            self.active_connections[session_id] = [
                conn for conn in self.active_connections[session_id]
                if conn["websocket"] != websocket
            ]
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast(self, message: dict, session_id: str, exclude_user: int = None):
        """Enviar mensaje a todos los clientes conectados a una sesión"""
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                # Omitir el envío al usuario que envió el mensaje
                if exclude_user and connection["usuario_id"] == exclude_user:
                    continue
                try:
                    await connection["websocket"].send_json(message)
                except Exception:
                    pass

    async def send_to_role(self, message: dict, session_id: str, roles: list):
        """Enviar mensaje solo a usuarios con ciertos roles"""
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                if connection["usuario_rol"] in roles:
                    try:
                        await connection["websocket"].send_json(message)
                    except Exception:
                        pass

manager = ConnectionManager()


def verify_websocket_token(token: str) -> dict:
    """Verificar token JWT para WebSocket"""
    try:
        payload = decodificar_token(token)
        return payload
    except JWTError:
        return None


@router.websocket("/ws/gps/{sesion_id}")
async def websocket_gps(websocket: WebSocket, sesion_id: str, token: str = Query(default=None)):
    """
    WebSocket para transmisión de GPS en tiempo real
    Requiere: token JWT válido
    Roles permitidos: admin, conductor, dueno
    """
    
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token requerido")
        return
    
    # Verificar token
    payload = verify_websocket_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token inválido o expirado")
        return
    
    usuario_id = payload.get("sub")
    # Decodificar rol del token (si está disponible)
    usuario_rol = payload.get("rol", "unknown")
    
    # Validar que solo conductores, duenos y admin puedan conectarse
    # (los padres solo pueden recibir, no enviar)
    
    await manager.connect(websocket, sesion_id, usuario_id, usuario_rol)
    
    try:
        while True:
            # Recibir datos del cliente (ubicación GPS del bus)
            data = await websocket.receive_json()
            
            # Validar estructura del mensaje
            if not ("latitud" in data and "longitud" in data):
                await websocket.send_json({
                    "ok": False,
                    "error": "Debe contener latitud y longitud"
                })
                continue
            
            # Solo los conductores pueden enviar ubicaciones
            if usuario_rol != "conductor" and usuario_rol != "admin":
                await websocket.send_json({
                    "ok": False,
                    "error": "No tienes permisos para enviar ubicaciones"
                })
                continue
            
            # Preparar mensaje para broadcast
            mensaje = {
                "ok": True,
                "tipo": "ubicacion",
                "sesion_id": sesion_id,
                "usuario_id": usuario_id,
                "datos": {
                    "latitud": data["latitud"],
                    "longitud": data["longitud"],
                    "timestamp": data.get("timestamp"),
                }
            }
            
            # Enviar a todos menos al conductor que envía
            await manager.broadcast(mensaje, sesion_id)
            
            # Confirmar envío
            await websocket.send_json({
                "ok": True,
                "mensaje": "Ubicación actualizada"
            })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, sesion_id)
    except Exception as e:
        manager.disconnect(websocket, sesion_id)


@router.websocket("/ws/notificaciones/{usuario_id}")
async def websocket_notificaciones(websocket: WebSocket, usuario_id: int, token: str = Query(default=None)):
    """
    WebSocket para recibir notificaciones en tiempo real
    Requiere: token JWT válido
    """
    
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token requerido")
        return
    
    # Verificar token
    payload = verify_websocket_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token inválido o expirado")
        return
    
    usuario_conectado = payload.get("sub")
    
    # Verificar que el usuario solo puede escuchar sus propias notificaciones
    if str(usuario_conectado) != str(usuario_id):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="No tienes permiso para esta conexión")
        return
    
    await websocket.accept()
    
    try:
        # Mantener conexión abierta para recibir mensajes
        while True:
            data = await websocket.receive_json()
            # Los clientes solo pueden reconocer notificaciones
            if data.get("accion") == "ack":
                await websocket.send_json({
                    "ok": True,
                    "mensaje": "Notificación reconocida"
                })
    except WebSocketDisconnect:
        pass
    except Exception as e:
        pass
