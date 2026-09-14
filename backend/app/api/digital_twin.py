from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.dependencies import get_db
from app.services.digital_twin_service import DigitalTwinService
from app.services.parking_service import ParkingService


router = APIRouter(
    prefix="/digital-twin",
    tags=["Digital Twin"],
)


@router.get("/layout")
async def get_digital_twin_layout(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await DigitalTwinService.get_layout(db)


@router.get("/floors")
async def get_digital_twin_floors(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await DigitalTwinService.get_floors(db)


@router.get("/zones")
async def get_digital_twin_zones(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ParkingService.list_zones(db)


@router.get("/slots")
async def get_digital_twin_slots(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ParkingService.list_slots(db)


@router.get("/sensors")
async def get_digital_twin_sensors(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await DigitalTwinService.get_sensors(db)


@router.get("/nodes")
async def get_digital_twin_nodes(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await DigitalTwinService.get_nodes(db)
