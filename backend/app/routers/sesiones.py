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
from app.models.ruta import Ruta
from app.models.recorrido import Recorrido
from app.models.sesion_ruta import EstadoSesionRuta, SesionRuta
from app.models.usuario import Usuario
from app.routers.auth import obtener_usuario_actual
from app.routers.notificaciones import crear_notificacion
from app.schemas.sesion_ruta import SesionRutaCrear

router = APIRouter(tags=["Sesiones"])


def _respuesta_estandarizada(datos: object, mensaje: str) -> dict:
	return {
		"ok": True,
		"data": datos,
		"mensaje": mensaje,
	}


def _serializar_sesion(sesion: SesionRuta) -> dict:
	return {
		"id": sesion.id,
		"ruta_id": sesion.ruta_id,
		"ruta_nombre": sesion.ruta.nombre if sesion.ruta else None,
		"conductor_id": sesion.conductor_id,
		"conductor_nombre": f"{sesion.conductor.nombre} {sesion.conductor.apellido}" if sesion.conductor else None,
		"inicio": sesion.inicio,
		"fin": sesion.fin,
		"estado": sesion.estado.value if isinstance(sesion.estado, EstadoSesionRuta) else str(sesion.estado),
	}


def _serializar_historial_sesion(sesion: SesionRuta, padre_id: int | None = None) -> dict:
	asistencias_por_alumno = {asistencia.alumno_id: asistencia for asistencia in sesion.asistencias}
	alumnos_asignados = list(sesion.ruta.recorrido.alumnos) if sesion.ruta and sesion.ruta.recorrido else []
	# Si se pasa padre_id, filtrar los alumnos a los que pertenece ese padre
	if padre_id is not None:
		alumnos_asignados = [a for a in alumnos_asignados if a.padre_id == padre_id]
	ids_alumnos_asignados = {alumno.id for alumno in alumnos_asignados}
	alumnos_ruta = []
	presentes = 0
	ausentes = 0

	for alumno in alumnos_asignados:
		asistencia = asistencias_por_alumno.get(alumno.id)
		if asistencia is None:
			ausentes += 1
			alumnos_ruta.append({
				"id": None,
				"alumno_id": alumno.id,
				"alumno_nombre": f"{alumno.nombre} {alumno.apellido}",
				"hora_subida": None,
				"hora_bajada": None,
				"estado": EstadoAsistencia.ausente.value,
			})
			continue

		estado = asistencia.estado.value if isinstance(asistencia.estado, EstadoAsistencia) else str(asistencia.estado)
		if asistencia.hora_subida is not None and estado != EstadoAsistencia.ausente.value:
			presentes += 1
		else:
			ausentes += 1
		alumnos_ruta.append({
			"id": asistencia.id,
			"alumno_id": alumno.id,
			"alumno_nombre": f"{alumno.nombre} {alumno.apellido}",
			"hora_subida": asistencia.hora_subida,
			"hora_bajada": asistencia.hora_bajada,
			"estado": estado,
		})

	horas_subida = [
		asistencia.hora_subida
		for alumno_id, asistencia in asistencias_por_alumno.items()
		if alumno_id in ids_alumnos_asignados and asistencia.hora_subida is not None
	]
	horas_bajada = [
		asistencia.hora_bajada
		for alumno_id, asistencia in asistencias_por_alumno.items()
		if alumno_id in ids_alumnos_asignados and asistencia.hora_bajada is not None
	]
	hora_inicio = min(horas_subida) if horas_subida else sesion.inicio
	hora_fin = max(horas_bajada) if horas_bajada else sesion.fin
	return {
		"id": sesion.id,
		"ruta_id": sesion.ruta_id,
		"ruta_nombre": sesion.ruta.nombre if sesion.ruta else None,
		"conductor_id": sesion.conductor_id,
		"conductor_nombre": f"{sesion.conductor.nombre} {sesion.conductor.apellido}" if sesion.conductor else None,
		"inicio": sesion.inicio,
		"fin": sesion.fin,
		"hora_inicio": hora_inicio,
		"hora_fin": hora_fin,
		"estado": sesion.estado.value if isinstance(sesion.estado, EstadoSesionRuta) else str(sesion.estado),
		"total_presentes": presentes,
		"total_ausentes": ausentes,
		"asistencias": alumnos_ruta,
	}


async def _obtener_sesion_o_404(db: AsyncSession, sesion_id: int) -> SesionRuta:
	resultado = await db.execute(
		select(SesionRuta)
		.options(
			selectinload(SesionRuta.ruta).selectinload(Ruta.recorrido).selectinload(Recorrido.alumnos),
			selectinload(SesionRuta.conductor),
			selectinload(SesionRuta.asistencias),
		)
		.where(SesionRuta.id == sesion_id)
	)
	sesion = resultado.scalar_one_or_none()
	if sesion is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")
	return sesion


async def _validar_ruta_existe(db: AsyncSession, ruta_id: int) -> None:
	resultado = await db.execute(select(Ruta.id).where(Ruta.id == ruta_id))
	if resultado.scalar_one_or_none() is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ruta no encontrada")


async def _notificar_padres_ruta(
	db: AsyncSession,
	sesion: SesionRuta,
	titulo: str,
	mensaje: str,
) -> None:
	if not sesion.ruta or not sesion.ruta.recorrido:
		return

	padres_notificados: set[int] = set()
	for alumno in sesion.ruta.recorrido.alumnos or []:
		if alumno.padre_id and alumno.padre_id not in padres_notificados:
			await crear_notificacion(
				db=db,
				usuario_id=alumno.padre_id,
				titulo=titulo,
				mensaje=mensaje,
				tipo=TipoNotificacion.alerta,
			)
			padres_notificados.add(alumno.padre_id)


@router.post("/", response_model=dict)
async def crear_sesion(
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Crea una nueva sesión de ruta. Solo conductores pueden crear sesiones.
	El conductor debe proporcionar la ruta en headers o se usa su ruta asignada.
	"""
	if usuario.rol.value != "conductor":
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Solo conductores pueden crear sesiones",
		)
	
	# Por ahora, buscamos la primera ruta disponible del sistema
	# En producción, el conductor tendrá una ruta asignada
	resultado = await db.execute(select(Ruta).limit(1))
	ruta = resultado.scalar_one_or_none()
	
	if ruta is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="No hay rutas disponibles en el sistema",
		)
	
	# Verificar que no exista una sesión activa para este conductor
	resultado_activa = await db.execute(
		select(SesionRuta).where(
			and_(
				SesionRuta.conductor_id == usuario.id,
				SesionRuta.estado == EstadoSesionRuta.en_curso,
			)
		)
	)
	if resultado_activa.scalar_one_or_none() is not None:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Ya tienes una sesión en curso. Termínala antes de crear una nueva.",
		)
	
	# Crear nueva sesión
	sesion = SesionRuta(
		ruta_id=ruta.id,
		conductor_id=usuario.id,
		inicio=datetime.utcnow(),
		estado=EstadoSesionRuta.en_curso,
	)
	
	db.add(sesion)
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="No se pudo crear la sesión",
		) from error
	
	sesion_guardada = await _obtener_sesion_o_404(db, sesion.id)
	await _notificar_padres_ruta(
		db=db,
		sesion=sesion_guardada,
		titulo="El bus ha iniciado la ruta",
		mensaje=f"La ruta {sesion_guardada.ruta.nombre} ha comenzado" if sesion_guardada.ruta else "El bus ha iniciado la ruta",
	)
	return _respuesta_estandarizada(
		_serializar_sesion(sesion_guardada),
		"Sesión creada correctamente",
	)


@router.get("/activa", response_model=dict)
async def obtener_sesion_activa(
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Obtiene la sesión en curso del conductor actual.
	Solo funciona para conductores.
	"""
	if usuario.rol.value != "conductor":
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Solo conductores pueden consultar sesiones activas",
		)
	
	resultado = await db.execute(
		select(SesionRuta)
		.options(selectinload(SesionRuta.ruta), selectinload(SesionRuta.conductor))
		.where(
			and_(
				SesionRuta.conductor_id == usuario.id,
				SesionRuta.estado == EstadoSesionRuta.en_curso,
			)
		)
	)
	sesion = resultado.scalar_one_or_none()
	
	if sesion is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="No hay sesión activa para este conductor",
		)
	
	return _respuesta_estandarizada(_serializar_sesion(sesion), "Sesión activa obtenida correctamente")


@router.get("/historial", response_model=dict)
async def obtener_historial_sesiones(
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Obtiene el historial de sesiones completadas agrupado por sesión.
	El conductor ve sus propias sesiones; admin y dueño pueden ver todas.
	"""
	# Base query for completed sessions
	consulta = (
		select(SesionRuta)
		.options(
			selectinload(SesionRuta.ruta).selectinload(Ruta.recorrido).selectinload(Recorrido.alumnos),
			selectinload(SesionRuta.conductor),
			selectinload(SesionRuta.asistencias).selectinload(Asistencia.alumno),
		)
		.where(SesionRuta.estado == EstadoSesionRuta.completada)
		.order_by(SesionRuta.fin.desc())
	)

	# Conductors see only their sessions
	if usuario.rol.value == "conductor":
		consulta = consulta.where(SesionRuta.conductor_id == usuario.id)

	# Padres should only see sessions that include at least one of their children
	if usuario.rol.value == "padre":
		# join through ruta -> recorrido -> alumnos and filter by alumno.padre_id
		consulta = (
			select(SesionRuta)
			.join(SesionRuta.ruta)
			.join(Ruta.recorrido)
			.join(Recorrido.alumnos)
			.options(
				selectinload(SesionRuta.ruta).selectinload(Ruta.recorrido).selectinload(Recorrido.alumnos),
				selectinload(SesionRuta.conductor),
				selectinload(SesionRuta.asistencias).selectinload(Asistencia.alumno),
			)
			.where(
				and_(
					SesionRuta.estado == EstadoSesionRuta.completada,
					Alumno.padre_id == usuario.id,
				)
			)
			.order_by(SesionRuta.fin.desc())
			.distinct()
		)

	resultado = await db.execute(
		consulta
	)
	sesiones = resultado.scalars().all()
	
	# Serializar sesiones teniendo en cuenta padre (si aplica)
	if usuario.rol.value == "padre":
		sesiones_serializadas = [_serializar_historial_sesion(s, padre_id=usuario.id) for s in sesiones]
	else:
		sesiones_serializadas = [_serializar_historial_sesion(s) for s in sesiones]

	return _respuesta_estandarizada(
		sesiones_serializadas,
		f"Se encontraron {len(sesiones_serializadas)} sesiones completadas",
	)


@router.get("/{id}", response_model=dict)
async def obtener_sesion(
	id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""Obtiene los detalles de una sesión específica."""
	sesion = await _obtener_sesion_o_404(db, id)
	
	# Si es conductor, solo puede ver sus propias sesiones
	if usuario.rol.value == "conductor" and sesion.conductor_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Solo puedes ver tus propias sesiones",
		)
	
	return _respuesta_estandarizada(_serializar_sesion(sesion), "Sesión obtenida correctamente")


@router.patch("/{id}/terminar", response_model=dict)
async def terminar_sesion(
	id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Termina una sesión de ruta. Solo el conductor de la sesión puede terminarla.
	"""
	sesion = await _obtener_sesion_o_404(db, id)
	
	# Verificar que es el conductor de la sesión
	if sesion.conductor_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Solo el conductor de la sesión puede terminarla",
		)
	
	# Verificar que la sesión está en curso
	if sesion.estado != EstadoSesionRuta.en_curso:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"La sesión no está en curso. Estado actual: {sesion.estado.value}",
		)

	# Crear asistencias ausentes para alumnos que no marcaron subida.
	alumnos_asignados = []
	if sesion.ruta and sesion.ruta.recorrido:
		alumnos_asignados = list(sesion.ruta.recorrido.alumnos)

	resultado_asistencias = await db.execute(
		select(Asistencia.alumno_id).where(Asistencia.sesion_id == sesion.id)
	)
	alumnos_con_asistencia = {fila[0] for fila in resultado_asistencias.all()}
	for alumno in alumnos_asignados:
		if alumno.id not in alumnos_con_asistencia:
			db.add(
				Asistencia(
					sesion_id=sesion.id,
					alumno_id=alumno.id,
					hora_subida=None,
					hora_bajada=None,
					estado=EstadoAsistencia.ausente,
				)
			)

	# Si el conductor olvidó marcar bajada, cerrar automáticamente las asistencias
	# que quedaron con subida abierta para que el historial no quede incompleto.
	momento_cierre = datetime.utcnow()
	resultado_abiertas = await db.execute(
		select(Asistencia).where(
			and_(
				Asistencia.sesion_id == sesion.id,
				Asistencia.hora_subida.is_not(None),
				Asistencia.hora_bajada.is_(None),
				Asistencia.estado != EstadoAsistencia.ausente,
			)
		)
	)
	for asistencia_abierta in resultado_abiertas.scalars().all():
		asistencia_abierta.hora_bajada = momento_cierre
	
	# Actualizar sesión
	sesion.estado = EstadoSesionRuta.completada
	sesion.fin = momento_cierre
	
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="No se pudo terminar la sesión",
		) from error
	
	await _notificar_padres_ruta(
		db=db,
		sesion=sesion,
		titulo="El bus ha finalizado la ruta",
		mensaje=f"La ruta {sesion.ruta.nombre} ha terminado" if sesion.ruta else "El bus ha finalizado la ruta",
	)
	
	sesion_actualizada = await _obtener_sesion_o_404(db, id)
	return _respuesta_estandarizada(
		_serializar_sesion(sesion_actualizada),
		"Sesión terminada correctamente",
	)


@router.delete("/{id}", response_model=dict)
async def eliminar_sesion(
	id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""Elimina una sesión y sus asistencias asociadas."""
	sesion = await _obtener_sesion_o_404(db, id)

	# Solo administradores (rol 'admin') pueden eliminar sesiones.
	# Esto evita que conductores, padres o dueños borren historiales por error.
	if usuario.rol.value != "admin":
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Solo administradores pueden eliminar sesiones",
		)

	await db.delete(sesion)
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="No se pudo eliminar la sesión",
		) from error
	return _respuesta_estandarizada({}, "Sesión eliminada correctamente")
