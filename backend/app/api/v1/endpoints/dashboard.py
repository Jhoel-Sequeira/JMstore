from typing import Literal

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.dashboard_service import BUSINESS_TIMEZONE, get_dashboard_data, get_monthly_report

router = APIRouter()


@router.get("/")
def get_dashboard(
    periodo: Literal["today", "week", "month", "year"] = Query(default="month"),
    db: Session = Depends(get_db),
):
    return get_dashboard_data(db, periodo)


@router.get("/reporte-mensual")
def get_monthly_business_report(
    anio: int | None = Query(default=None, ge=2000, le=2100),
    mes: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
):
    today = datetime.now(BUSINESS_TIMEZONE)
    return get_monthly_report(db, anio or today.year, mes or today.month)
