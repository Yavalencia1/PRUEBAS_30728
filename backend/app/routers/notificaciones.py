from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.responses import respuesta_ok, respuesta_paginada, respuesta_error
from app.models.notificacion import Notificacion, TipoNotificacion
from app.models.usuario import RolUsuario, Usuario
from app.schemas.notificacion import NotificacionCrear, NotificacionActualizar, NotificacionLectura

router = APIRouter(tags=["Notificaciones"], prefix="/notificaciones")


@router.get("/")
async def listar_notificaciones(
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor, RolUsuario.padre)),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    leida: bool | None = Query(default=None),
) -> dict:
    """Listar notificaciones del usuario con paginación"""
    
    filtros = [Notificacion.usuario_id == usuario_actual.id]
    
    if leida is not None:
        filtros.append(Notificacion.leida == leida)
    
    base_query = select(Notificacion).where(*filtros)
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()
    
    resultado = await db.execute(
        base_query.order_by(Notificacion.creado_en.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    notificaciones = resultado.scalars().all()
    items = [NotificacionLectura.model_validate(notif).model_dump() for notif in notificaciones]
    
    return respuesta_paginada(items, pagina=page, tamano=page_size, total=total, mensaje="Listado de notificaciones")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_notificacion(
    notif: NotificacionCrear,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor)),
) -> dict:
    """Crear una nueva notificación (admin/dueno/conductor envían)"""
    
    # Validar que el tipo existe
    try:
        TipoNotificacion(notif.tipo)
    except ValueError:
        return respuesta_error("Tipo de notificación inválido", status.HTTP_400_BAD_REQUEST)
    
    nueva_notif = Notificacion(
        usuario_id=notif.usuario_id,
        titulo=notif.titulo,
        mensaje=notif.mensaje,
        tipo=notif.tipo,
        leida=False,
    )
    
    db.add(nueva_notif)
    await db.commit()
    await db.refresh(nueva_notif)
    
    return respuesta_ok(NotificacionLectura.model_validate(nueva_notif).model_dump(), "Notificación creada exitosamente")


@router.get("/{notif_id}")
async def obtener_notificacion(
    notif_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.conductor, RolUsuario.padre)),
) -> dict:
    """Obtener una notificación específica"""
    
    resultado = await db.execute(select(Notificacion).where(Notificacion.id == notif_id))
    notif = resultado.scalar_one_or_none()
    
    if not notif:
        return respuesta_error("La notificación no existe", status.HTTP_404_NOT_FOUND)
    
    # Verificar que el usuario sea el propietario o admin
    if usuario_actual.rol != RolUsuario.admin and notif.usuario_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para ver esta notificación", status.HTTP_403_FORBIDDEN)
    
    return respuesta_ok(NotificacionLectura.model_validate(notif).model_dump())


@router.put("/{notif_id}")
async def actualizar_notificacion(
    notif_id: int,
    notif_actualizar: NotificacionActualizar,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.padre, RolUsuario.conductor, RolUsuario.dueno)),
) -> dict:
    """Actualizar una notificación (marcar como leída)"""
    
    resultado = await db.execute(select(Notificacion).where(Notificacion.id == notif_id))
    notif = resultado.scalar_one_or_none()
    
    if not notif:
        return respuesta_error("La notificación no existe", status.HTTP_404_NOT_FOUND)
    
    # Solo el propietario o admin pueden actualizar
    if usuario_actual.rol != RolUsuario.admin and notif.usuario_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para actualizar esta notificación", status.HTTP_403_FORBIDDEN)
    
    # Actualizar campos
    if notif_actualizar.titulo is not None:
        notif.titulo = notif_actualizar.titulo
    if notif_actualizar.mensaje is not None:
        notif.mensaje = notif_actualizar.mensaje
    if notif_actualizar.tipo is not None:
        notif.tipo = notif_actualizar.tipo
    if notif_actualizar.leida is not None:
        notif.leida = notif_actualizar.leida
    
    await db.commit()
    await db.refresh(notif)
    
    return respuesta_ok(NotificacionLectura.model_validate(notif).model_dump(), "Notificación actualizada exitosamente")


@router.post("/{notif_id}/marcar-leida")
async def marcar_notificacion_leida(
    notif_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.padre, RolUsuario.conductor, RolUsuario.dueno)),
) -> dict:
    """Marcar una notificación como leída"""
    
    resultado = await db.execute(select(Notificacion).where(Notificacion.id == notif_id))
    notif = resultado.scalar_one_or_none()
    
    if not notif:
        return respuesta_error("La notificación no existe", status.HTTP_404_NOT_FOUND)
    
    # Solo el propietario puede marcar como leída
    if notif.usuario_id != usuario_actual.id and usuario_actual.rol != RolUsuario.admin:
        return respuesta_error("No tienes permisos para marcar esta notificación", status.HTTP_403_FORBIDDEN)
    
    notif.leida = True
    await db.commit()
    await db.refresh(notif)
    
    return respuesta_ok(NotificacionLectura.model_validate(notif).model_dump(), "Notificación marcada como leída")


@router.get("/stats/sin-leer")
async def contar_notificaciones_sin_leer(
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.padre, RolUsuario.conductor, RolUsuario.dueno)),
) -> dict:
    """Contar notificaciones sin leer del usuario"""
    
    resultado = await db.execute(
        select(func.count(Notificacion.id)).where(
            (Notificacion.usuario_id == usuario_actual.id) & (Notificacion.leida == False)
        )
    )
    cantidad = resultado.scalar_one() or 0
    
    return respuesta_ok({"sin_leer": cantidad}, "Cantidad de notificaciones sin leer")
