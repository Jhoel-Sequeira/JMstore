from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator


class CompraNuevoProducto(BaseModel):
    nombre: str = Field(min_length=1, max_length=255)
    sku: str | None = Field(default=None, max_length=100)
    codigo_qr: str | None = Field(default=None, max_length=255)
    precio: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    stock_critico: int = Field(default=5, ge=0)
    descripcion: str | None = None


class CompraItemCreate(BaseModel):
    producto_id: int | None = None
    nuevo_producto: CompraNuevoProducto | None = None
    cantidad: int = Field(gt=0, le=100000)
    costo_unitario_nio: Decimal = Field(ge=0, max_digits=12, decimal_places=2)

    @model_validator(mode="after")
    def require_existing_or_new_product(self):
        if bool(self.producto_id) == bool(self.nuevo_producto):
            raise ValueError("Selecciona un producto existente o completa los datos de un producto nuevo")
        return self


class CompraCreate(BaseModel):
    marca_id: int = Field(gt=0)
    referencia: str | None = Field(default=None, max_length=120)
    fecha_compra: date
    costo_envio_nio: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    pago_efectivo_nio: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    pago_cuenta_nio: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    observaciones: str | None = None
    items: list[CompraItemCreate] = Field(min_length=1, max_length=200)


class CompraPagoActualizar(BaseModel):
    pago_efectivo_nio: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    pago_cuenta_nio: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
