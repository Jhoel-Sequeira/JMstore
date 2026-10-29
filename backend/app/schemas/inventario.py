from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProductoBase(BaseModel):
    marca_id: int
    codigo_qr: Optional[str] = None
    sku: Optional[str] = None
    nombre: str = Field(min_length=1, max_length=255)
    descripcion: Optional[str] = None
    precio: float = Field(ge=0)
    costo_nio: Optional[float] = Field(default=0, ge=0)
    costo_envio_nio: float = Field(default=0, ge=0)
    margen_utilidad_pct: float = Field(default=30, ge=0, le=10000)
    stock: int = Field(default=0, ge=0)
    stock_critico: int = Field(default=5, ge=0)
    imagen_url: Optional[str] = None
    estado_id: int = 1


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    marca_id: Optional[int] = None
    codigo_qr: Optional[str] = None
    sku: Optional[str] = None
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=255)
    descripcion: Optional[str] = None
    precio: Optional[float] = Field(default=None, ge=0)
    costo_nio: Optional[float] = Field(default=None, ge=0)
    costo_envio_nio: Optional[float] = Field(default=None, ge=0)
    margen_utilidad_pct: Optional[float] = Field(default=None, ge=0, le=10000)
    stock: Optional[int] = Field(default=None, ge=0)
    stock_critico: Optional[int] = Field(default=None, ge=0)
    imagen_url: Optional[str] = None
    estado_id: Optional[int] = None


class ProductoResponse(ProductoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    marca_nombre: Optional[str] = None
    codigos_qr: list[str] = Field(default_factory=list)
    costo_total_nio: Optional[float] = None
    precio_minimo_nio: Optional[float] = None
    utilidad_nio: Optional[float] = None
    precio_sugerido_nio: Optional[float] = None


class ImportResult(BaseModel):
    creados: int
    actualizados: int
    errores: list[str]
