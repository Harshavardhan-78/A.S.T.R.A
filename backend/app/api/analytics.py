from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import require_roles
from app.database.dependencies import get_db
from app.services.analytics_service import AnalyticsService


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get("/overview")
async def get_overview_analytics(
    current_user=Depends(require_roles("ADMIN", "SECURITY")),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_overview(db)


@router.get("/parking")
async def get_parking_analytics(
    current_user=Depends(require_roles("ADMIN", "SECURITY", "VALET")),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_parking_analytics(db)


@router.get("/security")
async def get_security_analytics(
    current_user=Depends(require_roles("ADMIN", "SECURITY")),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_security_analytics(db)


@router.get("/visitors")
async def get_visitor_analytics(
    current_user=Depends(require_roles("ADMIN", "SECURITY")),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_visitor_analytics(db)


@router.get("/anomalies")
async def get_anomaly_analytics(
    current_user=Depends(require_roles("ADMIN", "SECURITY")),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_anomaly_analytics(db)
