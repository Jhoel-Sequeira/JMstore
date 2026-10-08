from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_pos():
    return {"status": "ok", "modulo": "Punto de Venta"}
