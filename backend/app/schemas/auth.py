from pydantic import BaseModel, Field
from app.schemas.usuarios import UsuarioResponse


class LoginRequest(BaseModel):
    usuario: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=72)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse
