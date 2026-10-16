from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func

from app.core.database import Base


class Compra(Base):
    __tablename__ = "compras"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    marca_id = Column(Integer, ForeignKey("marcas.id", ondelete="SET NULL"), nullable=True, index=True)
    proveedor = Column(String(255), nullable=False, index=True)
    referencia = Column(String(120), nullable=True)
    fecha_compra = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    costo_productos_nio = Column(Numeric(12, 2), nullable=False, default=0)
    costo_envio_nio = Column(Numeric(12, 2), nullable=False, default=0)
    total_nio = Column(Numeric(12, 2), nullable=False, default=0)
    pago_efectivo_nio = Column(Numeric(12, 2), nullable=False, default=0)
    pago_cuenta_nio = Column(Numeric(12, 2), nullable=False, default=0)
    observaciones = Column(Text, nullable=True)


class CompraDetalle(Base):
    __tablename__ = "compra_detalles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    compra_id = Column(Integer, ForeignKey("compras.id", ondelete="CASCADE"), nullable=False, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False, index=True)
    cantidad = Column(Integer, nullable=False)
    costo_unitario_nio = Column(Numeric(12, 2), nullable=False)
    costo_envio_unitario_nio = Column(Numeric(12, 2), nullable=False, default=0)
    subtotal_nio = Column(Numeric(12, 2), nullable=False)
