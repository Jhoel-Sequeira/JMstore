from io import BytesIO
import uuid

import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.inventario import Producto
from app.models.marcas import Estado, Marca
from app.schemas.inventario import ProductoCreate, ProductoResponse, ProductoUpdate
from app.services.stock_service import available_stock_by_product, critical_stock_by_product

router = APIRouter()


def _product_response(product: Producto, brand_name: str | None, db: Session) -> dict:
    stock = available_stock_by_product(db, [product.id]).get(product.id, 0)
    critical = critical_stock_by_product(db, [product.id]).get(product.id, 5)
    return {**{column.name: getattr(product, column.name) for column in Producto.__table__.columns},
            "stock": stock, "stock_critico": critical, "marca_nombre": brand_name}


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


@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def create_catalog_product(payload: ProductoCreate, db: Session = Depends(get_db)):
    if not db.query(Marca).filter(Marca.id == payload.marca_id).first():
        raise HTTPException(400, "La marca seleccionada no existe")
    if not db.query(Estado).filter(Estado.id == payload.estado_id).first():
        raise HTTPException(400, "El estado seleccionado no existe")
    sku = payload.sku.strip() if payload.sku else None
    product = Producto(
        marca_id=payload.marca_id,
        codigo_qr=(payload.codigo_qr.strip() if payload.codigo_qr else None) or sku or f"JM-{uuid.uuid4().hex[:10].upper()}",
        sku=sku,
        nombre=payload.nombre.strip(),
        descripcion=payload.descripcion.strip() if payload.descripcion else None,
        precio=payload.precio,
        costo_nio=payload.costo_nio,
        costo_envio_nio=payload.costo_envio_nio,
        margen_utilidad_pct=payload.margen_utilidad_pct,
        imagen_url=payload.imagen_url,
        estado_id=payload.estado_id,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return _product_response(product, db.query(Marca.nombre_marca).filter(Marca.id == product.marca_id).scalar(), db)


@router.put("/{product_id}", response_model=ProductoResponse)
def update_catalog_product(product_id: int, payload: ProductoUpdate, db: Session = Depends(get_db)):
    product = db.query(Producto).filter(Producto.id == product_id).first()
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    changes = payload.model_dump(exclude_unset=True, exclude={"stock", "stock_critico"})
    if "marca_id" in changes and not db.query(Marca).filter(Marca.id == changes["marca_id"]).first():
        raise HTTPException(400, "La marca seleccionada no existe")
    if "estado_id" in changes and not db.query(Estado).filter(Estado.id == changes["estado_id"]).first():
        raise HTTPException(400, "El estado seleccionado no existe")
    for field, value in changes.items():
        if field in {"nombre", "sku", "codigo_qr", "descripcion"} and isinstance(value, str):
            value = value.strip()
            if field == "codigo_qr" and not value:
                value = changes.get("sku") or product.sku or f"JM-{uuid.uuid4().hex[:10].upper()}"
            elif field != "nombre" and not value:
                value = None
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return _product_response(product, db.query(Marca.nombre_marca).filter(Marca.id == product.marca_id).scalar(), db)


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
