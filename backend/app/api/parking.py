from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.database.dependencies import get_db
from app.schemas.parking import (
    GenerateTwinMapRequest,
    ParkingAssignRequest,
    ParkingAssignmentResponse,
    ParkingReleaseRequest,
    ParkingSlotCreate,
    ParkingSlotResponse,
    ParkingZoneCreate,
    ParkingZoneResponse,
)
from app.services.digital_twin_service import DigitalTwinService
from app.services.parking_service import ParkingService


router = APIRouter(
    prefix="/parking",
    tags=["Parking"],
)


@router.post("/generate-twin-map")
async def generate_twin_map(
    request: GenerateTwinMapRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await DigitalTwinService.generate_twin_layout(
        db,
        num_floors=request.num_floors,
        slots_per_floor=request.slots_per_floor,
        slots_per_zone=request.slots_per_zone,
        clear_existing=request.clear_existing,
    )



@router.get("/zones", response_model=list[ParkingZoneResponse])
async def list_parking_zones(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ParkingService.list_zones(db)


@router.post("/zones", response_model=ParkingZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_parking_zone(
    request: ParkingZoneCreate,
    current_user=Depends(require_roles("ADMIN", "VALET")),
    db: AsyncSession = Depends(get_db),
):
    return await ParkingService.create_zone(db, request)


@router.get("/slots", response_model=list[ParkingSlotResponse])
async def list_parking_slots(
    zone_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ParkingService.list_slots(db, zone_id=zone_id)


@router.post("/slots", response_model=ParkingSlotResponse, status_code=status.HTTP_201_CREATED)
async def create_parking_slot(
    request: ParkingSlotCreate,
    current_user=Depends(require_roles("ADMIN", "VALET")),
    db: AsyncSession = Depends(get_db),
):
    return await ParkingService.create_slot(db, request)


@router.get("/availability")
async def get_parking_availability(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ParkingService.get_availability(db)


@router.post("/assign", response_model=ParkingAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_parking_slot(
    request: ParkingAssignRequest,
    current_user=Depends(require_roles("ADMIN", "VALET")),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await ParkingService.assign_slot(db, assigned_by_user_id=user.id, request=request)


@router.post("/release", response_model=ParkingAssignmentResponse)
async def release_parking_slot(
    request: ParkingReleaseRequest,
    current_user=Depends(require_roles("ADMIN", "VALET")),
    db: AsyncSession = Depends(get_db),
):
    return await ParkingService.release_slot(db, request=request)


@router.get("/assignments", response_model=list[ParkingAssignmentResponse])
async def list_parking_assignments(
    active_only: bool = True,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ParkingService.list_assignments(db, active_only=active_only)


@router.get("/assignments/{id}", response_model=ParkingAssignmentResponse)
async def get_parking_assignment(
    id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ParkingService.get_assignment_by_id(db, id)
