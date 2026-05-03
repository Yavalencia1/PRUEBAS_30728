from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.usuario import RolUsuario, Usuario
from app.routers.auth import obtener_usuario_actual

router = APIRouter(tags=["Usuarios"])


def _respuesta_estandarizada(datos: object, mensaje: str) -> dict:
	return {
		"ok": True,
		"data": datos,
		"mensaje": mensaje,
	}


def _serializar_usuario(usuario: Usuario) -> dict:
	return {
		"id": usuario.id,
		"nombre": usuario.nombre,
		"apellido": usuario.apellido,
		"email": usuario.email,
		"telefono": usuario.telefono,
		"rol": usuario.rol.value if isinstance(usuario.rol, RolUsuario) else str(usuario.rol),
		"creado_en": usuario.creado_en,
	}


@router.get("/", response_model=dict)
async def listar_usuarios(
	rol: str | None = Query(default=None),
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Lista usuarios. Solo admin o dueno pueden consultar usuarios.
	Puede filtrar por rol usando ?rol=padre|conductor|dueno|admin.
	"""
	if usuario.rol not in (RolUsuario.admin, RolUsuario.dueno):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para listar usuarios",
		)

	consulta = select(Usuario).order_by(Usuario.id.desc())
	if rol is not None:
		try:
			rol_enum = RolUsuario(rol)
		except ValueError as error:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Rol inválido",
			) from error
		consulta = consulta.where(Usuario.rol == rol_enum)

	resultado = await db.execute(consulta)
	usuarios = resultado.scalars().all()
	return _respuesta_estandarizada(
		[_serializar_usuario(item) for item in usuarios],
		f"Se encontraron {len(usuarios)} usuarios",
	)
