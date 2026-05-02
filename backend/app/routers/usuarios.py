from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.responses import respuesta_paginada
from app.models.usuario import RolUsuario, Usuario
from app.schemas.usuario import UsuarioLectura

router = APIRouter(tags=["Usuarios"])


@router.get("/")
async def listar_usuarios(
	db: AsyncSession = Depends(get_db),
	usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=20, ge=1, le=100),
	rol: RolUsuario | None = Query(default=None),
	q: str | None = Query(default=None, min_length=1, max_length=100),
) -> dict:
	filtros = []
	if rol is not None:
		filtros.append(Usuario.rol == rol)
	if q:
		patron = f"%{q.strip()}%"
		filtros.append(
			or_(
				Usuario.nombre.ilike(patron),
				Usuario.apellido.ilike(patron),
				Usuario.email.ilike(patron),
			)
		)

	base_query = select(Usuario).where(*filtros)
	total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
	total = total_result.scalar_one()

	resultado = await db.execute(
		base_query.order_by(Usuario.id.desc()).offset((page - 1) * page_size).limit(page_size)
	)
	usuarios = resultado.scalars().all()
	items = [UsuarioLectura.model_validate(usuario).model_dump() for usuario in usuarios]

	return respuesta_paginada(
		items,
		pagina=page,
		tamano=page_size,
		total=total,
		mensaje="Usuarios obtenidos correctamente",
	)
