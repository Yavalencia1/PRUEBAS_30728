from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.alumno import Alumno
from app.models.pago import EstadoPago, Pago
from app.models.usuario import RolUsuario, Usuario
from app.routers.auth import obtener_usuario_actual
from app.routers.notificaciones import crear_notificacion
from app.models.notificacion import TipoNotificacion
from app.schemas.pago import PagoCrear

router = APIRouter(tags=["Pagos"])


def _respuesta_estandarizada(datos: object, mensaje: str) -> dict:
	return {
		"ok": True,
		"data": datos,
		"mensaje": mensaje,
	}


def _serializar_pago(pago: Pago) -> dict:
	return {
		"id": pago.id,
		"alumno_id": pago.alumno_id,
		"alumno_nombre": f"{pago.alumno.nombre} {pago.alumno.apellido}" if pago.alumno else None,
		"padre_id": pago.padre_id,
		"padre_nombre": f"{pago.padre.nombre} {pago.padre.apellido}" if pago.padre else None,
		"monto": float(pago.monto),
		"fecha_vencimiento": pago.fecha_vencimiento,
		"fecha_pago": pago.fecha_pago,
		"estado": pago.estado.value if isinstance(pago.estado, EstadoPago) else str(pago.estado),
		"referencia": pago.referencia,
	}


async def _obtener_pago_o_404(db: AsyncSession, pago_id: int) -> Pago:
	resultado = await db.execute(
		select(Pago)
		.options(selectinload(Pago.alumno), selectinload(Pago.padre))
		.where(Pago.id == pago_id)
	)
	pago = resultado.scalar_one_or_none()
	if pago is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")
	return pago


async def _validar_relaciones_pago(db: AsyncSession, alumno_id: int, padre_id: int) -> None:
	resultado_alumno = await db.execute(select(Alumno.id).where(Alumno.id == alumno_id))
	if resultado_alumno.scalar_one_or_none() is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumno no encontrado")

	resultado_padre = await db.execute(select(Usuario.id).where(Usuario.id == padre_id))
	if resultado_padre.scalar_one_or_none() is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Padre no encontrado")


@router.post("/", response_model=dict)
async def crear_pago(datos: PagoCrear, db: AsyncSession = Depends(get_db)) -> dict:
	await _validar_relaciones_pago(db, datos.alumno_id, datos.padre_id)

	try:
		estado_pago = EstadoPago(datos.estado.lower())
	except ValueError as error:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estado de pago inválido") from error

	pago = Pago(
		alumno_id=datos.alumno_id,
		padre_id=datos.padre_id,
		monto=datos.monto,
		fecha_vencimiento=datos.fecha_vencimiento,
		fecha_pago=datos.fecha_pago,
		estado=estado_pago,
		referencia=datos.referencia,
	)

	db.add(pago)
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo crear el pago") from error

	pago_guardado = await _obtener_pago_o_404(db, pago.id)
	return _respuesta_estandarizada(_serializar_pago(pago_guardado), "Pago creado correctamente")


@router.get("/", response_model=dict)
async def listar_pagos(
	db: AsyncSession = Depends(get_db),
	estado: EstadoPago | None = Query(default=None),
	alumno_id: int | None = Query(default=None),
	padre_id: int | None = Query(default=None),
) -> dict:
	consulta = (
		select(Pago)
		.options(selectinload(Pago.alumno), selectinload(Pago.padre))
		.order_by(Pago.id.desc())
	)

	if estado is not None:
		consulta = consulta.where(Pago.estado == estado)
	if alumno_id is not None:
		consulta = consulta.where(Pago.alumno_id == alumno_id)
	if padre_id is not None:
		consulta = consulta.where(Pago.padre_id == padre_id)

	resultado = await db.execute(consulta)
	pagos = resultado.scalars().all()

	return _respuesta_estandarizada(
		[_serializar_pago(pago) for pago in pagos],
		"Pagos obtenidos correctamente",
	)


@router.post("/{pago_id}/marcar-pagado", response_model=dict)
async def marcar_pago_como_pagado(pago_id: int, db: AsyncSession = Depends(get_db)) -> dict:
	pago = await _obtener_pago_o_404(db, pago_id)
	pago.estado = EstadoPago.pagado
	pago.fecha_pago = date.today()

	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo actualizar el pago") from error

	pago_actualizado = await _obtener_pago_o_404(db, pago_id)
	return _respuesta_estandarizada(_serializar_pago(pago_actualizado), "Pago marcado como pagado")


@router.post("/{pago_id}/marcar-no-pagado", response_model=dict)
async def marcar_pago_como_no_pagado(
	pago_id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Marca un pago como no pagado (pendiente). Solo `dueno` o `admin` pueden realizar esta acción.
	"""
	if usuario.rol not in (RolUsuario.dueno, RolUsuario.admin):
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para realizar esta acción")

	pago = await _obtener_pago_o_404(db, pago_id)
	pago.estado = EstadoPago.pendiente
	pago.fecha_pago = None

	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo actualizar el pago") from error

	# Notificar al padre sobre el cambio
	try:
		if pago.padre_id:
			titulo = "Pago revertido"
			mensaje = f"El pago #{pago.id} de {pago.alumno.nombre if pago.alumno else 'alumno'} fue marcado como no pagado"
			await crear_notificacion(db, pago.padre_id, titulo, mensaje, TipoNotificacion.pago)
	except Exception:
		# No bloquear la operación por fallas en notificaciones
		pass

	pago_actualizado = await _obtener_pago_o_404(db, pago_id)
	return _respuesta_estandarizada(_serializar_pago(pago_actualizado), "Pago marcado como no pagado")


@router.delete("/{pago_id}", response_model=dict)
async def eliminar_pago(
	pago_id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Elimina un pago. Solo `dueno` o `admin` pueden eliminar pagos.
	"""
	if usuario.rol not in (RolUsuario.dueno, RolUsuario.admin):
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para eliminar pagos")

	pago = await _obtener_pago_o_404(db, pago_id)

	padre_id = pago.padre_id
	alumno_nombre = pago.alumno.nombre if pago.alumno else None

	await db.delete(pago)
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo eliminar el pago") from error

	# Notificar al padre sobre la eliminación
	try:
		if padre_id is not None:
			titulo = "Pago eliminado"
			mensaje = f"Se eliminó el pago de {alumno_nombre or 'alumno'} (id: {pago_id})"
			await crear_notificacion(db, padre_id, titulo, mensaje, TipoNotificacion.pago)
	except Exception:
		pass

	return _respuesta_estandarizada(None, "Pago eliminado correctamente")


@router.get("/resumen", response_model=dict)
async def resumen_pagos(db: AsyncSession = Depends(get_db)) -> dict:
	resultado = await db.execute(
		select(Pago.estado, func.count(Pago.id), func.coalesce(func.sum(Pago.monto), 0)).group_by(Pago.estado)
	)

	resumen_por_estado = {
		fila[0].value if isinstance(fila[0], EstadoPago) else str(fila[0]): {
			"cantidad": int(fila[1]),
			"total": float(fila[2]),
		}
		for fila in resultado.all()
	}

	return _respuesta_estandarizada(
		{
			"por_estado": resumen_por_estado,
			"total_general": sum(item["total"] for item in resumen_por_estado.values()),
		},
		"Resumen de pagos obtenido correctamente",
	)
