from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_inventario():
    return {"status": "ok", "modulo": "Inventario"}
