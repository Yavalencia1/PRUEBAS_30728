from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.alumno import Alumno
from app.models.asistencia import Asistencia, EstadoAsistencia
from app.models.notificacion import TipoNotificacion
from app.models.sesion_ruta import EstadoSesionRuta, SesionRuta
from app.models.usuario import Usuario
from app.routers.auth import obtener_usuario_actual
from app.routers.notificaciones import crear_notificacion
from app.schemas.asistencia import AsistenciaActualizar, AsistenciaCrear

router = APIRouter(tags=["Asistencias"])


def _respuesta_estandarizada(datos: object, mensaje: str) -> dict:
	return {
		"ok": True,
		"data": datos,
		"mensaje": mensaje,
	}


def _serializar_asistencia(asistencia: Asistencia) -> dict:
	return {
		"id": asistencia.id,
		"sesion_id": asistencia.sesion_id,
		"alumno_id": asistencia.alumno_id,
		"alumno_nombre": f"{asistencia.alumno.nombre} {asistencia.alumno.apellido}" if asistencia.alumno else None,
		"hora_subida": asistencia.hora_subida,
		"hora_bajada": asistencia.hora_bajada,
		"estado": asistencia.estado.value if isinstance(asistencia.estado, EstadoAsistencia) else str(asistencia.estado),
	}


async def _obtener_asistencia_o_404(db: AsyncSession, asistencia_id: int) -> Asistencia:
	resultado = await db.execute(
		select(Asistencia)
		.options(selectinload(Asistencia.alumno), selectinload(Asistencia.sesion))
		.where(Asistencia.id == asistencia_id)
	)
	asistencia = resultado.scalar_one_or_none()
	if asistencia is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asistencia no encontrada")
	return asistencia


async def _obtener_sesion_o_404(db: AsyncSession, sesion_id: int) -> SesionRuta:
	resultado = await db.execute(
		select(SesionRuta)
		.options(selectinload(SesionRuta.ruta))
		.where(SesionRuta.id == sesion_id)
	)
	sesion = resultado.scalar_one_or_none()
	if sesion is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")
	return sesion


async def _obtener_alumno_o_404(db: AsyncSession, alumno_id: int) -> Alumno:
	resultado = await db.execute(select(Alumno).where(Alumno.id == alumno_id))
	alumno = resultado.scalar_one_or_none()
	if alumno is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumno no encontrado")
	return alumno


async def _obtener_asistencia_evento(
	db: AsyncSession,
	sesion_id: int,
	alumno_id: int,
) -> Asistencia | None:
	resultado = await db.execute(
		select(Asistencia)
		.options(selectinload(Asistencia.alumno), selectinload(Asistencia.sesion))
		.where(
			and_(
				Asistencia.sesion_id == sesion_id,
				Asistencia.alumno_id == alumno_id,
			)
		)
		.with_for_update()
	)
	return resultado.scalar_one_or_none()


@router.post("/subida", response_model=dict)
async def marcar_subida(
	sesion_id: int = Query(..., description="ID de la sesión activa"),
	alumno_id: int = Query(..., description="ID del alumno"),
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Marca la subida de un alumno al bus (registra hora_subida, estado = presente).
	Solo el conductor de la sesión puede marcar asistencias.
	"""
	# Validar que la sesión existe y está en curso
	sesion = await _obtener_sesion_o_404(db, sesion_id)
	
	if sesion.estado != EstadoSesionRuta.en_curso:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"La sesión no está en curso. Estado actual: {sesion.estado.value}",
		)
	
	# Validar que es el conductor de la sesión
	if sesion.conductor_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Solo el conductor de la sesión puede marcar asistencias",
		)
	
	# Validar que el alumno existe
	await _obtener_alumno_o_404(db, alumno_id)
	
	# Buscar y bloquear la fila para evitar duplicados por reintentos concurrentes
	asistencia = await _obtener_asistencia_evento(db, sesion_id, alumno_id)
	evento_creado = False
	
	if asistencia is None:
		# Crear nueva asistencia con hora_subida
		asistencia = Asistencia(
			sesion_id=sesion_id,
			alumno_id=alumno_id,
			hora_subida=datetime.utcnow(),
			estado=EstadoAsistencia.presente,
		)
		db.add(asistencia)
		evento_creado = True
	elif asistencia.hora_subida is None:
		# Primera subida real para una asistencia ya creada.
		asistencia.hora_subida = datetime.utcnow()
		asistencia.estado = EstadoAsistencia.presente
		evento_creado = True
	else:
		# Idempotencia: si ya se marcó la subida, devolvemos el estado actual sin repetir evento.
		return _respuesta_estandarizada(
			_serializar_asistencia(asistencia),
			"Subida ya estaba marcada",
		)
	
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="No se pudo marcar la subida",
		) from error
	
	asistencia_guardada = await _obtener_asistencia_o_404(db, asistencia.id)
	
	# Crear notificación solo cuando ocurrió la transición real.
	if evento_creado and asistencia_guardada.alumno and asistencia_guardada.alumno.padre_id:
		await crear_notificacion(
			db=db,
			usuario_id=asistencia_guardada.alumno.padre_id,
			titulo="Alumno ha subido al bus",
			mensaje=f"{asistencia_guardada.alumno.nombre} ha subido al bus",
			tipo=TipoNotificacion.llegada,
		)
	
	return _respuesta_estandarizada(
		_serializar_asistencia(asistencia_guardada),
		"Subida marcada correctamente",
	)


@router.post("/bajada", response_model=dict)
async def marcar_bajada(
	sesion_id: int = Query(..., description="ID de la sesión activa"),
	alumno_id: int = Query(..., description="ID del alumno"),
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Marca la bajada de un alumno del bus (registra hora_bajada).
	Solo el conductor de la sesión puede marcar asistencias.
	"""
	# Validar que la sesión existe y está en curso
	sesion = await _obtener_sesion_o_404(db, sesion_id)
	
	if sesion.estado != EstadoSesionRuta.en_curso:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"La sesión no está en curso. Estado actual: {sesion.estado.value}",
		)
	
	# Validar que es el conductor de la sesión
	if sesion.conductor_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Solo el conductor de la sesión puede marcar asistencias",
		)
	
	# Validar que el alumno existe
	await _obtener_alumno_o_404(db, alumno_id)
	
	# Buscar y bloquear la fila para evitar duplicados por reintentos concurrentes
	asistencia = await _obtener_asistencia_evento(db, sesion_id, alumno_id)
	
	if asistencia is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="No existe registro de subida para este alumno. Debe marcar subida primero.",
		)

	if asistencia.hora_bajada is not None:
		# Idempotencia: si ya se marcó la bajada, devolvemos el estado actual sin repetir evento.
		return _respuesta_estandarizada(
			_serializar_asistencia(asistencia),
			"Bajada ya estaba marcada",
		)
	
	# Actualizar hora_bajada
	asistencia.hora_bajada = datetime.utcnow()
	
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="No se pudo marcar la bajada",
		) from error
	
	asistencia_guardada = await _obtener_asistencia_o_404(db, asistencia.id)
	
	# Crear notificación solo cuando ocurrió la transición real.
	if asistencia_guardada.alumno and asistencia_guardada.alumno.padre_id:
		await crear_notificacion(
			db=db,
			usuario_id=asistencia_guardada.alumno.padre_id,
			titulo="Alumno ha bajado del bus",
			mensaje=f"{asistencia_guardada.alumno.nombre} ha bajado del bus",
			tipo=TipoNotificacion.salida,
		)
	
	return _respuesta_estandarizada(
		_serializar_asistencia(asistencia_guardada),
		"Bajada marcada correctamente",
	)


@router.get("/sesion/{sesion_id}", response_model=dict)
async def listar_asistencias_por_sesion(
	sesion_id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Lista todas las asistencias registradas en una sesión.
	El conductor solo puede ver asistencias de sus propias sesiones.
	"""
	# Validar que la sesión existe
	sesion = await _obtener_sesion_o_404(db, sesion_id)
	
	# Si es conductor, verificar que es su sesión
	if usuario.rol.value == "conductor" and sesion.conductor_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Solo puedes ver asistencias de tus propias sesiones",
		)

	# Si es padre, solo devolver las asistencias correspondientes a sus hijos
	if usuario.rol.value == "padre":
		resultado = await db.execute(
			select(Asistencia)
			.join(Asistencia.alumno)
			.options(selectinload(Asistencia.alumno))
			.where(
				and_(
					Asistencia.sesion_id == sesion_id,
					Alumno.padre_id == usuario.id,
				)
			)
			.order_by(Asistencia.id)
		)
		asistencias = resultado.scalars().all()
	else:
		# Obtener todas las asistencias de esta sesión (admin, dueno, conductor)
		resultado = await db.execute(
			select(Asistencia)
			.options(selectinload(Asistencia.alumno))
			.where(Asistencia.sesion_id == sesion_id)
			.order_by(Asistencia.id)
		)
		asistencias = resultado.scalars().all()
	
	asistencias_serializadas = [_serializar_asistencia(a) for a in asistencias]
	
	return _respuesta_estandarizada(
		asistencias_serializadas,
		f"Se encontraron {len(asistencias_serializadas)} registros de asistencia",
	)


@router.get("/{id}", response_model=dict)
async def obtener_asistencia(
	id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""Obtiene los detalles de una asistencia específica."""
	asistencia = await _obtener_asistencia_o_404(db, id)
	
	# Si es conductor, verificar que puede ver esta asistencia (sesión propia)
	if usuario.rol.value == "conductor" and asistencia.sesion.conductor_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para ver esta asistencia",
		)
	
	return _respuesta_estandarizada(_serializar_asistencia(asistencia), "Asistencia obtenida correctamente")


@router.patch("/{id}", response_model=dict)
async def actualizar_asistencia(
	id: int,
	datos: AsistenciaActualizar,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Actualiza los detalles de una asistencia (estado, horas).
	Solo se permite durante la sesión en curso.
	"""
	asistencia = await _obtener_asistencia_o_404(db, id)
	
	# Validar que la sesión aún está en curso
	if asistencia.sesion.estado != EstadoSesionRuta.en_curso:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="No se puede modificar asistencias de sesiones que ya terminaron",
		)
	
	# Si es conductor, verificar que es su sesión
	if usuario.rol.value == "conductor" and asistencia.sesion.conductor_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Solo el conductor de la sesión puede modificar asistencias",
		)
	
	# Actualizar solo los campos que vienen en el request
	if datos.hora_subida is not None:
		asistencia.hora_subida = datos.hora_subida
	
	if datos.hora_bajada is not None:
		asistencia.hora_bajada = datos.hora_bajada
	
	if datos.estado is not None:
		try:
			asistencia.estado = EstadoAsistencia(datos.estado.lower())
		except ValueError as error:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Estado de asistencia inválido. Valores válidos: presente, ausente, tarde",
			) from error
	
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="No se pudo actualizar la asistencia",
		) from error
	
	asistencia_actualizada = await _obtener_asistencia_o_404(db, id)
	return _respuesta_estandarizada(
		_serializar_asistencia(asistencia_actualizada),
		"Asistencia actualizada correctamente",
	)
