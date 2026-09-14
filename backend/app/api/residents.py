from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.dependencies import get_db
from app.schemas.resident import ResidentCreate, ResidentResponse, ResidentUpdate
from app.services.resident_service import ResidentService


router = APIRouter(
    prefix="/residents",
    tags=["Residents"],
)


@router.post(
    "",
    response_model=ResidentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_resident(
    request: ResidentCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await ResidentService.create_resident_profile(
        db, user.id, request.apartment_number, request.phone
    )


@router.get("/me")
async def get_my_resident_profile(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await ResidentService.get_resident_profile(db, user.id)


@router.put("/me")
async def update_my_resident_profile(
    request: ResidentUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await ResidentService.update_resident_profile(
        db, user.id, request.apartment_number, request.phone
    )