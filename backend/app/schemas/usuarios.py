from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UsuarioCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    usuario: str = Field(min_length=3, max_length=100, pattern=r"^[A-Za-z0-9._-]+$")
    password: str = Field(min_length=10, max_length=72)
    rol: str = Field(pattern=r"^(administrador|cajero|inventario|supervisor)$")
    estado_id: int = Field(default=1, ge=1)


class UsuarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: str
    usuario: str
    rol: str
    estado_id: int
    creado_en: datetime | None = None
