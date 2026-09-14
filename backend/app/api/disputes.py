from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.database.dependencies import get_db
from app.schemas.dispute import (
    DisputeCreate,
    DisputeResolutionRequest,
    DisputeResponse,
)
from app.services.dispute_service import DisputeService


router = APIRouter(
    prefix="/disputes",
    tags=["Disputes"],
)


@router.post("", response_model=DisputeResponse, status_code=status.HTTP_201_CREATED)
async def create_dispute(
    request: DisputeCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await DisputeService.create_dispute(db, user.id, request)


@router.get("", response_model=list[DisputeResponse])
async def list_disputes(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await DisputeService.list_disputes(db, user.id, role)


@router.get("/{id}", response_model=DisputeResponse)
async def get_dispute(
    id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await DisputeService.get_dispute_by_id(db, id, user.id, role)


@router.post("/{id}/investigate", response_model=DisputeResponse)
async def investigate_dispute(
    id: int,
    current_user=Depends(require_roles("ADMIN", "SECURITY")),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await DisputeService.mark_investigating(db, id, user.id, role)


@router.post("/{id}/resolve", response_model=DisputeResponse)
async def resolve_dispute(
    id: int,
    request: DisputeResolutionRequest,
    current_user=Depends(require_roles("ADMIN", "SECURITY")),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await DisputeService.resolve_dispute(
        db, id, user.id, role, resolution=request.resolution, dismiss=False
    )
