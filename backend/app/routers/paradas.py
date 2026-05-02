from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.responses import respuesta_ok, respuesta_paginada, respuesta_error
from app.models.parada import Parada
from app.models.ruta import Ruta
from app.models.recorrido import Recorrido
from app.models.usuario import RolUsuario, Usuario
from app.schemas.parada import ParadaCrear, ParadaActualizar, ParadaLectura

router = APIRouter(tags=["Paradas"], prefix="/paradas")


@router.get("/")
async def listar_paradas(
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor, RolUsuario.padre)),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ruta_id: int | None = Query(default=None),
) -> dict:
    """Listar paradas de una ruta con paginación"""
    
    filtros = []
    
    if ruta_id:
        filtros.append(Parada.ruta_id == ruta_id)
    
    base_query = select(Parada).where(*filtros) if filtros else select(Parada)
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()
    
    resultado = await db.execute(
        base_query.order_by(Parada.orden.asc()).offset((page - 1) * page_size).limit(page_size)
    )
    paradas = resultado.scalars().all()
    items = [ParadaLectura.model_validate(parada).model_dump() for parada in paradas]
    
    return respuesta_paginada(items, pagina=page, tamano=page_size, total=total, mensaje="Listado de paradas")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_parada(
    parada: ParadaCrear,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
) -> dict:
    """Crear una nueva parada en una ruta"""
    
    # Verificar que la ruta existe
    resultado_ruta = await db.execute(select(Ruta).where(Ruta.id == parada.ruta_id))
    ruta = resultado_ruta.scalar_one_or_none()
    
    if not ruta:
        return respuesta_error("La ruta no existe", status.HTTP_404_NOT_FOUND)
    
    # Verificar permisos (dueno solo puede crear en sus rutas)
    if usuario_actual.rol == RolUsuario.dueno:
        dueno_ruta = await db.execute(
            select(Recorrido.dueno_id).where(Recorrido.id == ruta.recorrido_id)
        )
        if dueno_ruta.scalar_one() != usuario_actual.id:
            return respuesta_error("No tienes permisos para crear paradas en esta ruta", status.HTTP_403_FORBIDDEN)
    
    nueva_parada = Parada(
        ruta_id=parada.ruta_id,
        nombre=parada.nombre,
        latitud=parada.latitud,
        longitud=parada.longitud,
        orden=parada.orden,
    )
    
    db.add(nueva_parada)
    await db.commit()
    await db.refresh(nueva_parada)
    
    return respuesta_ok(ParadaLectura.model_validate(nueva_parada).model_dump(), "Parada creada exitosamente")


@router.get("/{parada_id}")
async def obtener_parada(
    parada_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor, RolUsuario.padre)),
) -> dict:
    """Obtener una parada específica"""
    
    resultado = await db.execute(select(Parada).where(Parada.id == parada_id))
    parada = resultado.scalar_one_or_none()
    
    if not parada:
        return respuesta_error("La parada no existe", status.HTTP_404_NOT_FOUND)
    
    return respuesta_ok(ParadaLectura.model_validate(parada).model_dump())


@router.put("/{parada_id}")
async def actualizar_parada(
    parada_id: int,
    parada_actualizar: ParadaActualizar,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
) -> dict:
    """Actualizar una parada"""
    
    resultado = await db.execute(select(Parada).where(Parada.id == parada_id))
    parada = resultado.scalar_one_or_none()
    
    if not parada:
        return respuesta_error("La parada no existe", status.HTTP_404_NOT_FOUND)
    
    # Verificar permisos
    if usuario_actual.rol == RolUsuario.dueno:
        ruta = await db.execute(select(Ruta).where(Ruta.id == parada.ruta_id))
        ruta_obj = ruta.scalar_one()
        dueno_ruta = await db.execute(
            select(Recorrido.dueno_id).where(Recorrido.id == ruta_obj.recorrido_id)
        )
        if dueno_ruta.scalar_one() != usuario_actual.id:
            return respuesta_error("No tienes permisos para actualizar esta parada", status.HTTP_403_FORBIDDEN)
    
    # Actualizar campos
    if parada_actualizar.nombre is not None:
        parada.nombre = parada_actualizar.nombre
    if parada_actualizar.latitud is not None:
        parada.latitud = parada_actualizar.latitud
    if parada_actualizar.longitud is not None:
        parada.longitud = parada_actualizar.longitud
    if parada_actualizar.orden is not None:
        parada.orden = parada_actualizar.orden
    
    await db.commit()
    await db.refresh(parada)
    
    return respuesta_ok(ParadaLectura.model_validate(parada).model_dump(), "Parada actualizada exitosamente")


@router.delete("/{parada_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_parada(
    parada_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
):
    """Eliminar una parada"""
    
    resultado = await db.execute(select(Parada).where(Parada.id == parada_id))
    parada = resultado.scalar_one_or_none()
    
    if not parada:
        raise HTTPException(status_code=404, detail="La parada no existe")
    
    # Verificar permisos
    if usuario_actual.rol == RolUsuario.dueno:
        ruta = await db.execute(select(Ruta).where(Ruta.id == parada.ruta_id))
        ruta_obj = ruta.scalar_one()
        dueno_ruta = await db.execute(
            select(Recorrido.dueno_id).where(Recorrido.id == ruta_obj.recorrido_id)
        )
        if dueno_ruta.scalar_one() != usuario_actual.id:
            raise HTTPException(status_code=403, detail="No tienes permisos para eliminar esta parada")
    
    await db.delete(parada)
    await db.commit()
