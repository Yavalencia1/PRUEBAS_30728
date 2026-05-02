from __future__ import annotations

from typing import Any


def respuesta_ok(datos: Any = None, mensaje: str = "Operacion exitosa") -> dict[str, Any]:
    return {
        "ok": True,
        "data": datos,
        "mensaje": mensaje,
    }


def respuesta_error(
    mensaje: str,
    *,
    codigo: str | None = None,
    detalles: Any = None,
) -> dict[str, Any]:
    error: dict[str, Any] = {"mensaje": mensaje}
    if codigo is not None:
        error["codigo"] = codigo
    if detalles is not None:
        error["detalles"] = detalles
    return {
        "ok": False,
        "error": error,
    }


def respuesta_paginada(
    items: list[Any],
    *,
    pagina: int,
    tamano: int,
    total: int,
    mensaje: str,
) -> dict[str, Any]:
    return respuesta_ok(
        {
            "items": items,
            "pagination": {
                "page": pagina,
                "page_size": tamano,
                "total": total,
                "total_pages": (total + tamano - 1) // tamano if tamano else 0,
            },
        },
        mensaje,
    )