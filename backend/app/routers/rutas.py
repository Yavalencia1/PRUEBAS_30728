from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.responses import respuesta_ok, respuesta_paginada, respuesta_error
from app.models.ruta import Ruta
from app.models.usuario import RolUsuario, Usuario
from app.models.recorrido import Recorrido
from app.schemas.ruta import RutaCrear, RutaActualizar, RutaLectura

router = APIRouter(tags=["Rutas"], prefix="/rutas")


@router.get("/")
async def listar_rutas(
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor)),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    recorrido_id: int | None = Query(default=None),
    tipo: str | None = Query(default=None),
    q: str | None = Query(default=None, min_length=1, max_length=100),
) -> dict:
    """Listar rutas con filtros y paginación"""
    
    filtros = []
    
    # Solo dueno ve sus rutas, admin ve todas
    if usuario_actual.rol == RolUsuario.dueno:
        filtros.append(
            Ruta.recorrido_id.in_(
                select(Recorrido.id).where(Recorrido.dueno_id == usuario_actual.id)
            )
        )
    
    if recorrido_id:
        filtros.append(Ruta.recorrido_id == recorrido_id)
    
    if tipo:
        filtros.append(Ruta.tipo == tipo)
    
    if q:
        patron = f"%{q.strip()}%"
        filtros.append(
            or_(
                Ruta.nombre.ilike(patron),
                Ruta.descripcion.ilike(patron),
            )
        )
    
    base_query = select(Ruta).where(*filtros) if filtros else select(Ruta)
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()
    
    resultado = await db.execute(
        base_query.order_by(Ruta.id.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    rutas = resultado.scalars().all()
    items = [RutaLectura.model_validate(ruta).model_dump() for ruta in rutas]
    
    return respuesta_paginada(items, pagina=page, tamano=page_size, total=total, mensaje="Listado de rutas")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_ruta(
    ruta: RutaCrear,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
) -> dict:
    """Crear una nueva ruta"""
    
    # Verificar que el recorrido existe y pertenece al usuario (si es dueno)
    resultado = await db.execute(select(Recorrido).where(Recorrido.id == ruta.recorrido_id))
    recorrido = resultado.scalar_one_or_none()
    
    if not recorrido:
        return respuesta_error("El recorrido no existe", status.HTTP_404_NOT_FOUND)
    
    if usuario_actual.rol == RolUsuario.dueno and recorrido.dueno_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para crear rutas en este recorrido", status.HTTP_403_FORBIDDEN)
    
    nueva_ruta = Ruta(
        recorrido_id=ruta.recorrido_id,
        nombre=ruta.nombre,
        descripcion=ruta.descripcion,
        tipo=ruta.tipo,
    )
    
    db.add(nueva_ruta)
    await db.commit()
    await db.refresh(nueva_ruta)
    
    return respuesta_ok(RutaLectura.model_validate(nueva_ruta).model_dump(), "Ruta creada exitosamente")


@router.get("/{ruta_id}")
async def obtener_ruta(
    ruta_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor)),
) -> dict:
    """Obtener una ruta específica"""
    
    resultado = await db.execute(select(Ruta).where(Ruta.id == ruta_id))
    ruta = resultado.scalar_one_or_none()
    
    if not ruta:
        return respuesta_error("La ruta no existe", status.HTTP_404_NOT_FOUND)
    
    # Verificar permisos
    if usuario_actual.rol == RolUsuario.dueno:
        dueno_ruta = await db.execute(
            select(Recorrido.dueno_id).where(Recorrido.id == ruta.recorrido_id)
        )
        if dueno_ruta.scalar_one() != usuario_actual.id:
            return respuesta_error("No tienes permisos para ver esta ruta", status.HTTP_403_FORBIDDEN)
    
    return respuesta_ok(RutaLectura.model_validate(ruta).model_dump())


@router.put("/{ruta_id}")
async def actualizar_ruta(
    ruta_id: int,
    ruta_actualizar: RutaActualizar,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
) -> dict:
    """Actualizar una ruta"""
    
    resultado = await db.execute(select(Ruta).where(Ruta.id == ruta_id))
    ruta = resultado.scalar_one_or_none()
    
    if not ruta:
        return respuesta_error("La ruta no existe", status.HTTP_404_NOT_FOUND)
    
    # Verificar permisos
    if usuario_actual.rol == RolUsuario.dueno:
        dueno_ruta = await db.execute(
            select(Recorrido.dueno_id).where(Recorrido.id == ruta.recorrido_id)
        )
        if dueno_ruta.scalar_one() != usuario_actual.id:
            return respuesta_error("No tienes permisos para actualizar esta ruta", status.HTTP_403_FORBIDDEN)
    
    # Actualizar campos
    if ruta_actualizar.nombre is not None:
        ruta.nombre = ruta_actualizar.nombre
    if ruta_actualizar.descripcion is not None:
        ruta.descripcion = ruta_actualizar.descripcion
    if ruta_actualizar.tipo is not None:
        ruta.tipo = ruta_actualizar.tipo
    
    await db.commit()
    await db.refresh(ruta)
    
    return respuesta_ok(RutaLectura.model_validate(ruta).model_dump(), "Ruta actualizada exitosamente")


@router.delete("/{ruta_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_ruta(
    ruta_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
):
    """Eliminar una ruta"""
    
    resultado = await db.execute(select(Ruta).where(Ruta.id == ruta_id))
    ruta = resultado.scalar_one_or_none()
    
    if not ruta:
        raise HTTPException(status_code=404, detail="La ruta no existe")
    
    # Verificar permisos
    if usuario_actual.rol == RolUsuario.dueno:
        dueno_ruta = await db.execute(
            select(Recorrido.dueno_id).where(Recorrido.id == ruta.recorrido_id)
        )
        if dueno_ruta.scalar_one() != usuario_actual.id:
            raise HTTPException(status_code=403, detail="No tienes permisos para eliminar esta ruta")
    
    await db.delete(ruta)
    await db.commit()
