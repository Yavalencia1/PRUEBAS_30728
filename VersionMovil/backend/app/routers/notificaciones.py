from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.notificacion import Notificacion, TipoNotificacion
from app.models.usuario import Usuario
from app.routers.auth import obtener_usuario_actual

router = APIRouter(tags=["Notificaciones"])


def _respuesta_estandarizada(datos: object, mensaje: str) -> dict:
	return {
		"ok": True,
		"data": datos,
		"mensaje": mensaje,
	}


def _serializar_notificacion(notificacion: Notificacion) -> dict:
	return {
		"id": notificacion.id,
		"usuario_id": notificacion.usuario_id,
		"titulo": notificacion.titulo,
		"mensaje": notificacion.mensaje,
		"tipo": notificacion.tipo.value,
		"leida": notificacion.leida,
		"creado_en": notificacion.creado_en,
	}


@router.get("/", response_model=dict)
async def listar_notificaciones(
	leida: bool | None = Query(None, description="Filtrar por estado de lectura (None = todas)"),
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Obtiene todas las notificaciones del usuario logueado.
	Opcionalmente filtrar por estado de lectura.
	"""
	query = select(Notificacion).where(Notificacion.usuario_id == usuario.id)
	
	if leida is not None:
		query = query.where(Notificacion.leida == leida)
	
	query = query.order_by(Notificacion.creado_en.desc(), Notificacion.id.desc())
	
	resultado = await db.execute(query)
	notificaciones = resultado.scalars().all()
	
	return _respuesta_estandarizada(
		[_serializar_notificacion(n) for n in notificaciones],
		f"Se encontraron {len(notificaciones)} notificaciones",
	)


@router.get("/sin-leer", response_model=dict)
async def contar_sin_leer(
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Obtiene el conteo de notificaciones sin leer del usuario logueado.
	"""
	resultado = await db.execute(
		select(Notificacion).where(
			and_(
				Notificacion.usuario_id == usuario.id,
				Notificacion.leida == False,
			)
		)
	)
	sin_leer = len(resultado.scalars().all())
	
	return _respuesta_estandarizada(
		{"sin_leer": sin_leer},
		f"Tienes {sin_leer} notificaciones sin leer",
	)


@router.post("/{notificacion_id}/marcar-leida", response_model=dict)
async def marcar_leida(
	notificacion_id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Marca una notificación como leída.
	"""
	resultado = await db.execute(
		select(Notificacion).where(Notificacion.id == notificacion_id)
	)
	notificacion = resultado.scalar_one_or_none()
	
	if notificacion is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Notificación no encontrada",
		)
	
	if notificacion.usuario_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permiso para marcar esta notificación",
		)
	
	notificacion.leida = True
	
	await db.commit()
	
	return _respuesta_estandarizada(
		_serializar_notificacion(notificacion),
		"Notificación marcada como leída",
	)


@router.delete("/{notificacion_id}", response_model=dict)
async def eliminar_notificacion(
	notificacion_id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Elimina una notificación.
	"""
	resultado = await db.execute(
		select(Notificacion).where(Notificacion.id == notificacion_id)
	)
	notificacion = resultado.scalar_one_or_none()
	
	if notificacion is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Notificación no encontrada",
		)
	
	if notificacion.usuario_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permiso para eliminar esta notificación",
		)
	
	await db.delete(notificacion)
	await db.commit()
	
	return _respuesta_estandarizada(
		None,
		"Notificación eliminada correctamente",
	)


# Funciones auxiliares para crear notificaciones (internas)
async def crear_notificacion(
	db: AsyncSession,
	usuario_id: int,
	titulo: str,
	mensaje: str,
	tipo: TipoNotificacion = TipoNotificacion.alerta,
) -> Notificacion:
	"""
	Crea una nueva notificación para un usuario.
	Función auxiliar interna para ser llamada desde otros routers.
	"""
	notificacion = Notificacion(
		usuario_id=usuario_id,
		titulo=titulo,
		mensaje=mensaje,
		tipo=tipo,
		leida=False,
	)
	db.add(notificacion)
	await db.commit()
	await db.refresh(notificacion)
	return notificacion

