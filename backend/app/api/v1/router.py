from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import admin
from app.api.v1.endpoints import marcas
from app.api.v1.endpoints import clientes
from app.api.v1.endpoints import inventario
from app.api.v1.endpoints import catalogo_qr
from app.api.v1.endpoints import compras
from app.api.v1.endpoints import pos
from app.api.v1.endpoints import dashboard

api_router = APIRouter()
api_router.include_router(auth.router, prefix='/auth', tags=['Auth'])

api_router.include_router(admin.router, prefix='/admin', tags=['Administración'])
api_router.include_router(marcas.router, prefix='/marcas', tags=['Gestión de Marcas'], dependencies=[Depends(get_current_user)])
api_router.include_router(clientes.router, prefix='/clientes', tags=['Gestión de Clientes'], dependencies=[Depends(get_current_user)])
api_router.include_router(inventario.router, prefix='/inventario', tags=['Inventario'], dependencies=[Depends(get_current_user)])
api_router.include_router(catalogo_qr.router, prefix='/catalogo-qr', tags=['Catálogo y Generador QR'], dependencies=[Depends(get_current_user)])
api_router.include_router(compras.router, prefix='/compras', tags=['Compras'], dependencies=[Depends(get_current_user)])
api_router.include_router(pos.router, prefix='/pos', tags=['Punto de Venta'], dependencies=[Depends(get_current_user)])
api_router.include_router(dashboard.router, prefix='/dashboard', tags=['Dashboard'], dependencies=[Depends(get_current_user)])
