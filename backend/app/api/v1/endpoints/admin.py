import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_user, validate_secret_key
from app.models.marcas import Estado
from app.models.usuarios import Usuario
from app.schemas.usuarios import UsuarioCreate, UsuarioResponse

router = APIRouter()


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(422, "Password exceeds the 72-byte limit")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("ascii")



@router.get("/")
def get_admin():
    return {"status": "ok", "modulo": "Administración"}


@router.get("/registro-disponible")
def initial_registration_available(db: Session = Depends(get_db)):
    return {"disponible": db.query(Usuario.id).first() is None}


@router.post("/registro-inicial", response_model=UsuarioResponse, status_code=201)
def register_initial_admin(payload: UsuarioCreate, db: Session = Depends(get_db)):
    validate_secret_key()
    # Lock the table so concurrent requests cannot both create the first account.
    db.execute(text('LOCK TABLE "usuarios" IN EXCLUSIVE MODE'))
    if db.query(Usuario.id).first() is not None:
        db.rollback()
        raise HTTPException(409, "El registro inicial ya fue completado")
    if len(payload.password.encode("utf-8")) > 72:
        raise HTTPException(422, "Password exceeds the 72-byte limit")
    if not db.query(Estado.id).filter(Estado.id == payload.estado_id).scalar():
        raise HTTPException(400, "El estado seleccionado no existe")

    user = Usuario(
        nombre=payload.nombre.strip(),
        email=payload.email.strip().lower(),
        usuario=payload.usuario.strip(),
        password_hash=hash_password(payload.password),
        rol="administrador",
        estado_id=payload.estado_id,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "No se pudo registrar la cuenta inicial") from exc
    db.refresh(user)
    return user


@router.get("/usuarios", response_model=list[UsuarioResponse], dependencies=[Depends(require_admin_user)])
def list_users(db: Session = Depends(get_db)):
    return db.query(Usuario).order_by(Usuario.nombre, Usuario.id).all()


@router.post("/usuarios", response_model=UsuarioResponse, status_code=201, dependencies=[Depends(require_admin_user)])
def create_user(payload: UsuarioCreate, db: Session = Depends(get_db)):
    nombre = payload.nombre.strip()
    email = payload.email.strip().lower()
    username = payload.usuario.strip()
    if len(payload.password.encode("utf-8")) > 72:
        raise HTTPException(422, "La contraseña no puede superar 72 bytes")
    if not db.query(Estado.id).filter(Estado.id == payload.estado_id).scalar():
        raise HTTPException(400, "El estado seleccionado no existe")
    if db.query(Usuario.id).filter((Usuario.email == email) | (Usuario.usuario == username)).first():
        raise HTTPException(409, "El correo o el nombre de usuario ya está registrado")

    user = Usuario(
        nombre=nombre,
        email=email,
        usuario=username,
        password_hash=hash_password(payload.password),
        rol=payload.rol,
        estado_id=payload.estado_id,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "El correo o el nombre de usuario ya está registrado") from exc
    db.refresh(user)
    return user
