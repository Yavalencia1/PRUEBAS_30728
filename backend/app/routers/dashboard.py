from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.responses import respuesta_ok
from app.models.alumno import Alumno
from app.models.pago import EstadoPago, Pago
from app.models.recorrido import Recorrido
from app.models.usuario import RolUsuario, Usuario

router = APIRouter(tags=["Dashboard"])

@router.get("/resumen")
async def dashboard_resumen(
    db: AsyncSession = Depends(get_db), 
    usuario: Usuario = Depends(require_roles(RolUsuario.admin, RolUsuario.dueno)),
) -> dict:
    filtros_recorridos = []
    if usuario.rol == RolUsuario.dueno:
        filtros_recorridos.append(Recorrido.dueno_id == usuario.id)

    alumnos_query = select(func.count()).select_from(Alumno).join(Recorrido).where(*filtros_recorridos)
    if usuario.rol == RolUsuario.dueno:
        alumnos_query = alumnos_query.where(Recorrido.dueno_id == usuario.id)
    alumnos_result = await db.execute(alumnos_query)

    recorridos_result = await db.execute(
        select(func.count()).select_from(Recorrido).where(*filtros_recorridos, Recorrido.activo.is_(True))
    )

    hoy = date.today()
    inicio_mes = hoy.replace(day=1)

    pagos_base = select(Pago, Alumno.nombre, Alumno.apellido).join(Alumno).join(Recorrido)
    if usuario.rol == RolUsuario.dueno:
        pagos_base = pagos_base.where(Recorrido.dueno_id == usuario.id)

    pagos_pendientes_result = await db.execute(
        select(func.coalesce(func.sum(Pago.monto), 0))
        .select_from(Pago)
        .join(Alumno)
        .join(Recorrido)
        .where(
            Pago.estado == EstadoPago.pendiente,
            Pago.fecha_vencimiento >= inicio_mes,
            *( [Recorrido.dueno_id == usuario.id] if usuario.rol == RolUsuario.dueno else [] ),
        )
    )
    pagos_cobrados_result = await db.execute(
        select(func.coalesce(func.sum(Pago.monto), 0))
        .select_from(Pago)
        .join(Alumno)
        .join(Recorrido)
        .where(
            Pago.estado == EstadoPago.pagado,
            Pago.fecha_pago >= inicio_mes,
            *( [Recorrido.dueno_id == usuario.id] if usuario.rol == RolUsuario.dueno else [] ),
        )
    )

    ultimos_pendientes_result = await db.execute(
        pagos_base.where(Pago.estado == EstadoPago.pendiente)
        .order_by(Pago.fecha_vencimiento.asc())
        .limit(5)
    )

    return respuesta_ok(
        {
            "total_alumnos_activos": alumnos_result.scalar_one(),
            "recorridos_activos": recorridos_result.scalar_one(),
            "pagos_pendientes_mes": float(pagos_pendientes_result.scalar_one()),
            "pagos_cobrados_mes": float(pagos_cobrados_result.scalar_one()),
            "ultimos_pagos_pendientes": [
                {
                    "alumno": f"{nombre} {apellido}",
                    "monto": float(pago.monto),
                    "fecha_vencimiento": pago.fecha_vencimiento.isoformat(),
                }
                for pago, nombre, apellido in ultimos_pendientes_result.all()
            ],
        },
        "Resumen del dashboard obtenido correctamente",
    )
