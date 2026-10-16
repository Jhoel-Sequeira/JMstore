from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.clientes import Cliente
from app.models.compras import CompraDetalle
from app.models.inventario import Inventario, Producto
from app.models.marcas import Estado, Marca
from app.models.pos import MetodoPago, PagoVenta, Venta, VentaDetalle
from app.schemas.pos import AbonoCreate, InvoiceResponse, PagoFechaUpdate, VentaCreate
from app.services.stock_service import available_stock

router = APIRouter()
CENT = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


@router.get("/catalog")
def get_pos_catalog(db: Session = Depends(get_db)):
    products = (db.query(Producto, Marca.nombre_marca, Inventario.stock)
                .outerjoin(Marca, Marca.id == Producto.marca_id)
                .join(Inventario, Inventario.producto_id == Producto.id)
                .join(Estado, Estado.id == Producto.estado_id)
                .filter(Producto.id.in_(db.query(CompraDetalle.producto_id).distinct()))
                .filter(Inventario.stock > 0, func.lower(Estado.nombre) == "activo")
                .order_by(Producto.nombre).limit(1000).all())
    methods = db.query(MetodoPago).order_by(MetodoPago.id).all()
    return {
        "productos": [{"id": p.id, "nombre": p.nombre, "sku": p.sku, "precio": p.precio,
                       "imagen_url": p.imagen_url,
                       "stock": stock, "marca_nombre": brand} for p, brand, stock in products],
        "metodos_pago": [{"id": method.id, "nombre": method.metodo_pago} for method in methods],
    }


def _invoice_data(db: Session, sale_id: int):
    row = (db.query(Venta, Cliente, Estado.nombre)
           .join(Cliente, Cliente.id == Venta.cliente_id)
           .join(Estado, Estado.id == Venta.estado_id)
           .filter(Venta.id == sale_id).first())
    if not row:
        return None
    sale, client, state_name = row
    detail_rows = (db.query(VentaDetalle, Producto.nombre, Producto.sku)
                   .join(Producto, Producto.id == VentaDetalle.producto_id)
                   .filter(VentaDetalle.venta_id == sale_id).order_by(VentaDetalle.id).all())
    payment_rows = db.query(PagoVenta).filter(PagoVenta.venta_id == sale_id).order_by(PagoVenta.id).all()
    amount_paid = _money(sum((Decimal(payment.monto) for payment in payment_rows), Decimal("0")))
    balance = max(Decimal("0"), _money(Decimal(sale.total) - amount_paid))
    return {
        "id": sale.id,
        "cliente_id": client.id,
        "cliente_nombre": client.nombre_cliente,
        "cliente_telefono": client.telefono,
        "cliente_correo": client.correo,
        "total": sale.total,
        "monto_pagado": amount_paid,
        "saldo_pendiente": balance,
        "estado_pago": "Pagada" if balance == 0 else ("Abono pendiente" if amount_paid else "Pendiente"),
        "comision_pos": sale.comision_pos,
        "estado": state_name,
        "fecha_venta": sale.fecha_venta,
        "items": [{"producto_id": line.producto_id, "nombre": name, "sku": sku,
                   "cantidad": line.cantidad, "precio_unitario": line.precio_unitario,
                   "descuento": line.descuento, "subtotal": line.subtotal}
                  for line, name, sku in detail_rows],
        "pagos": [{"id": payment.id, "metodo_pago": payment.metodo_pago, "monto": payment.monto,
                   "comision_porcentaje": (payment.comision_porcentaje or Decimal("0")) * 100,
                   "monto_comision": payment.monto_comision or Decimal("0"),
                   "fecha_pago": payment.fecha_pago}
                  for payment in payment_rows],
    }


@router.get("/")
def list_invoices(q: str = "", limit: int = 100, db: Session = Depends(get_db)):
    query = (db.query(Venta, Cliente.nombre_cliente, Estado.nombre)
             .join(Cliente, Cliente.id == Venta.cliente_id)
             .join(Estado, Estado.id == Venta.estado_id))
    if q.strip():
        term = f"%{q.strip()}%"
        if q.strip().isdigit():
            query = query.filter((Venta.id == int(q.strip())) | Cliente.nombre_cliente.ilike(term))
        else:
            query = query.filter(Cliente.nombre_cliente.ilike(term))
    rows = query.order_by(Venta.fecha_venta.desc(), Venta.id.desc()).limit(max(1, min(limit, 500))).all()
    payment_stats = (db.query(PagoVenta.venta_id, func.sum(PagoVenta.monto), func.count(PagoVenta.id))
                     .filter(PagoVenta.venta_id.in_([sale.id for sale, _, _ in rows]))
                     .group_by(PagoVenta.venta_id).all()) if rows else []
    payment_stats_by_sale = {sale_id: (amount or Decimal("0"), count)
                             for sale_id, amount, count in payment_stats}
    result = []
    for sale, name, state in rows:
        paid_raw, payment_count = payment_stats_by_sale.get(sale.id, (Decimal("0"), 0))
        paid = _money(Decimal(paid_raw))
        balance = max(Decimal("0"), _money(Decimal(sale.total) - paid))
        result.append({"id": sale.id, "cliente_id": sale.cliente_id, "cliente_nombre": name, "total": sale.total,
             "monto_pagado": paid, "saldo_pendiente": balance,
             "estado_pago": "Pagada" if balance == 0 else ("Abono pendiente" if paid else "Pendiente"),
             "cuotas": payment_count, "estado": state, "fecha_venta": sale.fecha_venta})
    return result


@router.get("/{sale_id}", response_model=InvoiceResponse)
def get_invoice(sale_id: int, db: Session = Depends(get_db)):
    invoice = _invoice_data(db, sale_id)
    if not invoice:
        raise HTTPException(404, "Factura no encontrada")
    return invoice


@router.post("/{sale_id}/abonos", response_model=InvoiceResponse)
def add_payment(sale_id: int, payload: AbonoCreate, db: Session = Depends(get_db)):
    sale = db.query(Venta).filter(Venta.id == sale_id).with_for_update().first()
    if not sale:
        raise HTTPException(404, "Factura no encontrada")
    method = db.query(MetodoPago).filter(MetodoPago.id == payload.metodo_pago_id).first()
    if not method:
        raise HTTPException(400, "El método de pago seleccionado no está disponible")
    paid = _money(db.query(func.coalesce(func.sum(PagoVenta.monto), 0))
                  .filter(PagoVenta.venta_id == sale.id).scalar() or Decimal("0"))
    balance = max(Decimal("0"), _money(Decimal(sale.total) - paid))
    amount = _money(payload.monto)
    if balance <= 0:
        raise HTTPException(409, "Esta factura ya está pagada")
    if amount <= 0 or amount > balance:
        raise HTTPException(400, f"El abono debe ser mayor que cero y no superar el saldo de C$ {balance}")

    rate = payload.comision_porcentaje / Decimal("100")
    commission = _money(amount * rate)
    sale.comision_pos = _money(Decimal(sale.comision_pos or 0) + commission)
    db.add(PagoVenta(venta_id=sale.id, metodo_pago=method.metodo_pago, monto=amount,
                     comision_porcentaje=rate, monto_comision=commission))
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return _invoice_data(db, sale.id)


@router.patch("/abonos/{payment_id}/fecha")
def update_payment_date(payment_id: int, payload: PagoFechaUpdate,
                         db: Session = Depends(get_db)):
    payment = db.query(PagoVenta).filter(PagoVenta.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Abono no encontrado")
    payment.fecha_pago = payload.fecha_pago
    db.commit()
    return {"id": payment.id, "fecha_pago": payment.fecha_pago}


@router.post("/", response_model=InvoiceResponse, status_code=201)
def create_invoice(payload: VentaCreate, db: Session = Depends(get_db)):
    product_ids = [item.producto_id for item in payload.items]
    if len(product_ids) != len(set(product_ids)):
        raise HTTPException(400, "Cada producto debe aparecer una sola vez en la factura")

    client = db.query(Cliente).filter(Cliente.id == payload.cliente_id).first()
    if not client:
        raise HTTPException(400, "Selecciona un cliente válido")

    methods = {method.id: method for method in db.query(MetodoPago)
               .filter(MetodoPago.id.in_([payment.metodo_pago_id for payment in payload.pagos])).all()}
    if len(methods) != len({payment.metodo_pago_id for payment in payload.pagos}):
        raise HTTPException(400, "Uno de los métodos de pago ya no está disponible")

    if not payload.pagos:
        methods = {method.id: method for method in db.query(MetodoPago).order_by(MetodoPago.id).all()}

    prepared_items = []
    total = Decimal("0")
    for item in payload.items:
        product = (db.query(Producto).filter(Producto.id == item.producto_id)
                   .with_for_update().first())
        if not product:
            raise HTTPException(400, f"El producto {item.producto_id} ya no existe")
        has_purchase = db.query(CompraDetalle.id).filter(
            CompraDetalle.producto_id == product.id
        ).first()
        if not has_purchase:
            raise HTTPException(409, f"{product.nombre} no tiene compras registradas y no puede venderse")
        inventory = (db.query(Inventario).filter(Inventario.producto_id == product.id)
                     .with_for_update().first())
        stock = inventory.stock if inventory else available_stock(db, product.id)
        if stock < item.cantidad:
            raise HTTPException(409, f"Stock insuficiente para {product.nombre}. Disponible: {stock}")
        gross = _money(Decimal(product.precio) * item.cantidad)
        discount = _money(item.descuento)
        if discount > gross:
            raise HTTPException(400, f"El descuento supera el importe de {product.nombre}")
        subtotal = _money(gross - discount)
        total += subtotal
        prepared_items.append((product, inventory, item.cantidad, discount, subtotal))
    total = _money(total)

    normalized_payments = []
    for payment in payload.pagos:
        amount = _money(payment.monto)
        if amount <= 0:
            raise HTTPException(400, "Cada abono debe ser de al menos C$ 0.01")
        normalized_payments.append((payment, amount))
    paid = sum((amount for _, amount in normalized_payments), Decimal("0"))
    if paid > total:
        raise HTTPException(400, f"Los pagos suman C$ {paid}, más que el total de C$ {total}")

    state = (db.query(Estado).filter(func.lower(Estado.modulo) == "ventas",
                                     func.lower(Estado.nombre) == "facturada").first())
    if not state:
        state = Estado(modulo="ventas", nombre="Facturada", descripcion="Venta emitida")
        db.add(state)
        db.flush()

    commission_total = Decimal("0")
    available_method = next(iter(methods.values()), None)
    if not available_method:
        raise HTTPException(400, "Configura al menos un método de pago")
    sale = Venta(cliente_id=client.id, usuario_id=None,
                 metodo_pago_id=payload.pagos[0].metodo_pago_id if payload.pagos else available_method.id,
                 total=total, comision_pos=0, estado_id=state.id)
    db.add(sale)
    db.flush()

    for product, inventory, quantity, discount, subtotal in prepared_items:
        db.add(VentaDetalle(venta_id=sale.id, producto_id=product.id, cantidad=quantity,
                            precio_unitario=product.precio, descuento=discount, subtotal=subtotal))
        inventory.stock -= quantity

    for payment, amount in normalized_payments:
        method = methods[payment.metodo_pago_id]
        commission_rate = payment.comision_porcentaje / Decimal("100")
        commission = _money(amount * commission_rate)
        commission_total += commission
        db.add(PagoVenta(venta_id=sale.id, metodo_pago=method.metodo_pago,
                         monto=amount, comision_porcentaje=commission_rate,
                         monto_comision=commission))

    sale.comision_pos = _money(commission_total)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(sale)
    return _invoice_data(db, sale.id)
