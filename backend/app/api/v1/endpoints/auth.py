import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.models.usuarios import Usuario
from app.schemas.auth import LoginRequest, LoginResponse
from app.schemas.usuarios import UsuarioResponse

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    identity = payload.usuario.strip()
    user = db.query(Usuario).filter(or_(Usuario.usuario == identity, Usuario.email == identity.lower())).first()
    password_bytes = payload.password.encode("utf-8")
    password_matches = False
    if user is not None and len(password_bytes) <= 72:
        try:
            password_matches = bcrypt.checkpw(password_bytes, user.password_hash.encode("ascii"))
        except (ValueError, TypeError):
            password_matches = False
    if not password_matches:
        raise HTTPException(401, "Usuario o contraseña incorrectos")

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "usuario": user,
    }


@router.get("/me", response_model=UsuarioResponse)
def current_user(user: Usuario = Depends(get_current_user)):
    return user
