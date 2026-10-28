from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.clientes import Cliente
from app.models.compras import Compra, CompraDetalle
from app.models.inventario import Inventario, Producto
from app.models.marcas import Marca
from app.models.pos import PagoVenta, Venta, VentaDetalle


BUSINESS_TIMEZONE = ZoneInfo("America/Managua")
PERIOD_LABELS = {
    "today": "Hoy",
    "week": "Últimos 7 días",
    "month": "Este mes",
    "year": "Este año",
}


def _bounds(period: str, today: date) -> tuple[datetime, datetime, datetime, datetime]:
    """Return current and previous period bounds as local, naive DB timestamps."""
    if period == "today":
        start_date = today
        end_date = today + timedelta(days=1)
        previous_start = today - timedelta(days=1)
    elif period == "week":
        start_date = today - timedelta(days=6)
        end_date = today + timedelta(days=1)
        previous_start = start_date - timedelta(days=7)
    elif period == "year":
        start_date = date(today.year, 1, 1)
        end_date = date(today.year + 1, 1, 1)
        previous_start = date(today.year - 1, 1, 1)
    else:
        start_date = date(today.year, today.month, 1)
        end_date = date(today.year + (today.month == 12), 1 if today.month == 12 else today.month + 1, 1)
        previous_start = date(today.year - (today.month == 1), 12 if today.month == 1 else today.month - 1, 1)

    return (
        datetime.combine(start_date, time.min),
        datetime.combine(end_date, time.min),
        datetime.combine(previous_start, time.min),
        datetime.combine(start_date, time.min),
    )


def _as_float(value) -> float:
    return float(value or 0)


def _sales_totals(db: Session, start: datetime, end: datetime) -> tuple[float, int]:
    total, count = (
        db.query(func.coalesce(func.sum(Venta.total), 0), func.count(Venta.id))
        .filter(Venta.fecha_venta >= start, Venta.fecha_venta < end)
        .one()
    )
    return _as_float(total), int(count or 0)


def _purchase_totals(db: Session, start: datetime, end: datetime) -> tuple[float, int, int]:
    total, count = (
        db.query(func.coalesce(func.sum(Compra.total_nio), 0), func.count(Compra.id))
        .filter(Compra.fecha_compra >= start, Compra.fecha_compra < end)
        .one()
    )
    units = (
        db.query(func.coalesce(func.sum(CompraDetalle.cantidad), 0))
        .join(Compra, Compra.id == CompraDetalle.compra_id)
        .filter(Compra.fecha_compra >= start, Compra.fecha_compra < end)
        .scalar()
    )
    return _as_float(total), int(count or 0), int(units or 0)


def _cash_account_summary(db: Session, start: datetime, end: datetime) -> dict:
    rows = (
        db.query(
            PagoVenta.metodo_pago,
            func.coalesce(func.sum(PagoVenta.monto), 0),
            func.coalesce(func.sum(PagoVenta.monto_comision), 0),
        )
        .join(Venta, Venta.id == PagoVenta.venta_id)
        .filter(PagoVenta.fecha_pago >= start, PagoVenta.fecha_pago < end)
        .group_by(PagoVenta.metodo_pago)
        .all()
    )
    cash = 0.0
    account_gross = 0.0
    account_fees = 0.0
    by_method = []
    for method, amount, commission in rows:
        amount = _as_float(amount)
        commission = _as_float(commission)
        if "efectivo" in (method or "").lower():
            cash += amount
            net = amount
        else:
            account_gross += amount
            account_fees += commission
            net = amount - commission
        by_method.append({
            "metodo": method,
            "monto_nio": amount,
            "comision_nio": commission,
            "neto_esperado_nio": net,
        })

    purchase_cash, purchase_account = (
        db.query(
            func.coalesce(func.sum(Compra.pago_efectivo_nio), 0),
            func.coalesce(func.sum(Compra.pago_cuenta_nio), 0),
        )
        .filter(Compra.fecha_compra >= start, Compra.fecha_compra < end)
        .one()
    )
    paid_total = cash + account_gross
    return {
        "efectivo_recibido_nio": cash,
        "efectivo_usado_compras_nio": _as_float(purchase_cash),
        "efectivo_nio": cash - _as_float(purchase_cash),
        "cuenta_bruta_nio": account_gross,
        "comision_cuenta_nio": account_fees,
        "cuenta_recibida_nio": account_gross - account_fees,
        "cuenta_usada_compras_nio": _as_float(purchase_account),
        "cuenta_esperada_nio": account_gross - account_fees - _as_float(purchase_account),
        "cobrado_registrado_nio": paid_total,
        "por_metodo": by_method,
    }


def _inventory_summary(db: Session) -> dict:
    purchased_ids = db.query(CompraDetalle.producto_id).distinct().subquery()
    rows = (
        db.query(Producto, Inventario, Producto.costo_nio, Producto.costo_envio_nio)
        .join(Inventario, Inventario.producto_id == Producto.id)
        .filter(Producto.id.in_(purchased_ids))
        .order_by(Inventario.stock.asc(), Producto.nombre.asc())
        .all()
    )

    units = 0
    cost_value = 0.0
    sales_value = 0.0
    potential_profit = 0.0
    known_cost_units = 0
    missing_cost_products = 0
    low_stock = []
    for product, inventory, raw_cost, shipping_cost in rows:
        stock = int(inventory.stock or 0)
        units += stock
        sales_value += stock * _as_float(product.precio)
        if product.costo_nio is None:
            if stock > 0:
                missing_cost_products += 1
        else:
            unit_cost = _as_float(raw_cost) + _as_float(shipping_cost)
            cost_value += stock * unit_cost
            known_cost_units += stock
            potential_profit += stock * (_as_float(product.precio) - unit_cost)
        if stock <= int(inventory.stock_critico or 0):
            low_stock.append({
                "producto_id": product.id,
                "nombre": product.nombre,
                "sku": product.sku,
                "stock": stock,
                "stock_critico": int(inventory.stock_critico or 0),
            })

    return {
        "productos": len(rows),
        "unidades": units,
        "valor_costo_conocido_nio": cost_value,
        "valor_venta_nio": sales_value,
        "utilidad_potencial_conocida_nio": potential_profit,
        "unidades_con_costo_registrado": known_cost_units,
        "productos_sin_costo": missing_cost_products,
        "stock_bajo": len(low_stock),
        "alertas": low_stock[:8],
    }


def _receivable_total(db: Session) -> float:
    payments = (
        db.query(PagoVenta.venta_id.label("venta_id"), func.sum(PagoVenta.monto).label("pagado"))
        .group_by(PagoVenta.venta_id)
        .subquery()
    )
    paid = func.coalesce(payments.c.pagado, 0)
    balance = case((Venta.total > paid, Venta.total - paid), else_=0)
    return _as_float(
        db.query(func.coalesce(func.sum(balance), 0))
        .outerjoin(payments, payments.c.venta_id == Venta.id)
        .scalar()
    )


def _profit_summary(db: Session, start: datetime, end: datetime) -> dict:
    rows = (
        db.query(
            VentaDetalle.cantidad,
            VentaDetalle.subtotal,
            Producto.costo_nio,
            Producto.costo_envio_nio,
        )
        .join(Venta, Venta.id == VentaDetalle.venta_id)
        .join(Producto, Producto.id == VentaDetalle.producto_id)
        .filter(Venta.fecha_venta >= start, Venta.fecha_venta < end)
        .all()
    )
    known_profit = 0.0
    missing_cost_lines = 0
    for quantity, subtotal, cost, shipping in rows:
        if cost is None:
            missing_cost_lines += 1
            continue
        known_profit += _as_float(subtotal) - int(quantity) * (_as_float(cost) + _as_float(shipping))

    commission = _as_float(
        db.query(func.coalesce(func.sum(Venta.comision_pos), 0))
        .filter(Venta.fecha_venta >= start, Venta.fecha_venta < end)
        .scalar()
    )
    revenue = _sales_totals(db, start, end)[0]
    estimated_profit = known_profit - commission
    return {
        "utilidad_estimada_nio": estimated_profit if missing_cost_lines == 0 else None,
        "margen_estimado_pct": (estimated_profit / revenue * 100) if revenue and missing_cost_lines == 0 else None,
        "lineas_sin_costo": missing_cost_lines,
    }


def _sales_trend(db: Session, today: date) -> list[dict]:
    start = datetime.combine(today - timedelta(days=6), time.min)
    end = datetime.combine(today + timedelta(days=1), time.min)
    sales = (
        db.query(Venta.fecha_venta, Venta.total)
        .filter(Venta.fecha_venta >= start, Venta.fecha_venta < end)
        .all()
    )
    purchases = (
        db.query(Compra.fecha_compra, Compra.total_nio)
        .filter(Compra.fecha_compra >= start, Compra.fecha_compra < end)
        .all()
    )
    sales_by_day = {}
    purchases_by_day = {}
    for occurred_at, amount in sales:
        sales_by_day[occurred_at.date()] = sales_by_day.get(occurred_at.date(), 0) + _as_float(amount)
    for occurred_at, amount in purchases:
        purchases_by_day[occurred_at.date()] = purchases_by_day.get(occurred_at.date(), 0) + _as_float(amount)

    return [
        {
            "fecha": (today - timedelta(days=offset)).isoformat(),
            "ventas_nio": sales_by_day.get(today - timedelta(days=offset), 0),
            "compras_nio": purchases_by_day.get(today - timedelta(days=offset), 0),
        }
        for offset in range(6, -1, -1)
    ]


def _top_products(db: Session, start: datetime, end: datetime) -> list[dict]:
    rows = (
        db.query(
            Producto.id,
            Producto.nombre,
            Producto.sku,
            func.sum(VentaDetalle.cantidad).label("unidades"),
            func.sum(VentaDetalle.subtotal).label("ventas_nio"),
            func.sum(case((Producto.costo_nio.is_not(None),
                           VentaDetalle.cantidad * (func.coalesce(Producto.costo_nio, 0) + Producto.costo_envio_nio)),
                          else_=0)).label("costo_nio"),
            func.sum(case((Producto.costo_nio.is_(None), 1), else_=0)).label("lineas_sin_costo"),
        )
        .join(VentaDetalle, VentaDetalle.producto_id == Producto.id)
        .join(Venta, Venta.id == VentaDetalle.venta_id)
        .filter(Venta.fecha_venta >= start, Venta.fecha_venta < end)
        .group_by(Producto.id, Producto.nombre, Producto.sku)
        .order_by(func.sum(VentaDetalle.subtotal).desc())
        .limit(6)
        .all()
    )
    result = []
    for product_id, name, sku, units, revenue, cost, missing in rows:
        result.append({
            "producto_id": product_id,
            "nombre": name,
            "sku": sku,
            "unidades": int(units or 0),
            "ventas_nio": _as_float(revenue),
            "utilidad_estimada_nio": _as_float(revenue) - _as_float(cost) if not missing else None,
        })
    return result


def _recent_sales(db: Session) -> list[dict]:
    rows = (
        db.query(Venta.id, Cliente.nombre_cliente, Venta.total, Venta.fecha_venta)
        .join(Cliente, Cliente.id == Venta.cliente_id)
        .order_by(Venta.fecha_venta.desc(), Venta.id.desc())
        .limit(5)
        .all()
    )
    return [{"id": sale_id, "cliente": name, "total_nio": _as_float(total), "fecha": occurred_at}
            for sale_id, name, total, occurred_at in rows]


def _recent_purchases(db: Session) -> list[dict]:
    rows = (
        db.query(Compra.id, Compra.proveedor, Compra.total_nio, Compra.fecha_compra)
        .order_by(Compra.fecha_compra.desc(), Compra.id.desc())
        .limit(5)
        .all()
    )
    return [{"id": purchase_id, "proveedor": supplier, "total_nio": _as_float(total), "fecha": occurred_at}
            for purchase_id, supplier, total, occurred_at in rows]


def _purchase_profitability(db: Session, start: datetime, end: datetime) -> dict:
    rows = (
        db.query(
            Compra.id,
            Compra.proveedor,
            Compra.referencia,
            Compra.fecha_compra,
            Compra.total_nio,
            CompraDetalle.cantidad,
            Producto.nombre,
            Producto.precio,
        )
        .join(CompraDetalle, CompraDetalle.compra_id == Compra.id)
        .join(Producto, Producto.id == CompraDetalle.producto_id)
        .filter(Compra.fecha_compra >= start, Compra.fecha_compra < end)
        .order_by(Compra.fecha_compra.desc(), Compra.id.desc())
        .all()
    )
    purchases = {}
    for (purchase_id, supplier, reference, purchased_at, total, quantity, product_name, price) in rows:
        purchase = purchases.setdefault(purchase_id, {
            "id": purchase_id,
            "proveedor": supplier,
            "referencia": reference,
            "fecha": purchased_at,
            "inversion_nio": _as_float(total),
            "unidades": 0,
            "venta_potencial_nio": 0.0,
            "productos": [],
        })
        purchase["unidades"] += int(quantity or 0)
        purchase["venta_potencial_nio"] += int(quantity or 0) * _as_float(price)
        purchase["productos"].append(product_name)

    purchase_list = list(purchases.values())
    for purchase in purchase_list:
        purchase["utilidad_potencial_nio"] = purchase["venta_potencial_nio"] - purchase["inversion_nio"]
        purchase["margen_potencial_pct"] = (
            purchase["utilidad_potencial_nio"] / purchase["venta_potencial_nio"] * 100
            if purchase["venta_potencial_nio"] else None
        )
        purchase["productos"] = list(dict.fromkeys(purchase["productos"]))

    return {
        "cantidad": len(purchase_list),
        "inversion_nio": sum(item["inversion_nio"] for item in purchase_list),
        "venta_potencial_nio": sum(item["venta_potencial_nio"] for item in purchase_list),
        "utilidad_potencial_nio": sum(item["utilidad_potencial_nio"] for item in purchase_list),
        "compras": purchase_list[:20],
    }


def get_dashboard_data(db: Session, period: str = "month") -> dict:
    local_today = datetime.now(BUSINESS_TIMEZONE).date()
    start, end, previous_start, previous_end = _bounds(period, local_today)
    sales, invoice_count = _sales_totals(db, start, end)
    previous_sales, _ = _sales_totals(db, previous_start, previous_end)
    purchases, purchase_count, purchased_units = _purchase_totals(db, start, end)
    # ponytail: Sales use current product costs because the sale lines do not snapshot cost; store unit cost on VentaDetalle to upgrade to historical COGS.
    profit = _profit_summary(db, start, end)
    inventory = _inventory_summary(db)
    sales_change_pct = ((sales - previous_sales) / previous_sales * 100) if previous_sales else None

    return {
        "periodo": period,
        "periodo_label": PERIOD_LABELS[period],
        "desde": start.date().isoformat(),
        "hasta": (end.date() - timedelta(days=1)).isoformat(),
        "ventas": {
            "total_nio": sales,
            "facturas": invoice_count,
            "ticket_promedio_nio": sales / invoice_count if invoice_count else 0,
            "variacion_pct": sales_change_pct,
        },
        "compras": {
            "total_nio": purchases,
            "cantidad": purchase_count,
            "unidades": purchased_units,
        },
        "rentabilidad_compras": _purchase_profitability(db, start, end),
        "cobros": _cash_account_summary(db, start, end),
        "utilidad": profit,
        "cuentas_por_cobrar_nio": _receivable_total(db),
        "inventario": inventory,
        "tendencia_7_dias": _sales_trend(db, local_today),
        "productos_destacados": _top_products(db, start, end),
        "ventas_recientes": _recent_sales(db),
        "compras_recientes": _recent_purchases(db),
        "actualizado_en": datetime.now(BUSINESS_TIMEZONE).isoformat(),
    }


def get_monthly_report(db: Session, year: int, month: int) -> dict:
    """Build a complete monthly business cut, with invoice and collection dates kept distinct."""
    start_date = date(year, month, 1)
    end_date = date(year + (month == 12), 1 if month == 12 else month + 1, 1)
    start = datetime.combine(start_date, time.min)
    end = datetime.combine(end_date, time.min)

    sales = (db.query(Venta, Cliente.nombre_cliente)
             .join(Cliente, Cliente.id == Venta.cliente_id)
             .filter(Venta.fecha_venta >= start, Venta.fecha_venta < end)
             .order_by(Venta.fecha_venta, Venta.id).all())
    sale_ids = [sale.id for sale, _ in sales]
    payment_rows = (db.query(PagoVenta, Venta.id, Cliente.nombre_cliente)
                    .join(Venta, Venta.id == PagoVenta.venta_id)
                    .join(Cliente, Cliente.id == Venta.cliente_id)
                    .filter(PagoVenta.fecha_pago >= start, PagoVenta.fecha_pago < end)
                    .order_by(PagoVenta.fecha_pago, PagoVenta.id).all())
    all_invoice_payments = (db.query(PagoVenta).filter(PagoVenta.venta_id.in_(sale_ids))
                            .order_by(PagoVenta.fecha_pago, PagoVenta.id).all()) if sale_ids else []
    payments_by_sale: dict[int, list] = {}
    for payment in all_invoice_payments:
        payments_by_sale.setdefault(payment.venta_id, []).append(payment)

    sale_details = (db.query(VentaDetalle, Producto.nombre, Producto.sku)
                    .join(Producto, Producto.id == VentaDetalle.producto_id)
                    .filter(VentaDetalle.venta_id.in_(sale_ids))
                    .order_by(VentaDetalle.venta_id, VentaDetalle.id).all()) if sale_ids else []
    details_by_sale: dict[int, list] = {}
    for line, name, sku in sale_details:
        details_by_sale.setdefault(line.venta_id, []).append({
            "producto": name, "sku": sku, "cantidad": line.cantidad,
            "precio_unitario_nio": _as_float(line.precio_unitario),
            "descuento_nio": _as_float(line.descuento), "subtotal_nio": _as_float(line.subtotal),
        })

    sale_records = []
    for sale, client_name in sales:
        invoice_payments = payments_by_sale.get(sale.id, [])
        paid = sum((_as_float(payment.monto) for payment in invoice_payments), 0.0)
        sale_records.append({
            "id": sale.id, "fecha": sale.fecha_venta, "cliente": client_name,
            "total_nio": _as_float(sale.total), "abonado_nio": paid,
            "saldo_nio": max(0.0, _as_float(sale.total) - paid),
            "comision_pos_nio": _as_float(sale.comision_pos),
            "items": details_by_sale.get(sale.id, []),
            "pagos": [{"fecha": p.fecha_pago, "metodo": p.metodo_pago, "monto_nio": _as_float(p.monto),
                       "comision_nio": _as_float(p.monto_comision)} for p in invoice_payments],
        })

    method_totals: dict[str, float] = {}
    payment_records = []
    for payment, sale_id, client_name in payment_rows:
        method_totals[payment.metodo_pago] = method_totals.get(payment.metodo_pago, 0.0) + _as_float(payment.monto)
        payment_records.append({
            "fecha": payment.fecha_pago, "factura_id": sale_id, "cliente": client_name,
            "metodo": payment.metodo_pago, "monto_nio": _as_float(payment.monto),
            "comision_nio": _as_float(payment.monto_comision),
        })

    purchases = (db.query(Compra).filter(Compra.fecha_compra >= start, Compra.fecha_compra < end)
                 .order_by(Compra.fecha_compra, Compra.id).all())
    purchase_ids = [purchase.id for purchase in purchases]
    purchase_details = (db.query(CompraDetalle, Producto.nombre, Producto.sku)
                        .join(Producto, Producto.id == CompraDetalle.producto_id)
                        .filter(CompraDetalle.compra_id.in_(purchase_ids))
                        .order_by(CompraDetalle.compra_id, CompraDetalle.id).all()) if purchase_ids else []
    details_by_purchase: dict[int, list] = {}
    for line, name, sku in purchase_details:
        details_by_purchase.setdefault(line.compra_id, []).append({
            "producto": name, "sku": sku, "cantidad": line.cantidad,
            "costo_unitario_nio": _as_float(line.costo_unitario_nio),
            "costo_envio_unitario_nio": _as_float(line.costo_envio_unitario_nio),
            "subtotal_nio": _as_float(line.subtotal_nio),
        })
    purchase_records = []
    for purchase in purchases:
        paid = _as_float(purchase.pago_efectivo_nio) + _as_float(purchase.pago_cuenta_nio)
        purchase_records.append({
            "id": purchase.id, "fecha": purchase.fecha_compra, "proveedor": purchase.proveedor,
            "referencia": purchase.referencia, "total_nio": _as_float(purchase.total_nio),
            "abonado_nio": paid, "saldo_nio": max(0.0, _as_float(purchase.total_nio) - paid),
            "pago_efectivo_nio": _as_float(purchase.pago_efectivo_nio),
            "pago_cuenta_nio": _as_float(purchase.pago_cuenta_nio),
            "items": details_by_purchase.get(purchase.id, []),
        })

    products = (db.query(Producto, Marca.nombre_marca, Inventario)
                .join(Inventario, Inventario.producto_id == Producto.id)
                .outerjoin(Marca, Marca.id == Producto.marca_id)
                .filter(Producto.id.in_(db.query(CompraDetalle.producto_id).distinct()))
                .order_by(Producto.nombre).all())
    inventory = []
    for product, brand, stock in products:
        quantity = int(stock.stock or 0)
        cost = None if product.costo_nio is None else _as_float(product.costo_nio) + _as_float(product.costo_envio_nio)
        inventory.append({
            "producto": product.nombre, "sku": product.sku, "marca": brand,
            "stock": quantity, "stock_minimo": int(stock.stock_critico or 0),
            "costo_unitario_nio": cost, "precio_unitario_nio": _as_float(product.precio),
            "valor_costo_nio": None if cost is None else quantity * cost,
            "valor_venta_nio": quantity * _as_float(product.precio),
        })

    sales_total = sum(item["total_nio"] for item in sale_records)
    purchases_total = sum(item["total_nio"] for item in purchase_records)
    collected_total = sum(item["monto_nio"] for item in payment_records)
    paid_purchases = sum(item["abonado_nio"] for item in purchase_records)
    inventory_cost = sum(item["valor_costo_nio"] or 0 for item in inventory)
    inventory_retail = sum(item["valor_venta_nio"] for item in inventory)
    profit = _profit_summary(db, start, end)
    return {
        "year": year, "month": month, "desde": start_date.isoformat(),
        "hasta": (end_date - timedelta(days=1)).isoformat(),
        "resumen": {
            "ventas_nio": sales_total, "compras_nio": purchases_total,
            "cobros_mes_nio": collected_total,
            "saldo_facturas_mes_nio": sum(item["saldo_nio"] for item in sale_records),
            "abonado_facturas_mes_nio": sum(item["abonado_nio"] for item in sale_records),
            "saldo_compras_mes_nio": sum(item["saldo_nio"] for item in purchase_records),
            "pagado_compras_mes_nio": paid_purchases,
            "movimiento_neto_mes_nio": collected_total - paid_purchases,
            "ventas_menos_compras_nio": sales_total - purchases_total,
            "utilidad_estimada_nio": profit["utilidad_estimada_nio"],
            "lineas_sin_costo": profit["lineas_sin_costo"],
            "cobros_por_metodo": [{"metodo": name, "monto_nio": amount} for name, amount in sorted(method_totals.items())],
            "valor_inventario_costo_nio": inventory_cost, "valor_inventario_venta_nio": inventory_retail,
        },
        "ventas": sale_records, "compras": purchase_records, "abonos_mes": payment_records,
        "inventario": inventory,
    }
