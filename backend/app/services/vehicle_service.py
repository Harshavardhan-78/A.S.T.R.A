from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Vehicle
from app.schemas.vehicle import VehicleCreate


class VehicleService:
    @staticmethod
    async def create_vehicle(
        db: AsyncSession, request: VehicleCreate, owner_user_id: int | None = None
    ) -> Vehicle:
        normalized_plate = request.license_plate.strip().upper()

        result = await db.execute(
            select(Vehicle).where(Vehicle.license_plate == normalized_plate)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle with this license plate already exists",
            )

        vehicle = Vehicle(
            license_plate=normalized_plate,
            make=request.make,
            model=request.model,
            color=request.color,
            vehicle_type=request.vehicle_type,
            owner_user_id=owner_user_id,
        )
        db.add(vehicle)
        await db.commit()
        await db.refresh(vehicle)
        return vehicle

    @staticmethod
    async def list_vehicles(
        db: AsyncSession, current_user_id: int, role: str
    ) -> list[Vehicle]:
        if role in ["ADMIN", "SECURITY"]:
            result = await db.execute(select(Vehicle))
        else:
            result = await db.execute(
                select(Vehicle).where(Vehicle.owner_user_id == current_user_id)
            )
        return list(result.scalars().all())

    @staticmethod
    async def get_vehicle_by_id(
        db: AsyncSession, vehicle_id: int, current_user_id: int, role: str
    ) -> Vehicle:
        result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
        vehicle = result.scalar_one_or_none()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found",
            )
        if role not in ["ADMIN", "SECURITY"] and vehicle.owner_user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this vehicle",
            )
        return vehicle

    @staticmethod
    async def update_vehicle(
        db: AsyncSession,
        vehicle_id: int,
        current_user_id: int,
        role: str,
        make: str | None = None,
        model: str | None = None,
        color: str | None = None,
        vehicle_type: str | None = None,
    ) -> Vehicle:
        vehicle = await VehicleService.get_vehicle_by_id(db, vehicle_id, current_user_id, role)
        if make is not None:
            vehicle.make = make
        if model is not None:
            vehicle.model = model
        if color is not None:
            vehicle.color = color
        if vehicle_type is not None:
            vehicle.vehicle_type = vehicle_type

        await db.commit()
        await db.refresh(vehicle)
        return vehicle

    @staticmethod
    async def delete_vehicle(
        db: AsyncSession, vehicle_id: int, current_user_id: int, role: str
    ) -> dict:
        vehicle = await VehicleService.get_vehicle_by_id(db, vehicle_id, current_user_id, role)
        await db.delete(vehicle)
        await db.commit()
        return {"message": "Vehicle deleted successfully", "vehicle_id": vehicle_id}
