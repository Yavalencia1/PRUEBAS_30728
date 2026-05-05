# c:\Users\Anahi\PRUEBAS_30728\backend\app\schemas\auth.py
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


import re

class RegistroRequest(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    apellido: str = Field(min_length=2, max_length=100)
    email: EmailStr
    telefono: str = Field(pattern=r"^\d{10}$")
    password: str = Field(min_length=8, max_length=128)
    confirmar_password: str
    rol: str = Field(default="padre")

    @field_validator("nombre", "apellido")
    @classmethod
    def validar_solo_letras(cls, v: str) -> str:
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", v):
            raise ValueError("Solo debe contener letras y espacios")
        return v

    @field_validator("email")
    @classmethod
    def email_a_minusculas(cls, v: str) -> str:
        return v.lower()

    @field_validator("password")
    @classmethod
    def validar_password(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Debe contener al menos una mayúscula")
        if not re.search(r"\d", v):
            raise ValueError("Debe contener al menos un número")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Debe contener al menos un carácter especial")
        return v

    @model_validator(mode="after")
    def validar_passwords(self) -> "RegistroRequest":
        if self.password != self.confirmar_password:
            raise ValueError("Las contraseñas no coinciden")
        return self

    @field_validator("rol")
    @classmethod
    def validar_rol(cls, v: str) -> str:
        roles_permitidos = {"padre", "conductor", "dueno", "admin"}
        if v.lower() not in roles_permitidos:
            raise ValueError(f"Rol debe ser uno de: {', '.join(roles_permitidos)}")
        return v.lower()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthMeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    apellido: str
    email: EmailStr
    telefono: str | None
    rol: str
