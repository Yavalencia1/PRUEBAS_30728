from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.responses import respuesta_paginada
from app.models.alumno import Alumno
from app.models.usuario import RolUsuario, Usuario
from app.routers.auth import obtener_usuario_actual
from app.schemas.alumno import AlumnoLectura

router = APIRouter(tags=["Alumnos"])


@router.get("/")
async def listar_alumnos(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    padre_id: int | None = Query(default=None, ge=1),
    recorrido_id: int | None = Query(default=None, ge=1),
    q: str | None = Query(default=None, min_length=1, max_length=100),
) -> dict:
    if usuario.rol == RolUsuario.padre:
        filtros = [Alumno.padre_id == usuario.id]
    elif usuario.rol in {RolUsuario.admin, RolUsuario.dueno}:
        filtros = []
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los conductores no pueden consultar el listado general de alumnos",
        )

    if padre_id is not None:
        filtros.append(Alumno.padre_id == padre_id)
    if recorrido_id is not None:
        filtros.append(Alumno.recorrido_id == recorrido_id)
    if q:
        patron = f"%{q.strip()}%"
        filtros.append(
            or_(
                Alumno.nombre.ilike(patron),
                Alumno.apellido.ilike(patron),
            )
        )

    base_query = select(Alumno).where(*filtros)
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()

    resultado = await db.execute(
        base_query.order_by(Alumno.id.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    alumnos = resultado.scalars().all()
    items = [AlumnoLectura.model_validate(alumno).model_dump() for alumno in alumnos]

    return respuesta_paginada(
        items,
        pagina=page,
        tamano=page_size,
        total=total,
        mensaje="Alumnos obtenidos correctamente",
    )
