from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.alumno import Alumno
from app.models.parada import Parada
from app.models.recorrido import Recorrido
from app.models.ruta import Ruta
from app.models.sesion_ruta import SesionRuta
from app.models.usuario import RolUsuario, Usuario
from app.routers.auth import obtener_usuario_actual
from app.schemas.parada import ParadaActualizar, ParadaCrear

router = APIRouter(tags=["Paradas"])


def _respuesta_estandarizada(datos: object, mensaje: str) -> dict:
	return {
		"ok": True,
		"data": datos,
		"mensaje": mensaje,
	}


def _serializar_parada(parada: Parada) -> dict:
	return {
		"id": parada.id,
		"ruta_id": parada.ruta_id,
		"ruta_nombre": parada.ruta.nombre if parada.ruta else None,
		"nombre": parada.nombre,
		"latitud": float(parada.latitud),
		"longitud": float(parada.longitud),
		"orden": parada.orden,
	}


async def _obtener_parada_o_404(db: AsyncSession, parada_id: int) -> Parada:
	resultado = await db.execute(
		select(Parada)
		.options(selectinload(Parada.ruta))
		.where(Parada.id == parada_id)
	)
	parada = resultado.scalar_one_or_none()
	if parada is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parada no encontrada")
	return parada


async def _validar_ruta_pertenece_a_dueno(
	db: AsyncSession,
	ruta_id: int,
	usuario: Usuario,
) -> None:
	if usuario.rol != RolUsuario.dueno:
		return
	resultado = await db.execute(
		select(Ruta.id)
		.join(Recorrido, Ruta.recorrido_id == Recorrido.id)
		.where(
			and_(
				Ruta.id == ruta_id,
				Recorrido.dueno_id == usuario.id,
			)
		)
	)
	if resultado.scalar_one_or_none() is None:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para usar esta ruta",
		)


@router.get("/", response_model=dict)
async def listar_paradas(
	ruta_id: int | None = Query(default=None),
	recorrido_id: int | None = Query(default=None),
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	if usuario.rol not in (RolUsuario.admin, RolUsuario.dueno):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para listar paradas",
		)

	consulta = select(Parada).options(selectinload(Parada.ruta))
	if usuario.rol == RolUsuario.dueno or recorrido_id is not None:
		consulta = consulta.join(Parada.ruta).join(Ruta.recorrido)
	if usuario.rol == RolUsuario.dueno:
		consulta = consulta.where(Recorrido.dueno_id == usuario.id)
	if ruta_id is not None:
		consulta = consulta.where(Parada.ruta_id == ruta_id)
	if recorrido_id is not None:
		consulta = consulta.where(Ruta.recorrido_id == recorrido_id)

	resultado = await db.execute(consulta.order_by(Parada.orden.asc()))
	paradas = resultado.scalars().all()
	return _respuesta_estandarizada(
		[_serializar_parada(parada) for parada in paradas],
		f"Se encontraron {len(paradas)} paradas",
	)


@router.get("/{parada_id}", response_model=dict)
async def obtener_parada(
	parada_id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	if usuario.rol not in (RolUsuario.admin, RolUsuario.dueno):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para ver esta parada",
		)
	parada = await _obtener_parada_o_404(db, parada_id)
	await _validar_ruta_pertenece_a_dueno(db, parada.ruta_id, usuario)
	return _respuesta_estandarizada(_serializar_parada(parada), "Parada obtenida correctamente")


@router.post("/", response_model=dict)
async def crear_parada(
	datos: ParadaCrear,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	if usuario.rol not in (RolUsuario.admin, RolUsuario.dueno):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para crear paradas",
		)

	resultado_ruta = await db.execute(select(Ruta).where(Ruta.id == datos.ruta_id))
	ruta = resultado_ruta.scalar_one_or_none()
	if ruta is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ruta no encontrada")
	await _validar_ruta_pertenece_a_dueno(db, datos.ruta_id, usuario)

	parada = Parada(
		ruta_id=datos.ruta_id,
		nombre=datos.nombre,
		latitud=Decimal(str(datos.latitud)),
		longitud=Decimal(str(datos.longitud)),
		orden=datos.orden,
	)

	db.add(parada)
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo crear la parada") from error

	parada_guardada = await _obtener_parada_o_404(db, parada.id)
	return _respuesta_estandarizada(
		_serializar_parada(parada_guardada),
		"Parada creada correctamente",
	)


@router.put("/{parada_id}", response_model=dict)
async def actualizar_parada(
	parada_id: int,
	datos: ParadaActualizar,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	if usuario.rol not in (RolUsuario.admin, RolUsuario.dueno):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para editar paradas",
		)

	parada = await _obtener_parada_o_404(db, parada_id)
	await _validar_ruta_pertenece_a_dueno(db, parada.ruta_id, usuario)

	if datos.nombre is not None:
		parada.nombre = datos.nombre
	if datos.latitud is not None:
		parada.latitud = Decimal(str(datos.latitud))
	if datos.longitud is not None:
		parada.longitud = Decimal(str(datos.longitud))
	if datos.orden is not None:
		parada.orden = datos.orden

	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo actualizar la parada") from error

	parada_actualizada = await _obtener_parada_o_404(db, parada.id)
	return _respuesta_estandarizada(
		_serializar_parada(parada_actualizada),
		"Parada actualizada correctamente",
	)


@router.delete("/{parada_id}", response_model=dict)
async def eliminar_parada(
	parada_id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	if usuario.rol not in (RolUsuario.admin, RolUsuario.dueno):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para eliminar paradas",
		)

	parada = await _obtener_parada_o_404(db, parada_id)
	await _validar_ruta_pertenece_a_dueno(db, parada.ruta_id, usuario)

	await db.delete(parada)
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo eliminar la parada") from error

	return _respuesta_estandarizada(None, "Parada eliminada correctamente")


@router.get("/por-sesion/{sesion_id}", response_model=dict)
async def listar_paradas_por_sesion(
	sesion_id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	resultado = await db.execute(
		select(SesionRuta)
		.options(selectinload(SesionRuta.ruta).selectinload(Ruta.recorrido))
		.where(SesionRuta.id == sesion_id)
	)
	sesion = resultado.scalar_one_or_none()
	if sesion is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")

	if usuario.rol == RolUsuario.conductor:
		if sesion.conductor_id != usuario.id:
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
	elif usuario.rol == RolUsuario.padre:
		resultado_padre = await db.execute(
			select(Alumno.id)
			.where(
				and_(
					Alumno.padre_id == usuario.id,
					Alumno.recorrido_id == sesion.ruta.recorrido_id,
				)
			)
			.limit(1)
		)
		if resultado_padre.scalar_one_or_none() is None:
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
	elif usuario.rol == RolUsuario.dueno:
		if sesion.ruta.recorrido.dueno_id != usuario.id:
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
	elif usuario.rol != RolUsuario.admin:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

	resultado_paradas = await db.execute(
		select(Parada)
		.options(selectinload(Parada.ruta))
		.where(Parada.ruta_id == sesion.ruta_id)
		.order_by(Parada.orden.asc())
	)
	paradas = resultado_paradas.scalars().all()

	return _respuesta_estandarizada(
		[_serializar_parada(parada) for parada in paradas],
		"Paradas obtenidas correctamente",
	)
