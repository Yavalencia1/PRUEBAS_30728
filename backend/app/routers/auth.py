# c:\Users\Anahi\PRUEBAS_30728\backend\app\routers\auth.py
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    crear_token_acceso,
    crear_token_refresh,
    generar_hash_contraseña,
    obtener_payload_desde_token,
    obtener_subject_desde_token,
    verificar_contraseña,
)
from app.models.usuario import RolUsuario, Usuario
from app.schemas.auth import AuthMeResponse, LoginRequest, RefreshTokenRequest, RegistroRequest, TokenResponse

router = APIRouter(tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def _respuesta_estandarizada(datos: object, mensaje: str) -> dict:
    return {
        "ok": True,
        "data": datos,
        "mensaje": mensaje,
    }


async def obtener_usuario_actual(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    try:
        payload = obtener_payload_desde_token(token)
        if payload.get("typ") != "access":
            raise ValueError("Se requiere un token de acceso")
        email = obtener_subject_desde_token(token)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error)) from error

    resultado = await db.execute(select(Usuario).where(Usuario.email == email))
    usuario = resultado.scalar_one_or_none()
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return usuario


@router.post("/registro", response_model=dict)
async def registrar_usuario(
    datos: RegistroRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        rol_usuario = RolUsuario(datos.rol.lower())
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol inválido") from error

    usuario = Usuario(
        nombre=datos.nombre,
        apellido=datos.apellido,
        email=datos.email.lower(),
        telefono=datos.telefono,
        password_hash=generar_hash_contraseña(datos.password),
        rol=rol_usuario,
    )

    db.add(usuario)
    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email ya está registrado") from error

    await db.refresh(usuario)
    return _respuesta_estandarizada(
        AuthMeResponse.model_validate(usuario).model_dump(),
        "Usuario registrado correctamente",
    )


@router.post("/login", response_model=dict)
async def iniciar_sesion(
    datos: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    resultado = await db.execute(select(Usuario).where(Usuario.email == datos.email.lower()))
    usuario = resultado.scalar_one_or_none()
    if usuario is None or not verificar_contraseña(datos.password, usuario.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    access_token = crear_token_acceso(
        subject=usuario.email,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    refresh_token = crear_token_refresh(
        subject=usuario.email,
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
    )

    datos_respuesta = {
        "tokens": TokenResponse(access_token=access_token, refresh_token=refresh_token).model_dump(),
        "usuario": AuthMeResponse.model_validate(usuario).model_dump(),
    }
    return _respuesta_estandarizada(datos_respuesta, "Inicio de sesión correcto")


@router.post("/refresh", response_model=dict)
async def refrescar_token(
    datos: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        payload = obtener_payload_desde_token(datos.refresh_token)
        if payload.get("typ") != "refresh":
            raise ValueError("Se requiere un token de refresco")
        email = obtener_subject_desde_token(datos.refresh_token)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error)) from error

    resultado = await db.execute(select(Usuario).where(Usuario.email == email))
    usuario = resultado.scalar_one_or_none()
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")

    access_token = crear_token_acceso(
        subject=usuario.email,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    refresh_token = crear_token_refresh(
        subject=usuario.email,
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
    )

    return _respuesta_estandarizada(
        TokenResponse(access_token=access_token, refresh_token=refresh_token).model_dump(),
        "Token renovado correctamente",
    )


@router.get("/me", response_model=dict)
async def obtener_mi_perfil(usuario: Usuario = Depends(obtener_usuario_actual)) -> dict:
    return _respuesta_estandarizada(
        AuthMeResponse.model_validate(usuario).model_dump(),
        "Perfil obtenido correctamente",
    )