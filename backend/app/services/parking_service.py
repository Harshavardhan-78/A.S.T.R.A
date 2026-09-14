from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import ParkingAssignment, ParkingSlot, ParkingZone, Vehicle
from app.schemas.parking import (
    ParkingAssignRequest,
    ParkingReleaseRequest,
    ParkingSlotCreate,
    ParkingZoneCreate,
)


class ParkingService:
    @staticmethod
    async def list_zones(db: AsyncSession) -> list[ParkingZone]:
        result = await db.execute(select(ParkingZone))
        return list(result.scalars().all())

    @staticmethod
    async def create_zone(db: AsyncSession, request: ParkingZoneCreate) -> ParkingZone:
        result = await db.execute(
            select(ParkingZone).where(ParkingZone.name == request.name)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parking zone '{request.name}' already exists",
            )
        zone = ParkingZone(
            name=request.name,
            floor=request.floor,
            description=request.description,
            x_coord=request.x_coord,
            y_coord=request.y_coord,
            width=request.width,
            height=request.height,
        )
        db.add(zone)
        await db.commit()
        await db.refresh(zone)
        return zone

    @staticmethod
    async def list_slots(db: AsyncSession, zone_id: int | None = None) -> list[ParkingSlot]:
        stmt = select(ParkingSlot)
        if zone_id:
            stmt = stmt.where(ParkingSlot.zone_id == zone_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def create_slot(db: AsyncSession, request: ParkingSlotCreate) -> ParkingSlot:
        z_res = await db.execute(
            select(ParkingZone).where(ParkingZone.id == request.zone_id)
        )
        if not z_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parking zone not found",
            )

        slot = ParkingSlot(
            zone_id=request.zone_id,
            slot_number=request.slot_number,
            status=request.status,
            x_coord=request.x_coord,
            y_coord=request.y_coord,
            width=request.width,
            height=request.height,
            slot_type=request.slot_type or "STANDARD",
        )
        db.add(slot)
        await db.commit()
        await db.refresh(slot)
        return slot

    @staticmethod
    async def get_availability(db: AsyncSession) -> dict:
        z_res = await db.execute(select(ParkingZone))
        zones = z_res.scalars().all()

        availability = []
        total_slots = 0
        total_available = 0

        for zone in zones:
            s_res = await db.execute(
                select(ParkingSlot).where(ParkingSlot.zone_id == zone.id)
            )
            slots = s_res.scalars().all()
            z_total = len(slots)
            z_avail = sum(1 for s in slots if s.status == "AVAILABLE")
            total_slots += z_total
            total_available += z_avail

            availability.append({
                "zone_id": zone.id,
                "zone_name": zone.name,
                "floor": zone.floor,
                "total_slots": z_total,
                "available_slots": z_avail,
                "occupied_slots": z_total - z_avail,
            })

        return {
            "total_slots": total_slots,
            "total_available": total_available,
            "total_occupied": total_slots - total_available,
            "occupancy_rate": (
                round((total_slots - total_available) / total_slots * 100, 2)
                if total_slots > 0
                else 0.0
            ),
            "zones": availability,
        }

    @staticmethod
    async def assign_slot(
        db: AsyncSession, assigned_by_user_id: int, request: ParkingAssignRequest
    ) -> ParkingAssignment:
        # Check slot
        s_res = await db.execute(
            select(ParkingSlot).where(ParkingSlot.id == request.slot_id)
        )
        slot = s_res.scalar_one_or_none()
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parking slot not found",
            )
        if slot.status != "AVAILABLE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slot '{slot.slot_number}' is not available (current status: {slot.status})",
            )

        # Check vehicle
        v_res = await db.execute(
            select(Vehicle).where(Vehicle.id == request.vehicle_id)
        )
        vehicle = v_res.scalar_one_or_none()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found",
            )

        # Check if vehicle already has active assignment
        active_v_assign = await db.execute(
            select(ParkingAssignment).where(
                ParkingAssignment.vehicle_id == vehicle.id,
                ParkingAssignment.status == "ACTIVE",
            )
        )
        if active_v_assign.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle already has an active parking assignment",
            )

        # Create assignment
        now = datetime.now(timezone.utc)
        assignment = ParkingAssignment(
            slot_id=slot.id,
            vehicle_id=vehicle.id,
            assigned_by=assigned_by_user_id,
            assigned_at=now,
            status="ACTIVE",
        )
        slot.status = "OCCUPIED"

        db.add(assignment)
        await db.commit()
        await db.refresh(assignment)
        return assignment

    @staticmethod
    async def release_slot(
        db: AsyncSession, request: ParkingReleaseRequest
    ) -> ParkingAssignment:
        assignment = None

        if request.assignment_id:
            res = await db.execute(
                select(ParkingAssignment).where(
                    ParkingAssignment.id == request.assignment_id
                )
            )
            assignment = res.scalar_one_or_none()
        elif request.slot_id:
            res = await db.execute(
                select(ParkingAssignment).where(
                    ParkingAssignment.slot_id == request.slot_id,
                    ParkingAssignment.status == "ACTIVE",
                )
            )
            assignment = res.scalar_one_or_none()
        elif request.vehicle_id:
            res = await db.execute(
                select(ParkingAssignment).where(
                    ParkingAssignment.vehicle_id == request.vehicle_id,
                    ParkingAssignment.status == "ACTIVE",
                )
            )
            assignment = res.scalar_one_or_none()

        if not assignment or assignment.status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Active parking assignment not found for release",
            )

        now = datetime.now(timezone.utc)
        assignment.status = "RELEASED"
        assignment.released_at = now

        # Update slot status
        s_res = await db.execute(
            select(ParkingSlot).where(ParkingSlot.id == assignment.slot_id)
        )
        slot = s_res.scalar_one_or_none()
        if slot:
            slot.status = "AVAILABLE"

        await db.commit()
        await db.refresh(assignment)
        return assignment

    @staticmethod
    async def list_assignments(
        db: AsyncSession, active_only: bool = True
    ) -> list[ParkingAssignment]:
        stmt = select(ParkingAssignment)
        if active_only:
            stmt = stmt.where(ParkingAssignment.status == "ACTIVE")
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_assignment_by_id(
        db: AsyncSession, assignment_id: int
    ) -> ParkingAssignment:
        res = await db.execute(
            select(ParkingAssignment).where(ParkingAssignment.id == assignment_id)
        )
        assignment = res.scalar_one_or_none()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parking assignment not found",
            )
        return assignment
