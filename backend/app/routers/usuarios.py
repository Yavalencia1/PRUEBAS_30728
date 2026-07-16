from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import generar_hash_contraseña
from app.models.usuario import RolUsuario, Usuario
from app.routers.auth import obtener_usuario_actual

router = APIRouter(tags=["Usuarios"])


# ── Schemas locales ──────────────────────────────────────────────────────────

class CrearUsuarioRequest(BaseModel):
	nombre: str = Field(min_length=2, max_length=100)
	apellido: str = Field(min_length=2, max_length=100)
	email: EmailStr
	telefono: str | None = Field(default=None, max_length=20)
	rol: str = Field(default="padre")
	password: str = Field(min_length=4, max_length=128)


# ── Helpers ──────────────────────────────────────────────────────────────────

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
		"primer_ingreso": usuario.primer_ingreso,
		"creado_en": usuario.creado_en,
		"placa": usuario.placa,
		"numero_ruta": usuario.numero_ruta,
		"nombre_ruta": usuario.nombre_ruta,
		"fotografia": usuario.fotografia,
	}


# ── Endpoints ────────────────────────────────────────────────────────────────

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


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
	datos: CrearUsuarioRequest,
	db: AsyncSession = Depends(get_db),
	usuario_actual: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Crea un usuario. Solo admin puede usar este endpoint.
	No se permite crear otros administradores desde aquí.
	"""
	if usuario_actual.rol != RolUsuario.admin:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Solo el administrador puede crear usuarios",
		)

	try:
		rol_nuevo = RolUsuario(datos.rol.lower())
	except ValueError as error:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Rol inválido. Valores permitidos: padre, conductor, dueno",
		) from error

	if rol_nuevo == RolUsuario.admin:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No se pueden crear administradores desde este panel",
		)

	nuevo = Usuario(
		nombre=datos.nombre,
		apellido=datos.apellido,
		email=datos.email.lower(),
		telefono=datos.telefono,
		password_hash=generar_hash_contraseña(datos.password),
		rol=rol_nuevo,
		primer_ingreso=True,
	)

	db.add(nuevo)
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail="Este correo ya está registrado",
		) from error

	await db.refresh(nuevo)
	return _respuesta_estandarizada(
		_serializar_usuario(nuevo),
		"Usuario creado correctamente",
	)
@router.delete("/{usuario_id}", response_model=dict)
async def eliminar_usuario(
	usuario_id: int,
	db: AsyncSession = Depends(get_db),
	usuario_actual: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Elimina un usuario por ID. Solo admin puede usar este endpoint.
	No se puede eliminar a uno mismo.
	"""
	if usuario_actual.rol != RolUsuario.admin:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Solo el administrador puede eliminar usuarios",
		)

	if usuario_actual.id == usuario_id:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="No puedes eliminarte a ti mismo",
		)

	resultado = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
	objetivo = resultado.scalar_one_or_none()

	if objetivo is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Usuario no encontrado",
		)

	if objetivo.rol == RolUsuario.admin:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No se puede eliminar a otro administrador",
		)

	await db.delete(objetivo)
	await db.commit()
	return _respuesta_estandarizada(
		{"id": usuario_id},
		"Usuario eliminado correctamente",
	)
