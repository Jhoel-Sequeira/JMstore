from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_bajas_retiros():
    return {"status": "ok", "modulo": "Bajas y Retiros"}
