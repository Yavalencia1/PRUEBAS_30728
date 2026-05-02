from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.responses import respuesta_ok, respuesta_paginada, respuesta_error
from app.models.ubicacion_gps import UbicacionGPS
from app.models.sesion_ruta import SesionRuta
from app.models.ruta import Ruta
from app.models.recorrido import Recorrido
from app.models.usuario import RolUsuario, Usuario
from app.schemas.ubicacion_gps import UbicacionGPSCrear, UbicacionGPSLectura

router = APIRouter(tags=["Ubicaciones GPS"], prefix="/ubicaciones-gps")


@router.get("/")
async def listar_ubicaciones(
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor, RolUsuario.padre)),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    sesion_id: int | None = Query(default=None),
) -> dict:
    """Listar ubicaciones GPS de sesiones con paginación"""
    
    filtros = []
    
    # Conductores solo ven sus sesiones
    if usuario_actual.rol == RolUsuario.conductor:
        filtros.append(
            UbicacionGPS.sesion_id.in_(
                select(SesionRuta.id).where(SesionRuta.conductor_id == usuario_actual.id)
            )
        )
    # Duenos solo ven sus recorridos
    elif usuario_actual.rol == RolUsuario.dueno:
        filtros.append(
            UbicacionGPS.sesion_id.in_(
                select(SesionRuta.id).where(
                    SesionRuta.ruta_id.in_(
                        select(Ruta.id).where(
                            Ruta.recorrido_id.in_(
                                select(Recorrido.id).where(Recorrido.dueno_id == usuario_actual.id)
                            )
                        )
                    )
                )
            )
        )
    
    if sesion_id:
        filtros.append(UbicacionGPS.sesion_id == sesion_id)
    
    base_query = select(UbicacionGPS).where(*filtros) if filtros else select(UbicacionGPS)
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()
    
    resultado = await db.execute(
        base_query.order_by(UbicacionGPS.registrado_en.asc()).offset((page - 1) * page_size).limit(page_size)
    )
    ubicaciones = resultado.scalars().all()
    items = [UbicacionGPSLectura.model_validate(ubi).model_dump() for ubi in ubicaciones]
    
    return respuesta_paginada(items, pagina=page, tamano=page_size, total=total, mensaje="Listado de ubicaciones GPS")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def registrar_ubicacion(
    ubicacion: UbicacionGPSCrear,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.conductor)),
) -> dict:
    """Registrar una nueva ubicación GPS (durante una sesión activa)"""
    
    # Verificar que la sesión existe
    resultado_sesion = await db.execute(select(SesionRuta).where(SesionRuta.id == ubicacion.sesion_id))
    sesion = resultado_sesion.scalar_one_or_none()
    
    if not sesion:
        return respuesta_error("La sesión no existe", status.HTTP_404_NOT_FOUND)
    
    # Solo el conductor de la sesión puede registrar ubicaciones
    if usuario_actual.rol == RolUsuario.conductor and sesion.conductor_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para registrar ubicaciones en esta sesión", status.HTTP_403_FORBIDDEN)
    
    # Validar coordenadas
    if not (-90 <= float(ubicacion.latitud) <= 90):
        return respuesta_error("Latitud debe estar entre -90 y 90", status.HTTP_400_BAD_REQUEST)
    if not (-180 <= float(ubicacion.longitud) <= 180):
        return respuesta_error("Longitud debe estar entre -180 y 180", status.HTTP_400_BAD_REQUEST)
    
    nueva_ubicacion = UbicacionGPS(
        sesion_id=ubicacion.sesion_id,
        latitud=ubicacion.latitud,
        longitud=ubicacion.longitud,
    )
    
    db.add(nueva_ubicacion)
    await db.commit()
    await db.refresh(nueva_ubicacion)
    
    return respuesta_ok(UbicacionGPSLectura.model_validate(nueva_ubicacion).model_dump(), "Ubicación registrada exitosamente")


@router.get("/{ubicacion_id}")
async def obtener_ubicacion(
    ubicacion_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.conductor, RolUsuario.dueno, RolUsuario.padre)),
) -> dict:
    """Obtener una ubicación GPS específica"""
    
    resultado = await db.execute(select(UbicacionGPS).where(UbicacionGPS.id == ubicacion_id))
    ubicacion = resultado.scalar_one_or_none()
    
    if not ubicacion:
        return respuesta_error("La ubicación no existe", status.HTTP_404_NOT_FOUND)
    
    return respuesta_ok(UbicacionGPSLectura.model_validate(ubicacion).model_dump())


@router.get("/sesion/{sesion_id}/ruta")
async def obtener_ruta_completa(
    sesion_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.conductor, RolUsuario.dueno, RolUsuario.padre)),
) -> dict:
    """Obtener la ruta completa (todas las ubicaciones) de una sesión"""
    
    # Verificar que la sesión existe
    resultado_sesion = await db.execute(select(SesionRuta).where(SesionRuta.id == sesion_id))
    sesion = resultado_sesion.scalar_one_or_none()
    
    if not sesion:
        return respuesta_error("La sesión no existe", status.HTTP_404_NOT_FOUND)
    
    # Verificar permisos
    if usuario_actual.rol == RolUsuario.conductor and sesion.conductor_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para ver esta ruta", status.HTTP_403_FORBIDDEN)
    
    # Obtener todas las ubicaciones de la sesión
    resultado = await db.execute(
        select(UbicacionGPS)
        .where(UbicacionGPS.sesion_id == sesion_id)
        .order_by(UbicacionGPS.registrado_en.asc())
    )
    ubicaciones = resultado.scalars().all()
    items = [UbicacionGPSLectura.model_validate(ubi).model_dump() for ubi in ubicaciones]
    
    return respuesta_ok(
        {
            "sesion_id": sesion_id,
            "total_puntos": len(items),
            "puntos": items,
        },
        "Ruta completa de la sesión"
    )


@router.get("/sesion/{sesion_id}/ultimo-punto")
async def obtener_ultimo_punto(
    sesion_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.conductor, RolUsuario.dueno, RolUsuario.padre)),
) -> dict:
    """Obtener la última ubicación conocida de una sesión (ubicación actual del bus)"""
    
    # Verificar que la sesión existe
    resultado_sesion = await db.execute(select(SesionRuta).where(SesionRuta.id == sesion_id))
    sesion = resultado_sesion.scalar_one_or_none()
    
    if not sesion:
        return respuesta_error("La sesión no existe", status.HTTP_404_NOT_FOUND)
    
    # Obtener la última ubicación
    resultado = await db.execute(
        select(UbicacionGPS)
        .where(UbicacionGPS.sesion_id == sesion_id)
        .order_by(UbicacionGPS.registrado_en.desc())
        .limit(1)
    )
    ubicacion = resultado.scalar_one_or_none()
    
    if not ubicacion:
        return respuesta_error("No hay ubicaciones registradas para esta sesión", status.HTTP_404_NOT_FOUND)
    
    return respuesta_ok(
        UbicacionGPSLectura.model_validate(ubicacion).model_dump(),
        "Última ubicación conocida del bus"
    )
