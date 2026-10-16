# Esquemas Pydantic para Punto de Venta
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class VentaItemIn(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)
    descuento: Decimal = Field(default=Decimal("0"), ge=0)


class VentaPagoIn(BaseModel):
    metodo_pago_id: int
    monto: Decimal = Field(gt=0)
    comision_porcentaje: Decimal = Field(default=Decimal("0"), ge=0, le=100)


class VentaCreate(BaseModel):
    cliente_id: int
    items: list[VentaItemIn] = Field(min_length=1)
    pagos: list[VentaPagoIn] = Field(default_factory=list)


class AbonoCreate(BaseModel):
    metodo_pago_id: int
    monto: Decimal = Field(gt=0)
    comision_porcentaje: Decimal = Field(default=Decimal("0"), ge=0, le=100)


class PagoFechaUpdate(BaseModel):
    fecha_pago: datetime


class ClienteCreate(BaseModel):
    nombre_cliente: str = Field(min_length=1, max_length=255)
    telefono: Optional[str] = Field(default=None, max_length=50)
    correo: Optional[str] = Field(default=None, max_length=255)


class InvoiceItem(BaseModel):
    producto_id: int
    nombre: str
    sku: Optional[str] = None
    cantidad: int
    precio_unitario: Decimal
    descuento: Decimal
    subtotal: Decimal


class InvoicePayment(BaseModel):
    id: int
    metodo_pago: str
    monto: Decimal
    comision_porcentaje: Decimal
    monto_comision: Decimal
    fecha_pago: datetime


class InvoiceResponse(BaseModel):
    id: int
    cliente_id: int
    cliente_nombre: str
    cliente_telefono: Optional[str] = None
    cliente_correo: Optional[str] = None
    total: Decimal
    monto_pagado: Decimal
    saldo_pendiente: Decimal
    estado_pago: str
    comision_pos: Decimal
    estado: str
    fecha_venta: Optional[datetime] = None
    items: list[InvoiceItem]
    pagos: list[InvoicePayment]


class CatalogProduct(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    sku: Optional[str] = None
    precio: Decimal
    stock: int
    marca_nombre: Optional[str] = None
