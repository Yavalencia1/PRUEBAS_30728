from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from app.models.usuario import RolUsuario, Usuario
from app.routers.auth import obtener_usuario_actual


def require_roles(*roles: RolUsuario | str) -> Callable:
    roles_normalizados = {RolUsuario(rol) if not isinstance(rol, RolUsuario) else rol for rol in roles}

    async def dependency(usuario: Usuario = Depends(obtener_usuario_actual)) -> Usuario:
        if usuario.rol not in roles_normalizados:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta accion",
            )
        return usuario

    return dependency