from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.usuarios import Usuario

bearer_scheme = HTTPBearer(auto_error=False)
ACCESS_TOKEN_HOURS = 8


def validate_secret_key() -> None:
    secret = settings.SECRET_KEY
    if len(secret) < 32 or secret in {"multimarca_secret_key_jwt_default_dev", "tu_clave_secreta_aqui"}:
        raise HTTPException(503, "Configura una SECRET_KEY aleatoria de al menos 32 caracteres en backend/.env")


def create_access_token(user_id: int) -> str:
    validate_secret_key()
    expires = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": expires}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    unauthorized = HTTPException(401, "Inicia sesión para continuar", headers={"WWW-Authenticate": "Bearer"})
    if credentials is None:
        raise unauthorized
    try:
        validate_secret_key()
        claims = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        subject = claims.get("sub")
        user_id = int(subject)
    except (JWTError, TypeError, ValueError):
        raise unauthorized
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if user is None:
        raise unauthorized
    return user


def require_admin_user(user: Usuario = Depends(get_current_user)) -> Usuario:
    if user.rol != "administrador":
        raise HTTPException(403, "Se requiere una cuenta administradora")
    return user
