from datetime import datetime, time
from decimal import Decimal, ROUND_HALF_UP
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.compras import Compra, CompraDetalle
from app.models.inventario import Inventario, Producto
from app.models.marcas import Estado, Marca
from app.schemas.compras import CompraCreate, CompraPagoActualizar

router = APIRouter()
CENT = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _purchase_data(db: Session, purchase: Compra) -> dict:
    details = (db.query(CompraDetalle, Producto.nombre, Producto.sku, Marca.nombre_marca)
               .join(Producto, Producto.id == CompraDetalle.producto_id)
               .outerjoin(Marca, Marca.id == Producto.marca_id)
               .filter(CompraDetalle.compra_id == purchase.id)
               .order_by(CompraDetalle.id).all())
    return {
        "id": purchase.id,
        "marca_id": purchase.marca_id,
        "proveedor": purchase.proveedor,
        "referencia": purchase.referencia,
        "fecha_compra": purchase.fecha_compra,
        "costo_productos_nio": purchase.costo_productos_nio,
        "costo_envio_nio": purchase.costo_envio_nio,
        "total_nio": purchase.total_nio,
        "pago_efectivo_nio": purchase.pago_efectivo_nio,
        "pago_cuenta_nio": purchase.pago_cuenta_nio,
        "observaciones": purchase.observaciones,
        "items": [{
            "producto_id": detail.producto_id,
            "nombre": name,
            "sku": sku,
            "marca_nombre": brand,
            "cantidad": detail.cantidad,
            "costo_unitario_nio": detail.costo_unitario_nio,
            "costo_envio_unitario_nio": detail.costo_envio_unitario_nio,
            "subtotal_nio": detail.subtotal_nio,
        } for detail, name, sku, brand in details],
    }


@router.get("/")
def list_purchases(db: Session = Depends(get_db)):
    purchases = db.query(Compra).order_by(Compra.fecha_compra.desc(), Compra.id.desc()).limit(500).all()
    return [_purchase_data(db, purchase) for purchase in purchases]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_purchase(payload: CompraCreate, db: Session = Depends(get_db)):
    supplier = db.query(Marca).filter(Marca.id == payload.marca_id).first()
    if not supplier:
        raise HTTPException(404, "La marca seleccionada como proveedor no existe")

    product_ids = [item.producto_id for item in payload.items if item.producto_id is not None]
    if len(product_ids) != len(set(product_ids)):
        raise HTTPException(422, "Agrega cada producto una sola vez y ajusta su cantidad")

    products = (db.query(Producto).filter(Producto.id.in_(sorted(product_ids)))
                .order_by(Producto.id).with_for_update().all())
    products_by_id = {product.id: product for product in products}
    missing = [product_id for product_id in product_ids if product_id not in products_by_id]
    if missing:
        raise HTTPException(404, f"Producto no encontrado: {missing[0]}")
    base_cost = _money(sum((item.costo_unitario_nio * item.cantidad for item in payload.items), Decimal("0")))
    shipping_total = _money(payload.costo_envio_nio)
    total_purchase = _money(base_cost + shipping_total)
    paid_cash = _money(payload.pago_efectivo_nio)
    paid_account = _money(payload.pago_cuenta_nio)
    if paid_cash + paid_account > total_purchase:
        raise HTTPException(422, "Los pagos en efectivo y cuenta no pueden superar el total de la compra")
    weights = [item.costo_unitario_nio * item.cantidad for item in payload.items]
    total_weight = sum(weights, Decimal("0"))
    if total_weight == 0:
        weights = [Decimal(item.cantidad) for item in payload.items]
        total_weight = sum(weights, Decimal("0"))

    purchase = Compra(
        marca_id=supplier.id,
        proveedor=supplier.nombre_marca,
        referencia=payload.referencia.strip() or None if payload.referencia else None,
        fecha_compra=datetime.combine(payload.fecha_compra, time.min),
        costo_productos_nio=base_cost,
        costo_envio_nio=shipping_total,
        total_nio=total_purchase,
        pago_efectivo_nio=paid_cash,
        pago_cuenta_nio=paid_account,
        observaciones=payload.observaciones.strip() or None if payload.observaciones else None,
    )
    db.add(purchase)
    db.flush()

    remaining_shipping = shipping_total
    for index, item in enumerate(payload.items):
        if index == len(payload.items) - 1:
            line_shipping = remaining_shipping
        else:
            line_shipping = _money(shipping_total * weights[index] / total_weight)
            remaining_shipping -= line_shipping
        shipping_per_unit = _money(line_shipping / item.cantidad)
        product = products_by_id.get(item.producto_id) if item.producto_id is not None else None
        if product is None:
            new_product = item.nuevo_producto
            if new_product is None:
                raise HTTPException(422, "Cada línea debe tener un producto existente o uno nuevo")
            active_state = (db.query(Estado).filter(func.lower(Estado.nombre) == "activo")
                            .order_by(Estado.id).first())
            if active_state is None:
                active_state = Estado(modulo="inventario", nombre="Activo", descripcion="Producto disponible")
                db.add(active_state)
                db.flush()
            sku = new_product.sku.strip() if new_product.sku else None
            product_cost = item.costo_unitario_nio + shipping_per_unit
            selling_price = new_product.precio if new_product.precio is not None else _money(product_cost * Decimal("1.30"))
            product = Producto(
                marca_id=supplier.id,
                codigo_qr=(new_product.codigo_qr.strip() if new_product.codigo_qr else None)
                or sku or f"JM-{uuid.uuid4().hex[:10].upper()}",
                sku=sku,
                nombre=new_product.nombre.strip(),
                descripcion=new_product.descripcion.strip() or None if new_product.descripcion else None,
                precio=selling_price,
                costo_nio=item.costo_unitario_nio,
                costo_envio_nio=shipping_per_unit,
                margen_utilidad_pct=30,
                estado_id=active_state.id,
            )
            db.add(product)
            db.flush()
            inventory = Inventario(producto_id=product.id, stock=0,
                                   stock_critico=new_product.stock_critico)
            db.add(inventory)
            db.flush()
        else:
            inventory = (db.query(Inventario).filter(Inventario.producto_id == product.id)
                         .with_for_update().first())
            if inventory is None:
                inventory = Inventario(producto_id=product.id, stock=0)
                db.add(inventory)
                db.flush()
        purchase_line = CompraDetalle(
            compra_id=purchase.id,
            producto_id=product.id,
            cantidad=item.cantidad,
            costo_unitario_nio=item.costo_unitario_nio,
            costo_envio_unitario_nio=shipping_per_unit,
            subtotal_nio=_money(item.costo_unitario_nio * item.cantidad + line_shipping),
        )
        db.add(purchase_line)
        db.flush()
        inventory.stock += item.cantidad
        product.costo_nio = item.costo_unitario_nio
        product.costo_envio_nio = shipping_per_unit

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(500, "No se pudo guardar la compra. Revisa que aplicaste las tablas de Compras en Supabase.")
    db.refresh(purchase)
    return _purchase_data(db, purchase)


@router.get("/resumen")
def purchase_summary(db: Session = Depends(get_db)):
    count, total = db.query(func.count(Compra.id), func.coalesce(func.sum(Compra.total_nio), 0)).one()
    units = db.query(func.coalesce(func.sum(CompraDetalle.cantidad), 0)).scalar()
    return {"cantidad": count, "total_nio": total, "unidades": units}


@router.patch("/{purchase_id}/pagos")
def update_purchase_payments(purchase_id: int, payload: CompraPagoActualizar,
                             db: Session = Depends(get_db)):
    purchase = db.query(Compra).filter(Compra.id == purchase_id).with_for_update().first()
    if purchase is None:
        raise HTTPException(404, "Compra no encontrada")
    cash = _money(payload.pago_efectivo_nio)
    account = _money(payload.pago_cuenta_nio)
    if cash + account > Decimal(purchase.total_nio):
        raise HTTPException(422, "Los pagos registrados superan el total de la compra")
    purchase.pago_efectivo_nio = cash
    purchase.pago_cuenta_nio = account
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(500, "No se pudo actualizar el pago de la compra")
    db.refresh(purchase)
    return _purchase_data(db, purchase)
