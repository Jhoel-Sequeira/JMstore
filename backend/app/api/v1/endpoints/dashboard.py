from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.dashboard_service import get_dashboard_data

router = APIRouter()


@router.get("/")
def get_dashboard(
    periodo: Literal["today", "week", "month", "year"] = Query(default="month"),
    db: Session = Depends(get_db),
):
    return get_dashboard_data(db, periodo)
