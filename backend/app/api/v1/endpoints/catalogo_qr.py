from io import BytesIO

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.inventario import Producto
from app.models.marcas import Marca
from app.schemas.inventario import ProductoResponse
from app.services.stock_service import available_stock_by_product, critical_stock_by_product

router = APIRouter()


@router.get("/", response_model=list[ProductoResponse])
def get_catalog(db: Session = Depends(get_db)):
    products = (db.query(Producto, Marca.nombre_marca)
                .outerjoin(Marca, Marca.id == Producto.marca_id)
                .order_by(Producto.nombre).limit(1000).all())
    product_ids = [product.id for product, _ in products]
    stocks = available_stock_by_product(db, product_ids)
    critical = critical_stock_by_product(db, product_ids)
    return [{**{column.name: getattr(product, column.name) for column in Producto.__table__.columns},
             "stock": stocks.get(product.id, 0), "stock_critico": critical.get(product.id, 5),
             "marca_nombre": brand_name} for product, brand_name in products]


@router.get("/{product_id}/qr")
def get_product_qr(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Producto).filter(Producto.id == product_id).first()
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    image = qrcode.make(product.codigo_qr)
    output = BytesIO()
    image.save(output, format="PNG")
    output.seek(0)
    return StreamingResponse(output, media_type="image/png", headers={
        "Content-Disposition": f'inline; filename="producto-{product.id}-qr.png"'
    })
