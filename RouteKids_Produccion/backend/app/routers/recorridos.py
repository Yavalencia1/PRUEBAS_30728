from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.recorrido import Recorrido
from app.models.usuario import RolUsuario, Usuario
from app.routers.auth import obtener_usuario_actual
from app.schemas.recorrido import RecorridoCrear

router = APIRouter(tags=["Recorridos"])


def _respuesta_estandarizada(datos: object, mensaje: str) -> dict:
	return {
		"ok": True,
		"data": datos,
		"mensaje": mensaje,
	}


def _serializar_recorrido(recorrido: Recorrido) -> dict:
	return {
		"id": recorrido.id,
		"nombre": recorrido.nombre,
		"descripcion": recorrido.descripcion,
		"activo": recorrido.activo,
		"dueno_id": recorrido.dueno_id,
		"dueno_nombre": f"{recorrido.dueno.nombre} {recorrido.dueno.apellido}" if recorrido.dueno else None,
		"creado_en": recorrido.creado_en,
	}


async def _obtener_recorrido_o_404(db: AsyncSession, recorrido_id: int) -> Recorrido:
	resultado = await db.execute(
		select(Recorrido)
		.options(selectinload(Recorrido.dueno))
		.where(Recorrido.id == recorrido_id)
	)
	recorrido = resultado.scalar_one_or_none()
	if recorrido is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recorrido no encontrado")
	return recorrido


@router.get("/", response_model=dict)
async def listar_recorridos(
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
	dueno_id: int | None = Query(default=None),
) -> dict:
	if usuario.rol not in (RolUsuario.admin, RolUsuario.dueno):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para listar recorridos",
		)

	consulta = select(Recorrido).options(selectinload(Recorrido.dueno))
	if usuario.rol == RolUsuario.dueno:
		consulta = consulta.where(Recorrido.dueno_id == usuario.id)
	elif dueno_id is not None:
		consulta = consulta.where(Recorrido.dueno_id == dueno_id)

	consulta = consulta.order_by(Recorrido.creado_en.desc())
	resultado = await db.execute(consulta)
	recorridos = resultado.scalars().all()

	return _respuesta_estandarizada(
		[_serializar_recorrido(item) for item in recorridos],
		f"Se encontraron {len(recorridos)} recorridos",
	)


@router.get("/{recorrido_id}", response_model=dict)
async def obtener_recorrido(
	recorrido_id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	recorrido = await _obtener_recorrido_o_404(db, recorrido_id)
	if usuario.rol == RolUsuario.dueno and recorrido.dueno_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para ver este recorrido",
		)
	return _respuesta_estandarizada(_serializar_recorrido(recorrido), "Recorrido obtenido correctamente")


@router.post("/", response_model=dict)
async def crear_recorrido(
	datos: RecorridoCrear,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	if usuario.rol not in (RolUsuario.admin, RolUsuario.dueno):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para crear recorridos",
		)

	dueno_id = datos.dueno_id
	if usuario.rol == RolUsuario.dueno:
		dueno_id = usuario.id
	else:
		resultado_dueno = await db.execute(
			select(Usuario).where(Usuario.id == dueno_id)
		)
		dueno = resultado_dueno.scalar_one_or_none()
		if dueno is None or dueno.rol != RolUsuario.dueno:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="El dueño indicado no es válido",
			)

	recorrido = Recorrido(
		nombre=datos.nombre,
		descripcion=datos.descripcion,
		activo=datos.activo,
		dueno_id=dueno_id,
	)

	db.add(recorrido)
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="No se pudo crear el recorrido",
		) from error

	recorrido_guardado = await _obtener_recorrido_o_404(db, recorrido.id)
	return _respuesta_estandarizada(
		_serializar_recorrido(recorrido_guardado),
		"Recorrido creado correctamente",
	)
