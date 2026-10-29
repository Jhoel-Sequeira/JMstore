from sqlalchemy import Column, ForeignKey, String

from app.core.database import Base


class ProductoCodigoQR(Base):
    __tablename__ = "producto_codigos_qr"

    codigo_qr = Column(String(255), primary_key=True)
    producto_id = Column(ForeignKey("productos.id", ondelete="CASCADE"), nullable=False, index=True)
