from sqlalchemy.orm import Session

from app.models.inventario import Inventario


def available_stock(db: Session, product_id: int) -> int:
    row = db.query(Inventario.stock).filter(Inventario.producto_id == product_id).scalar()
    return int(row or 0)


def available_stock_by_product(db: Session, product_ids: list[int]) -> dict[int, int]:
    if not product_ids:
        return {}
    return {product_id: stock or 0 for product_id, stock in
            db.query(Inventario.producto_id, Inventario.stock)
            .filter(Inventario.producto_id.in_(product_ids)).all()}


def critical_stock_by_product(db: Session, product_ids: list[int]) -> dict[int, int]:
    if not product_ids:
        return {}
    return {product_id: critical_stock or 5 for product_id, critical_stock in
            db.query(Inventario.producto_id, Inventario.stock_critico)
            .filter(Inventario.producto_id.in_(product_ids)).all()}
