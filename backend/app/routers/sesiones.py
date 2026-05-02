from datetime import datetime
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.responses import respuesta_ok, respuesta_paginada, respuesta_error
from app.models.sesion_ruta import SesionRuta, EstadoSesionRuta
from app.models.ruta import Ruta
from app.models.usuario import RolUsuario, Usuario
from app.models.recorrido import Recorrido
from app.schemas.sesion_ruta import SesionRutaCrear, SesionRutaActualizar, SesionRutaLectura

router = APIRouter(tags=["Sesiones"], prefix="/sesiones")


@router.get("/")
async def listar_sesiones(
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor)),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ruta_id: int | None = Query(default=None),
    estado: str | None = Query(default=None),
) -> dict:
    """Listar sesiones de rutas con paginación"""
    
    filtros = []
    
    # Solo conductores ven sus sesiones, dueno ven sus rutas, admin ven todas
    if usuario_actual.rol == RolUsuario.conductor:
        filtros.append(SesionRuta.conductor_id == usuario_actual.id)
    elif usuario_actual.rol == RolUsuario.dueno:
        # Ver sesiones de rutas que pertenecen a sus recorridos
        filtros.append(
            SesionRuta.ruta_id.in_(
                select(Ruta.id).where(
                    Ruta.recorrido_id.in_(
                        select(Recorrido.id).where(Recorrido.dueno_id == usuario_actual.id)
                    )
                )
            )
        )
    
    if ruta_id:
        filtros.append(SesionRuta.ruta_id == ruta_id)
    
    if estado:
        filtros.append(SesionRuta.estado == estado)
    
    base_query = select(SesionRuta).where(*filtros) if filtros else select(SesionRuta)
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()
    
    resultado = await db.execute(
        base_query.order_by(SesionRuta.id.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    sesiones = resultado.scalars().all()
    items = [SesionRutaLectura.model_validate(sesion).model_dump() for sesion in sesiones]
    
    return respuesta_paginada(items, pagina=page, tamano=page_size, total=total, mensaje="Listado de sesiones")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_sesion(
    sesion: SesionRutaCrear,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
) -> dict:
    """Crear una nueva sesión de ruta"""
    
    # Verificar que la ruta existe
    resultado_ruta = await db.execute(select(Ruta).where(Ruta.id == sesion.ruta_id))
    ruta = resultado_ruta.scalar_one_or_none()
    
    if not ruta:
        return respuesta_error("La ruta no existe", status.HTTP_404_NOT_FOUND)
    
    # Verificar permisos (dueno solo puede crear en sus rutas)
    if usuario_actual.rol == RolUsuario.dueno:
        dueno_ruta = await db.execute(
            select(Recorrido.dueno_id).where(Recorrido.id == ruta.recorrido_id)
        )
        if dueno_ruta.scalar_one() != usuario_actual.id:
            return respuesta_error("No tienes permisos para crear sesiones en esta ruta", status.HTTP_403_FORBIDDEN)
    
    # Verificar que el conductor existe
    resultado_conductor = await db.execute(
        select(Usuario).where((Usuario.id == sesion.conductor_id) & (Usuario.rol == RolUsuario.conductor))
    )
    conductor = resultado_conductor.scalar_one_or_none()
    
    if not conductor:
        return respuesta_error("El conductor no existe", status.HTTP_404_NOT_FOUND)
    
    nueva_sesion = SesionRuta(
        ruta_id=sesion.ruta_id,
        conductor_id=sesion.conductor_id,
        estado=EstadoSesionRuta.en_curso,
    )
    
    db.add(nueva_sesion)
    await db.commit()
    await db.refresh(nueva_sesion)
    
    return respuesta_ok(SesionRutaLectura.model_validate(nueva_sesion).model_dump(), "Sesión creada exitosamente")


@router.get("/{sesion_id}")
async def obtener_sesion(
    sesion_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor)),
) -> dict:
    """Obtener una sesión específica"""
    
    resultado = await db.execute(select(SesionRuta).where(SesionRuta.id == sesion_id))
    sesion = resultado.scalar_one_or_none()
    
    if not sesion:
        return respuesta_error("La sesión no existe", status.HTTP_404_NOT_FOUND)
    
    # Verificar permisos
    if usuario_actual.rol == RolUsuario.conductor and sesion.conductor_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para ver esta sesión", status.HTTP_403_FORBIDDEN)
    elif usuario_actual.rol == RolUsuario.dueno:
        ruta = await db.execute(select(Ruta).where(Ruta.id == sesion.ruta_id))
        ruta_obj = ruta.scalar_one()
        dueno_ruta = await db.execute(
            select(Recorrido.dueno_id).where(Recorrido.id == ruta_obj.recorrido_id)
        )
        if dueno_ruta.scalar_one() != usuario_actual.id:
            return respuesta_error("No tienes permisos para ver esta sesión", status.HTTP_403_FORBIDDEN)
    
    return respuesta_ok(SesionRutaLectura.model_validate(sesion).model_dump())


@router.put("/{sesion_id}")
async def actualizar_sesion(
    sesion_id: int,
    sesion_actualizar: SesionRutaActualizar,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor)),
) -> dict:
    """Actualizar una sesión (marcar como completada, etc.)"""
    
    resultado = await db.execute(select(SesionRuta).where(SesionRuta.id == sesion_id))
    sesion = resultado.scalar_one_or_none()
    
    if not sesion:
        return respuesta_error("La sesión no existe", status.HTTP_404_NOT_FOUND)
    
    # Verificar permisos
    if usuario_actual.rol == RolUsuario.conductor and sesion.conductor_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para actualizar esta sesión", status.HTTP_403_FORBIDDEN)
    elif usuario_actual.rol == RolUsuario.dueno:
        ruta = await db.execute(select(Ruta).where(Ruta.id == sesion.ruta_id))
        ruta_obj = ruta.scalar_one()
        dueno_ruta = await db.execute(
            select(Recorrido.dueno_id).where(Recorrido.id == ruta_obj.recorrido_id)
        )
        if dueno_ruta.scalar_one() != usuario_actual.id:
            return respuesta_error("No tienes permisos para actualizar esta sesión", status.HTTP_403_FORBIDDEN)
    
    # Actualizar campos
    if sesion_actualizar.estado is not None:
        sesion.estado = sesion_actualizar.estado
    if sesion_actualizar.fin is not None:
        sesion.fin = sesion_actualizar.fin
    
    await db.commit()
    await db.refresh(sesion)
    
    return respuesta_ok(SesionRutaLectura.model_validate(sesion).model_dump(), "Sesión actualizada exitosamente")


@router.post("/{sesion_id}/completar", status_code=status.HTTP_200_OK)
async def completar_sesion(
    sesion_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.conductor)),
) -> dict:
    """Marcar una sesión como completada"""
    
    resultado = await db.execute(select(SesionRuta).where(SesionRuta.id == sesion_id))
    sesion = resultado.scalar_one_or_none()
    
    if not sesion:
        return respuesta_error("La sesión no existe", status.HTTP_404_NOT_FOUND)
    
    # Solo el conductor puede completar su sesión o admin
    if usuario_actual.rol == RolUsuario.conductor and sesion.conductor_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para completar esta sesión", status.HTTP_403_FORBIDDEN)
    
    sesion.estado = EstadoSesionRuta.completada
    sesion.fin = datetime.now()
    
    await db.commit()
    await db.refresh(sesion)
    
    return respuesta_ok(SesionRutaLectura.model_validate(sesion).model_dump(), "Sesión completada")
