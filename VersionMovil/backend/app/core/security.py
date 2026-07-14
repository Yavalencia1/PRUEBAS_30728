# c:\Users\Anahi\PRUEBAS_30728\backend\app\core\security.py
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=[settings.password_hash_scheme], deprecated="auto")


def verificar_contraseña(contraseña_plana: str, contraseña_hash: str) -> bool:
    return pwd_context.verify(contraseña_plana, contraseña_hash)


def generar_hash_contraseña(contraseña: str) -> str:
    return pwd_context.hash(contraseña)


def crear_token_acceso(subject: str, tipo: str = "access", expires_delta: timedelta | None = None) -> str:
    return _crear_token(subject=subject, tipo=tipo, expires_delta=expires_delta)


def crear_token_refresh(subject: str, expires_delta: timedelta | None = None) -> str:
    return _crear_token(subject=subject, tipo="refresh", expires_delta=expires_delta)


def _crear_token(subject: str, tipo: str, expires_delta: timedelta | None = None) -> str:
    ahora = datetime.now(timezone.utc)
    expiracion = ahora + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    payload: dict[str, Any] = {
        "sub": subject,
        "typ": tipo,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": int(ahora.timestamp()),
        "exp": int(expiracion.timestamp()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decodificar_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.algorithm],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
    )


def obtener_payload_desde_token(token: str) -> dict[str, Any]:
    return decodificar_token(token)


def obtener_subject_desde_token(token: str) -> str:
    try:
        payload = decodificar_token(token)
    except JWTError as error:
        raise ValueError("Token inválido") from error

    subject = payload.get("sub")
    if not subject:
        raise ValueError("Token sin subject")
    return str(subject)