from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.alumno import Alumno
from app.models.ruta import Ruta
from app.models.usuario import Usuario
from app.routers.auth import obtener_usuario_actual

router = APIRouter(tags=["Alumnos"])


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
	
	resultado = await db.execute(query)
	alumnos = resultado.scalars().all()
	
	alumnos_serializados = [_serializar_alumno(a) for a in alumnos]
	
	return {
		"ok": True,
		"data": alumnos_serializados,
		"mensaje": f"Se encontraron {len(alumnos_serializados)} alumnos",
	}


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
	
	return {
		"ok": True,
		"data": _serializar_alumno(alumno),
		"mensaje": "Alumno obtenido correctamente",
	}
