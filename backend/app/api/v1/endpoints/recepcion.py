from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_recepcion():
    return {"status": "ok", "modulo": "Recepción e Ingreso"}
