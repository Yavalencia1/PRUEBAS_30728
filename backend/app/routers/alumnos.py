from __future__ import annotations

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
from app.models.usuario import RolUsuario, Usuario
from app.routers.auth import obtener_usuario_actual
from app.schemas.alumno import AlumnoCrear

router = APIRouter(tags=["Alumnos"])


def _respuesta_estandarizada(datos: object, mensaje: str) -> dict:
	return {
		"ok": True,
		"data": datos,
		"mensaje": mensaje,
	}


def _serializar_alumno(alumno: Alumno) -> dict:
	return {
		"id": alumno.id,
		"nombre": alumno.nombre,
		"apellido": alumno.apellido,
		"padre_id": alumno.padre_id,
		"padre_nombre": f"{alumno.padre.nombre} {alumno.padre.apellido}" if alumno.padre else None,
		"recorrido_id": alumno.recorrido_id,
		"parada_id": alumno.parada_id,
		"parada_nombre": alumno.parada.nombre if alumno.parada else "Sin parada asignada",
		"fecha_nacimiento": alumno.fecha_nacimiento,
		"presente": False,  # Campo para uso en pantalla de conductor
	}


async def _obtener_alumno_o_404(db: AsyncSession, alumno_id: int) -> Alumno:
	resultado = await db.execute(
		select(Alumno)
		.options(
			selectinload(Alumno.padre),
			selectinload(Alumno.parada),
		)
		.where(Alumno.id == alumno_id)
	)
	alumno = resultado.scalar_one_or_none()
	if alumno is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumno no encontrado")
	return alumno


async def _validar_relaciones_alumno(
	db: AsyncSession,
	datos: AlumnoCrear,
	usuario: Usuario,
) -> None:
	resultado_padre = await db.execute(select(Usuario).where(Usuario.id == datos.padre_id))
	padre = resultado_padre.scalar_one_or_none()
	if padre is None or padre.rol != RolUsuario.padre:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Padre no encontrado")

	resultado_recorrido = await db.execute(select(Recorrido).where(Recorrido.id == datos.recorrido_id))
	recorrido = resultado_recorrido.scalar_one_or_none()
	if recorrido is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recorrido no encontrado")
	if usuario.rol == RolUsuario.dueno and recorrido.dueno_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para usar este recorrido",
		)

	if datos.parada_id is not None:
		resultado_parada = await db.execute(
			select(Parada.id)
			.join(Ruta, Parada.ruta_id == Ruta.id)
			.where(
				and_(
					Parada.id == datos.parada_id,
					Ruta.recorrido_id == datos.recorrido_id,
				)
			)
		)
		if resultado_parada.scalar_one_or_none() is None:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Parada no encontrada en el recorrido",
			)


@router.get("/", response_model=dict)
async def listar_alumnos(
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Lista todos los alumnos. El filtrado por recorrido depende del rol del usuario.
	- Padre: solo sus alumnos
	- Conductor/Admin/Dueño: todos los alumnos
	"""
	query = select(Alumno).options(
		selectinload(Alumno.padre),
		selectinload(Alumno.parada),
	)
	
	# Si es padre, filtrar por sus alumnos
	if usuario.rol.value == "padre":
		query = query.where(Alumno.padre_id == usuario.id)
	elif usuario.rol.value == "dueno":
		query = query.join(Recorrido).where(Recorrido.dueno_id == usuario.id)
	
	resultado = await db.execute(query)
	alumnos = resultado.scalars().all()
	
	alumnos_serializados = [_serializar_alumno(a) for a in alumnos]
	
	return _respuesta_estandarizada(
		alumnos_serializados,
		f"Se encontraron {len(alumnos_serializados)} alumnos",
	)


@router.get("/por-recorrido/{recorrido_id}", response_model=dict)
async def listar_alumnos_por_recorrido(
	recorrido_id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""
	Lista alumnos de un recorrido específico.
	Útil para conductor que necesita alumnos de su ruta.
	"""
	resultado = await db.execute(
		select(Alumno)
		.options(
			selectinload(Alumno.padre),
			selectinload(Alumno.parada),
		)
		.where(Alumno.recorrido_id == recorrido_id)
	)
	alumnos = resultado.scalars().all()
	
	alumnos_serializados = [_serializar_alumno(a) for a in alumnos]
	
	return {
		"ok": True,
		"data": alumnos_serializados,
		"mensaje": f"Se encontraron {len(alumnos_serializados)} alumnos en el recorrido",
	}


@router.get("/{id}", response_model=dict)
async def obtener_alumno(
	id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	"""Obtiene los detalles de un alumno específico."""
	resultado = await db.execute(
		select(Alumno)
		.options(
			selectinload(Alumno.padre),
			selectinload(Alumno.parada),
		)
		.where(Alumno.id == id)
	)
	alumno = resultado.scalar_one_or_none()
	
	if alumno is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumno no encontrado")
	
	# Si es padre, verificar que es su alumno
	if usuario.rol.value == "padre" and alumno.padre_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para ver este alumno",
		)
	
	return _respuesta_estandarizada(
		_serializar_alumno(alumno),
		"Alumno obtenido correctamente",
	)


@router.post("/", response_model=dict)
async def crear_alumno(
	datos: AlumnoCrear,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	if usuario.rol not in (RolUsuario.admin, RolUsuario.dueno):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para crear alumnos",
		)

	await _validar_relaciones_alumno(db, datos, usuario)

	alumno = Alumno(
		nombre=datos.nombre,
		apellido=datos.apellido,
		padre_id=datos.padre_id,
		recorrido_id=datos.recorrido_id,
		parada_id=datos.parada_id,
		fecha_nacimiento=datos.fecha_nacimiento,
	)

	db.add(alumno)
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="No se pudo crear el alumno",
		) from error

	alumno_guardado = await _obtener_alumno_o_404(db, alumno.id)
	return _respuesta_estandarizada(
		_serializar_alumno(alumno_guardado),
		"Alumno creado correctamente",
	)
