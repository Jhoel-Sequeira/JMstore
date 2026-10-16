# Modelos SQLAlchemy para Gestión de Clientes
from sqlalchemy import BigInteger, Column, String

from app.core.database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    nombre_cliente = Column(String(255), nullable=False)
    telefono = Column(String(50), nullable=True)
    correo = Column(String(255), nullable=True)
