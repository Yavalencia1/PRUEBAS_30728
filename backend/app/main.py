# c:\Users\Anahi\PRUEBAS_30728\backend\app\main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from fastapi import HTTPException

from app.core.config import settings
from app.core.responses import respuesta_error
from app.routers.auth import router as auth_router
from app.routers.usuarios import router as usuarios_router
from app.routers.recorridos import router as recorridos_router
from app.routers.alumnos import router as alumnos_router
from app.routers.sesiones import router as sesiones_router
from app.routers.pagos import router as pagos_router
from app.routers.rutas import router as rutas_router
from app.routers.asistencias import router as asistencias_router
from app.routers.paradas import router as paradas_router
from app.routers.notificaciones import router as notificaciones_router
from app.routers.ubicaciones_gps import router as ubicaciones_gps_router
from app.routers.dashboard import router as dashboard_router
from app.routers.websockets import router as websockets_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list() or ["http://localhost:3000", "http://localhost:5000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = settings.api_v1_prefix
app.include_router(auth_router, prefix=f"{prefix}/auth")
app.include_router(usuarios_router, prefix=f"{prefix}/usuarios")
app.include_router(recorridos_router, prefix=f"{prefix}/recorridos")
app.include_router(alumnos_router, prefix=f"{prefix}/alumnos")
app.include_router(sesiones_router, prefix=f"{prefix}")
app.include_router(pagos_router, prefix=f"{prefix}")
app.include_router(rutas_router, prefix=f"{prefix}")
app.include_router(asistencias_router, prefix=f"{prefix}")
app.include_router(paradas_router, prefix=f"{prefix}")
app.include_router(notificaciones_router, prefix=f"{prefix}")
app.include_router(ubicaciones_gps_router, prefix=f"{prefix}")
app.include_router(dashboard_router, prefix=f"{prefix}/dashboard")

# Websockets no llevan el prefijo estandar api/v1 para mantener compatibilidad con el frontend actual
app.include_router(websockets_router)


@app.exception_handler(HTTPException)
async def manejar_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
    mensaje = exc.detail if isinstance(exc.detail, str) else "Solicitud invalida"
    return JSONResponse(
        status_code=exc.status_code,
        content=respuesta_error(mensaje, codigo="http_error"),
    )


@app.exception_handler(RequestValidationError)
async def manejar_validacion_exception(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=respuesta_error(
            "Error de validacion",
            codigo="validation_error",
            detalles=exc.errors(),
        ),
    )


@app.exception_handler(Exception)
async def manejar_excepcion_generica(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=respuesta_error("Error interno del servidor", codigo="internal_error"),
    )


@app.get("/")
async def raiz() -> dict:
    return {
        "ok": True,
        "data": {"app": settings.app_name, "env": settings.app_env},
        "mensaje": "RouteKids API activa",
    }