from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.responses import respuesta_ok, respuesta_paginada
from app.models.alumno import Alumno
from app.models.recorrido import Recorrido
from app.models.usuario import RolUsuario, Usuario
from app.schemas.recorrido import RecorridoCrear, RecorridoLectura

router = APIRouter(tags=["Recorridos"])


@router.get("/")
async def listar_recorridos(
	db: AsyncSession = Depends(get_db),
	usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.padre)),
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=20, ge=1, le=100),
	activo: bool | None = Query(default=None),
	q: str | None = Query(default=None, min_length=1, max_length=100),
) -> dict:
	filtros = []
	if usuario_actual.rol == RolUsuario.padre:
		subquery_alumnos = select(Alumno.recorrido_id).where(Alumno.padre_id == usuario_actual.id)
		filtros.append(Recorrido.id.in_(subquery_alumnos))
	if activo is not None:
		filtros.append(Recorrido.activo == activo)
	if q:
		patron = f"%{q.strip()}%"
		filtros.append(
			or_(
				Recorrido.nombre.ilike(patron),
				Recorrido.descripcion.ilike(patron),
			)
		)

	base_query = select(Recorrido).where(*filtros)
	total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
	total = total_result.scalar_one()

	resultado = await db.execute(
		base_query.order_by(Recorrido.id.desc()).offset((page - 1) * page_size).limit(page_size)
	)
	recorridos = resultado.scalars().all()
	items = [RecorridoLectura.model_validate(recorrido).model_dump() for recorrido in recorridos]

	return respuesta_paginada(
		items,
		pagina=page,
		tamano=page_size,
		total=total,
		mensaje="Recorridos obtenidos correctamente",
	)


@router.post("/")
async def crear_recorrido(
	datos: RecorridoCrear,
	db: AsyncSession = Depends(get_db),
	usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
) -> dict:
	dueno_id = usuario_actual.id if usuario_actual.rol == RolUsuario.dueno else datos.dueno_id

	recorrido = Recorrido(
		nombre=datos.nombre,
		descripcion=datos.descripcion,
		activo=datos.activo,
		dueno_id=dueno_id,
	)
	db.add(recorrido)
	await db.commit()
	await db.refresh(recorrido)
	return respuesta_ok(
		RecorridoLectura.model_validate(recorrido).model_dump(),
		"Recorrido creado correctamente",
	)


@router.delete("/{recorrido_id}")
async def eliminar_recorrido(
	recorrido_id: int,
	db: AsyncSession = Depends(get_db),
	usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
) -> dict:
	resultado = await db.execute(select(Recorrido).where(Recorrido.id == recorrido_id))
	recorrido = resultado.scalar_one_or_none()
	if recorrido is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recorrido no encontrado")

	if usuario_actual.rol == RolUsuario.dueno and recorrido.dueno_id != usuario_actual.id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes eliminar recorridos de otro dueño")

	alumnos_asignados = await db.execute(
		select(func.count()).select_from(Alumno).where(Alumno.recorrido_id == recorrido_id)
	)
	if alumnos_asignados.scalar_one() > 0:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail="No se puede eliminar el recorrido porque tiene alumnos asignados",
		)

	await db.delete(recorrido)
	await db.commit()
	return respuesta_ok(None, "Recorrido eliminado correctamente")
