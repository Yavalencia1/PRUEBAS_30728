from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.responses import respuesta_ok, respuesta_paginada, respuesta_error
from app.models.pago import Pago, EstadoPago
from app.models.usuario import RolUsuario, Usuario
from app.models.alumno import Alumno
from app.schemas.pago import PagoCrear, PagoActualizar, PagoLectura

router = APIRouter(tags=["Pagos"], prefix="/pagos")


@router.get("/")
async def listar_pagos(
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.padre)),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    estado: str | None = Query(default=None),
    alumno_id: int | None = Query(default=None),
) -> dict:
    """Listar pagos con filtros y paginación"""
    
    filtros = []
    
    # Padres solo ven sus pagos, dueno ven los de sus alumnos, admin ven todos
    if usuario_actual.rol == RolUsuario.padre:
        filtros.append(Pago.padre_id == usuario_actual.id)
    elif usuario_actual.rol == RolUsuario.dueno:
        # Ver pagos de alumnos que están en recorridos del dueno
        filtros.append(
            Pago.alumno_id.in_(
                select(Alumno.id).where(
                    Alumno.recorrido_id.in_(
                        select(
                            select(Alumno.recorrido_id).where(Alumno.padre_id == Pago.padre_id).correlate(Pago)
                        )
                    )
                )
            )
        )
    
    if estado:
        filtros.append(Pago.estado == estado)
    
    if alumno_id:
        filtros.append(Pago.alumno_id == alumno_id)
    
    base_query = select(Pago).where(*filtros) if filtros else select(Pago)
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()
    
    resultado = await db.execute(
        base_query.order_by(Pago.id.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    pagos = resultado.scalars().all()
    items = [PagoLectura.model_validate(pago).model_dump() for pago in pagos]
    
    return respuesta_paginada(items, pagina=page, tamano=page_size, total=total, mensaje="Listado de pagos")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_pago(
    pago: PagoCrear,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
) -> dict:
    """Crear un nuevo pago"""
    
    # Verificar que el alumno existe
    resultado_alumno = await db.execute(select(Alumno).where(Alumno.id == pago.alumno_id))
    alumno = resultado_alumno.scalar_one_or_none()
    
    if not alumno:
        return respuesta_error("El alumno no existe", status.HTTP_404_NOT_FOUND)
    
    # Verificar que el padre existe
    resultado_padre = await db.execute(
        select(Usuario).where((Usuario.id == pago.padre_id) & (Usuario.rol == RolUsuario.padre))
    )
    padre = resultado_padre.scalar_one_or_none()
    
    if not padre:
        return respuesta_error("El padre no existe", status.HTTP_404_NOT_FOUND)
    
    nuevo_pago = Pago(
        alumno_id=pago.alumno_id,
        padre_id=pago.padre_id,
        monto=pago.monto,
        fecha_vencimiento=pago.fecha_vencimiento,
        estado=pago.estado,
        referencia=pago.referencia,
    )
    
    db.add(nuevo_pago)
    await db.commit()
    await db.refresh(nuevo_pago)
    
    return respuesta_ok(PagoLectura.model_validate(nuevo_pago).model_dump(), "Pago registrado exitosamente")


@router.get("/{pago_id}")
async def obtener_pago(
    pago_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.padre)),
) -> dict:
    """Obtener un pago específico"""
    
    resultado = await db.execute(select(Pago).where(Pago.id == pago_id))
    pago = resultado.scalar_one_or_none()
    
    if not pago:
        return respuesta_error("El pago no existe", status.HTTP_404_NOT_FOUND)
    
    # Verificar permisos
    if usuario_actual.rol == RolUsuario.padre and pago.padre_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para ver este pago", status.HTTP_403_FORBIDDEN)
    
    return respuesta_ok(PagoLectura.model_validate(pago).model_dump())


@router.put("/{pago_id}")
async def actualizar_pago(
    pago_id: int,
    pago_actualizar: PagoActualizar,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.padre)),
) -> dict:
    """Actualizar un pago (marcar como pagado, etc.)"""
    
    resultado = await db.execute(select(Pago).where(Pago.id == pago_id))
    pago = resultado.scalar_one_or_none()
    
    if not pago:
        return respuesta_error("El pago no existe", status.HTTP_404_NOT_FOUND)
    
    # Solo el padre (dueño del pago) o admin pueden actualizar
    if usuario_actual.rol == RolUsuario.padre and pago.padre_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para actualizar este pago", status.HTTP_403_FORBIDDEN)
    
    # Actualizar campos
    if pago_actualizar.monto is not None:
        pago.monto = pago_actualizar.monto
    if pago_actualizar.fecha_vencimiento is not None:
        pago.fecha_vencimiento = pago_actualizar.fecha_vencimiento
    if pago_actualizar.fecha_pago is not None:
        pago.fecha_pago = pago_actualizar.fecha_pago
    if pago_actualizar.estado is not None:
        pago.estado = pago_actualizar.estado
    if pago_actualizar.referencia is not None:
        pago.referencia = pago_actualizar.referencia
    
    await db.commit()
    await db.refresh(pago)
    
    return respuesta_ok(PagoLectura.model_validate(pago).model_dump(), "Pago actualizado exitosamente")


@router.post("/{pago_id}/marcar-pagado", status_code=status.HTTP_200_OK)
async def marcar_pago_pagado(
    pago_id: int,
    referencia: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.padre)),
) -> dict:
    """Marcar un pago como pagado"""
    
    resultado = await db.execute(select(Pago).where(Pago.id == pago_id))
    pago = resultado.scalar_one_or_none()
    
    if not pago:
        return respuesta_error("El pago no existe", status.HTTP_404_NOT_FOUND)
    
    # Solo el padre o admin pueden marcar como pagado
    if usuario_actual.rol == RolUsuario.padre and pago.padre_id != usuario_actual.id:
        return respuesta_error("No tienes permisos para marcar este pago como pagado", status.HTTP_403_FORBIDDEN)
    
    pago.estado = EstadoPago.pagado
    pago.fecha_pago = date.today()
    if referencia:
        pago.referencia = referencia
    
    await db.commit()
    await db.refresh(pago)
    
    return respuesta_ok(PagoLectura.model_validate(pago).model_dump(), "Pago marcado como pagado")


@router.get("/resumen/por-estado")
async def resumen_pagos_por_estado(
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno, RolUsuario.padre)),
) -> dict:
    """Obtener resumen de pagos por estado"""
    
    filtros = []
    if usuario_actual.rol == RolUsuario.padre:
        filtros.append(Pago.padre_id == usuario_actual.id)
    
    base_query = select(Pago.estado, func.count(Pago.id).label("cantidad")).group_by(Pago.estado)
    if filtros:
        base_query = base_query.where(*filtros)
    
    resultado = await db.execute(base_query)
    resumen = resultado.all()
    
    data = {estado: cantidad for estado, cantidad in resumen}
    
    return respuesta_ok(data, "Resumen de pagos por estado")
