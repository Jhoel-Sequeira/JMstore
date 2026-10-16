from sqlalchemy import Column, Computed, ForeignKey, Integer, Numeric, String, Text

from app.core.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    marca_id = Column(Integer, ForeignKey("marcas.id"), nullable=False, index=True)
    codigo_qr = Column(String(255), nullable=False, index=True)
    sku = Column(String(100), nullable=True, index=True)
    nombre = Column(String(255), nullable=False, index=True)
    descripcion = Column(Text, nullable=True)
    precio = Column(Numeric(12, 2), nullable=False)
    costo_nio = Column(Numeric, nullable=True)
    costo_envio_nio = Column(Numeric(12, 2), nullable=False, default=0)
    costo_total_nio = Column(Numeric(12, 2), Computed("round(coalesce(costo_nio, 0) + costo_envio_nio, 2)", persisted=True))
    precio_minimo_nio = Column(Numeric(12, 2), Computed("round(coalesce(costo_nio, 0) + costo_envio_nio, 2)", persisted=True))
    margen_utilidad_pct = Column(Numeric(7, 2), nullable=False, default=30)
    utilidad_nio = Column(Numeric(12, 2), Computed("round((coalesce(costo_nio, 0) + costo_envio_nio) * margen_utilidad_pct / 100, 2)", persisted=True))
    precio_sugerido_nio = Column(Numeric(12, 2), Computed("round((coalesce(costo_nio, 0) + costo_envio_nio) * (1 + margen_utilidad_pct / 100), 2)", persisted=True))
    imagen_url = Column(Text, nullable=True)
    estado_id = Column(Integer, ForeignKey("estados.id"), nullable=False, default=1)


class Inventario(Base):
    __tablename__ = "inventario"

    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), primary_key=True)
    stock = Column(Integer, nullable=False, default=0)
    stock_critico = Column(Integer, nullable=False, default=5)
