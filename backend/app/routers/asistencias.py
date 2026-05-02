from datetime import datetime
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.responses import respuesta_ok, respuesta_paginada, respuesta_error
from app.models.asistencia import Asistencia, EstadoAsistencia
from app.models.sesion_ruta import SesionRuta
from app.models.usuario import RolUsuario, Usuario
from app.models.ruta import Ruta
from app.models.recorrido import Recorrido
from app.schemas.asistencia import AsistenciaCrear, AsistenciaActualizar, AsistenciaLectura

router = APIRouter(tags=["Asistencias"], prefix="/asistencias")


@router.get("/")
async def listar_asistencias(
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor, RolUsuario.padre)),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sesion_id: int | None = Query(default=None),
    alumno_id: int | None = Query(default=None),
    estado: str | None = Query(default=None),
) -> dict:
    """Listar asistencias con filtros y paginación"""
    
    filtros = []
    
    # Conductores ven asistencias de sus sesiones
    if usuario_actual.rol == RolUsuario.conductor:
        filtros.append(
            Asistencia.sesion_id.in_(
                select(SesionRuta.id).where(SesionRuta.conductor_id == usuario_actual.id)
            )
        )
    # Duenos ven asistencias de sus rutas
    elif usuario_actual.rol == RolUsuario.dueno:
        filtros.append(
            Asistencia.sesion_id.in_(
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
        filtros.append(Asistencia.sesion_id == sesion_id)
    
    if alumno_id:
        filtros.append(Asistencia.alumno_id == alumno_id)
    
    if estado:
        filtros.append(Asistencia.estado == estado)
    
    base_query = select(Asistencia).where(*filtros) if filtros else select(Asistencia)
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()
    
    resultado = await db.execute(
        base_query.order_by(Asistencia.id.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    asistencias = resultado.scalars().all()
    items = [AsistenciaLectura.model_validate(asistencia).model_dump() for asistencia in asistencias]
    
    return respuesta_paginada(items, pagina=page, tamano=page_size, total=total, mensaje="Listado de asistencias")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_asistencia(
    asistencia: AsistenciaCrear,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.conductor)),
) -> dict:
    """Crear un registro de asistencia"""
    
    # Verificar que la sesión existe
    resultado_sesion = await db.execute(select(SesionRuta).where(SesionRuta.id == asistencia.sesion_id))
    sesion = resultado_sesion.scalar_one_or_none()
    
    if not sesion:
        return respuesta_error("La sesión no existe", status.HTTP_404_NOT_FOUND)
    
    # Si es conductor, verificar que es su sesión
    if usuario_actual.rol == RolUsuario.conductor and sesion.conductor_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para registrar asistencias en esta sesión", status.HTTP_403_FORBIDDEN)
    
    nueva_asistencia = Asistencia(
        sesion_id=asistencia.sesion_id,
        alumno_id=asistencia.alumno_id,
        estado=asistencia.estado,
        hora_subida=asistencia.hora_subida,
        hora_bajada=asistencia.hora_bajada,
    )
    
    db.add(nueva_asistencia)
    await db.commit()
    await db.refresh(nueva_asistencia)
    
    return respuesta_ok(AsistenciaLectura.model_validate(nueva_asistencia).model_dump(), "Asistencia registrada")


@router.get("/{asistencia_id}")
async def obtener_asistencia(
    asistencia_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.conductor, RolUsuario.dueno, RolUsuario.padre)),
) -> dict:
    """Obtener una asistencia específica"""
    
    resultado = await db.execute(select(Asistencia).where(Asistencia.id == asistencia_id))
    asistencia = resultado.scalar_one_or_none()
    
    if not asistencia:
        return respuesta_error("La asistencia no existe", status.HTTP_404_NOT_FOUND)
    
    return respuesta_ok(AsistenciaLectura.model_validate(asistencia).model_dump())


@router.put("/{asistencia_id}")
async def actualizar_asistencia(
    asistencia_id: int,
    asistencia_actualizar: AsistenciaActualizar,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.conductor)),
) -> dict:
    """Actualizar una asistencia (hora de subida, bajada, estado)"""
    
    resultado = await db.execute(select(Asistencia).where(Asistencia.id == asistencia_id))
    asistencia = resultado.scalar_one_or_none()
    
    if not asistencia:
        return respuesta_error("La asistencia no existe", status.HTTP_404_NOT_FOUND)
    
    # Si es conductor, verificar que es su sesión
    if usuario_actual.rol == RolUsuario.conductor:
        sesion = await db.execute(select(SesionRuta).where(SesionRuta.id == asistencia.sesion_id))
        sesion_obj = sesion.scalar_one()
        if sesion_obj.conductor_id != usuario_actual.id:
            return respuesta_error("No tienes permisos para actualizar esta asistencia", status.HTTP_403_FORBIDDEN)
    
    # Actualizar campos
    if asistencia_actualizar.hora_subida is not None:
        asistencia.hora_subida = asistencia_actualizar.hora_subida
    if asistencia_actualizar.hora_bajada is not None:
        asistencia.hora_bajada = asistencia_actualizar.hora_bajada
    if asistencia_actualizar.estado is not None:
        asistencia.estado = asistencia_actualizar.estado
    
    await db.commit()
    await db.refresh(asistencia)
    
    return respuesta_ok(AsistenciaLectura.model_validate(asistencia).model_dump(), "Asistencia actualizada")


@router.post("/{asistencia_id}/marcar-subida", status_code=status.HTTP_200_OK)
async def marcar_subida(
    asistencia_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.conductor)),
) -> dict:
    """Marcar hora de subida del alumno al bus"""
    
    resultado = await db.execute(select(Asistencia).where(Asistencia.id == asistencia_id))
    asistencia = resultado.scalar_one_or_none()
    
    if not asistencia:
        return respuesta_error("La asistencia no existe", status.HTTP_404_NOT_FOUND)
    
    asistencia.hora_subida = datetime.now()
    asistencia.estado = EstadoAsistencia.presente
    
    await db.commit()
    await db.refresh(asistencia)
    
    return respuesta_ok(AsistenciaLectura.model_validate(asistencia).model_dump(), "Subida registrada")


@router.post("/{asistencia_id}/marcar-bajada", status_code=status.HTTP_200_OK)
async def marcar_bajada(
    asistencia_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.conductor)),
) -> dict:
    """Marcar hora de bajada del alumno del bus"""
    
    resultado = await db.execute(select(Asistencia).where(Asistencia.id == asistencia_id))
    asistencia = resultado.scalar_one_or_none()
    
    if not asistencia:
        return respuesta_error("La asistencia no existe", status.HTTP_404_NOT_FOUND)
    
    asistencia.hora_bajada = datetime.now()
    
    await db.commit()
    await db.refresh(asistencia)
    
    return respuesta_ok(AsistenciaLectura.model_validate(asistencia).model_dump(), "Bajada registrada")
