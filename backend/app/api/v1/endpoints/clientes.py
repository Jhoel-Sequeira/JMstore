from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.clientes import Cliente
from app.models.pos import PagoVenta, Venta
from app.schemas.pos import ClienteCreate

router = APIRouter()


@router.get("/historial")
def list_client_purchase_history(db: Session = Depends(get_db)):
    payment_totals = (db.query(
        PagoVenta.venta_id.label("venta_id"),
        func.coalesce(func.sum(PagoVenta.monto), 0).label("pagado"),
        func.count(PagoVenta.id).label("abonos"),
    ).group_by(PagoVenta.venta_id).subquery())
    rows = (db.query(Venta, Cliente, payment_totals.c.pagado, payment_totals.c.abonos)
            .join(Cliente, Cliente.id == Venta.cliente_id)
            .outerjoin(payment_totals, payment_totals.c.venta_id == Venta.id)
            .order_by(Venta.fecha_venta.desc(), Venta.id.desc()).all())

    clients = {}
    for sale, client, paid_value, payment_count in rows:
        entry = clients.setdefault(client.id, {
            "id": client.id,
            "nombre_cliente": client.nombre_cliente,
            "telefono": client.telefono,
            "correo": client.correo,
            "facturas": 0,
            "total_comprado": 0,
            "total_abonado": 0,
            "saldo_pendiente": 0,
            "ultima_compra": sale.fecha_venta,
            "historial": [],
        })
        paid = paid_value or 0
        balance = max(0, sale.total - paid)
        entry["facturas"] += 1
        entry["total_comprado"] += sale.total
        entry["total_abonado"] += paid
        entry["saldo_pendiente"] += balance
        entry["historial"].append({
            "venta_id": sale.id,
            "origen": "factura",
            "fecha": sale.fecha_venta,
            "total": sale.total,
            "abonado": paid,
            "saldo": balance,
            "abonos": payment_count or 0,
        })

    for client in clients.values():
        client["historial"].sort(key=lambda sale: str(sale["fecha"] or ""), reverse=True)

    return sorted(clients.values(), key=lambda client: client["nombre_cliente"].casefold())


@router.get("/")
def list_clientes(q: str = "", db: Session = Depends(get_db)):
    query = db.query(Cliente)
    if q.strip():
        term = f"%{q.strip()}%"
        query = query.filter((Cliente.nombre_cliente.ilike(term)) | (Cliente.telefono.ilike(term)) | (Cliente.correo.ilike(term)))
    return [{"id": c.id, "nombre_cliente": c.nombre_cliente, "telefono": c.telefono, "correo": c.correo}
            for c in query.order_by(Cliente.nombre_cliente).limit(500).all()]


@router.post("/", status_code=201)
def create_cliente(payload: ClienteCreate, db: Session = Depends(get_db)):
    cliente = Cliente(
        nombre_cliente=payload.nombre_cliente.strip(),
        telefono=payload.telefono.strip() if payload.telefono else None,
        correo=payload.correo.strip() if payload.correo else None,
    )
    if not cliente.nombre_cliente:
        raise HTTPException(400, "El nombre del cliente es obligatorio")
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return {"id": cliente.id, "nombre_cliente": cliente.nombre_cliente, "telefono": cliente.telefono, "correo": cliente.correo}
