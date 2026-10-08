from fastapi import APIRouter
from app.api.v1.endpoints import admin
from app.api.v1.endpoints import marcas
from app.api.v1.endpoints import clientes
from app.api.v1.endpoints import inventario
from app.api.v1.endpoints import catalogo_qr
from app.api.v1.endpoints import recepcion
from app.api.v1.endpoints import bajas_retiros
from app.api.v1.endpoints import pos
from app.api.v1.endpoints import cierre_caja
from app.api.v1.endpoints import liquidaciones
from app.api.v1.endpoints import dashboard

api_router = APIRouter()

api_router.include_router(admin.router, prefix='/admin', tags=['Administración'])
api_router.include_router(marcas.router, prefix='/marcas', tags=['Gestión de Marcas'])
api_router.include_router(clientes.router, prefix='/clientes', tags=['Gestión de Clientes'])
api_router.include_router(inventario.router, prefix='/inventario', tags=['Inventario'])
api_router.include_router(catalogo_qr.router, prefix='/catalogo-qr', tags=['Catálogo y Generador QR'])
api_router.include_router(recepcion.router, prefix='/recepcion', tags=['Recepción e Ingreso'])
api_router.include_router(bajas_retiros.router, prefix='/bajas-retiros', tags=['Bajas y Retiros'])
api_router.include_router(pos.router, prefix='/pos', tags=['Punto de Venta'])
api_router.include_router(cierre_caja.router, prefix='/cierre-caja', tags=['Cierre de Caja'])
api_router.include_router(liquidaciones.router, prefix='/liquidaciones', tags=['Liquidaciones'])
api_router.include_router(dashboard.router, prefix='/dashboard', tags=['Dashboard'])
