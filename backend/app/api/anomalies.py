from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.database.dependencies import get_db
from app.schemas.anomaly import (
    AnomalyRecordCreate,
    AnomalyRecordResponse,
    AnomalyStatusUpdate,
)
from app.services.anomaly_service import AnomalyService


router = APIRouter(
    prefix="/anomalies",
    tags=["Anomalies"],
)


@router.post("", response_model=AnomalyRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_anomaly(
    request: AnomalyRecordCreate,
    current_user=Depends(require_roles("ADMIN", "SECURITY")),
    db: AsyncSession = Depends(get_db),
):
    return await AnomalyService.create_anomaly(db, request)


@router.get("", response_model=list[AnomalyRecordResponse])
async def list_anomalies(
    status_filter: str | None = None,
    current_user=Depends(require_roles("ADMIN", "SECURITY")),
    db: AsyncSession = Depends(get_db),
):
    return await AnomalyService.list_anomalies(db, status_filter=status_filter)


@router.get("/{id}", response_model=AnomalyRecordResponse)
async def get_anomaly(
    id: int,
    current_user=Depends(require_roles("ADMIN", "SECURITY")),
    db: AsyncSession = Depends(get_db),
):
    return await AnomalyService.get_anomaly_by_id(db, id)


@router.put("/{id}/status", response_model=AnomalyRecordResponse)
async def update_anomaly_status(
    id: int,
    request: AnomalyStatusUpdate,
    current_user=Depends(require_roles("ADMIN", "SECURITY")),
    db: AsyncSession = Depends(get_db),
):
    return await AnomalyService.update_anomaly_status(db, id, request.status)
