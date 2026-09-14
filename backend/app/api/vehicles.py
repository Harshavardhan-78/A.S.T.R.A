from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.dependencies import get_db
from app.schemas.vehicle import VehicleCreate, VehicleResponse, VehicleUpdate
from app.services.vehicle_service import VehicleService


router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"],
)


@router.post(
    "",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_vehicle(
    request: VehicleCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await VehicleService.create_vehicle(db, request, owner_user_id=user.id)


@router.get("", response_model=list[VehicleResponse])
async def list_vehicles(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await VehicleService.list_vehicles(db, user.id, role)


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await VehicleService.get_vehicle_by_id(db, vehicle_id, user.id, role)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: int,
    request: VehicleUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await VehicleService.update_vehicle(
        db,
        vehicle_id,
        user.id,
        role,
        make=request.make,
        model=request.model,
        color=request.color,
        vehicle_type=request.vehicle_type,
    )


@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await VehicleService.delete_vehicle(db, vehicle_id, user.id, role)