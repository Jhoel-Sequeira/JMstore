from sqlalchemy import BigInteger, Column, ForeignKey, Integer, Numeric, String, DateTime, func

from app.core.database import Base


class MetodoPago(Base):
    __tablename__ = "metodo_pago"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    metodo_pago = Column(String(100), nullable=False)


class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # The app does not currently map the usuarios table; PostgreSQL still enforces
    # its foreign key when a non-null usuario_id is written.
    usuario_id = Column(Integer, nullable=True)
    cliente_id = Column(BigInteger, ForeignKey("clientes.id"), nullable=False)
    metodo_pago_id = Column(BigInteger, ForeignKey("metodo_pago.id"), nullable=False)
    total = Column(Numeric(12, 2), nullable=False, default=0)
    comision_pos = Column(Numeric(12, 2), nullable=False, default=0)
    estado_id = Column(Integer, ForeignKey("estados.id"), nullable=False)
    fecha_venta = Column(DateTime, nullable=True, server_default=func.current_timestamp())


class VentaDetalle(Base):
    __tablename__ = "venta_detalles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(12, 2), nullable=False)
    descuento = Column(Numeric(12, 2), nullable=False, default=0)
    subtotal = Column(Numeric(12, 2), nullable=False)


class PagoVenta(Base):
    __tablename__ = "pagos_venta"

    id = Column(Integer, primary_key=True, autoincrement=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    metodo_pago = Column(String(100), nullable=False)
    monto = Column(Numeric(12, 2), nullable=False)
    comision_porcentaje = Column(Numeric(5, 4), nullable=True, default=0)
    monto_comision = Column(Numeric(12, 2), nullable=True, default=0)
    fecha_pago = Column(DateTime, nullable=False, server_default=func.current_timestamp())
