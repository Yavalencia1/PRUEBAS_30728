from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.recorrido import Recorrido
from app.models.ruta import Ruta, TipoRuta
from app.models.usuario import RolUsuario, Usuario
from app.routers.auth import obtener_usuario_actual
from app.schemas.ruta import RutaCrear

router = APIRouter(tags=["Rutas"])


def _respuesta_estandarizada(datos: object, mensaje: str) -> dict:
	return {
		"ok": True,
		"data": datos,
		"mensaje": mensaje,
	}


def _serializar_ruta(ruta: Ruta) -> dict:
	return {
		"id": ruta.id,
		"recorrido_id": ruta.recorrido_id,
		"recorrido_nombre": ruta.recorrido.nombre if ruta.recorrido else None,
		"nombre": ruta.nombre,
		"descripcion": ruta.descripcion,
		"tipo": ruta.tipo.value if isinstance(ruta.tipo, TipoRuta) else str(ruta.tipo),
	}


async def _obtener_ruta_o_404(db: AsyncSession, ruta_id: int) -> Ruta:
	resultado = await db.execute(
		select(Ruta)
		.options(selectinload(Ruta.recorrido))
		.where(Ruta.id == ruta_id)
	)
	ruta = resultado.scalar_one_or_none()
	if ruta is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ruta no encontrada")
	return ruta


@router.get("/", response_model=dict)
async def listar_rutas(
	recorrido_id: int | None = Query(default=None),
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	if usuario.rol not in (RolUsuario.admin, RolUsuario.dueno):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para listar rutas",
		)

	consulta = select(Ruta).options(selectinload(Ruta.recorrido))
	if usuario.rol == RolUsuario.dueno:
		consulta = consulta.join(Ruta.recorrido).where(Recorrido.dueno_id == usuario.id)
	if recorrido_id is not None:
		consulta = consulta.where(Ruta.recorrido_id == recorrido_id)

	resultado = await db.execute(consulta.order_by(Ruta.id.desc()))
	rutas = resultado.scalars().all()
	return _respuesta_estandarizada(
		[_serializar_ruta(ruta) for ruta in rutas],
		f"Se encontraron {len(rutas)} rutas",
	)


@router.get("/{ruta_id}", response_model=dict)
async def obtener_ruta(
	ruta_id: int,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	ruta = await _obtener_ruta_o_404(db, ruta_id)
	if usuario.rol == RolUsuario.dueno and ruta.recorrido and ruta.recorrido.dueno_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para ver esta ruta",
		)
	return _respuesta_estandarizada(_serializar_ruta(ruta), "Ruta obtenida correctamente")


@router.post("/", response_model=dict)
async def crear_ruta(
	datos: RutaCrear,
	db: AsyncSession = Depends(get_db),
	usuario: Usuario = Depends(obtener_usuario_actual),
) -> dict:
	if usuario.rol not in (RolUsuario.admin, RolUsuario.dueno):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para crear rutas",
		)

	resultado_recorrido = await db.execute(
		select(Recorrido).where(Recorrido.id == datos.recorrido_id)
	)
	recorrido = resultado_recorrido.scalar_one_or_none()
	if recorrido is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recorrido no encontrado")
	if usuario.rol == RolUsuario.dueno and recorrido.dueno_id != usuario.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="No tienes permisos para este recorrido",
		)

	try:
		tipo = TipoRuta(datos.tipo)
	except ValueError as error:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de ruta inválido") from error

	ruta = Ruta(
		recorrido_id=datos.recorrido_id,
		nombre=datos.nombre,
		descripcion=datos.descripcion,
		tipo=tipo,
	)

	db.add(ruta)
	try:
		await db.commit()
	except IntegrityError as error:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo crear la ruta") from error

	ruta_guardada = await _obtener_ruta_o_404(db, ruta.id)
	return _respuesta_estandarizada(_serializar_ruta(ruta_guardada), "Ruta creada correctamente")
