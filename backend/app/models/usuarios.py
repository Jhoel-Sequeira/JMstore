from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    usuario = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column("pass", String(255), nullable=False)
    rol = Column(String(50), nullable=False)
    estado_id = Column(Integer, ForeignKey("estados.id"), nullable=False, default=1)
    creado_en = Column(DateTime, nullable=True, server_default=func.current_timestamp())
