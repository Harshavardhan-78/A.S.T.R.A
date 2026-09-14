from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import (
    AnomalyRecord,
    Dispute,
    Notification,
    ParkingAssignment,
    Resident,
    Vehicle,
    VisitorRequest,
)
from app.models.user import User


class ResidentService:
    @staticmethod
    async def create_resident_profile(
        db: AsyncSession, user_id: int, apartment_number: str, phone: str
    ) -> Resident:
        result = await db.execute(
            select(Resident).where(Resident.user_id == user_id)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resident profile already exists",
            )

        resident = Resident(
            user_id=user_id,
            apartment_number=apartment_number,
            phone=phone,
        )
        db.add(resident)
        await db.commit()
        await db.refresh(resident)
        return resident

    @staticmethod
    async def get_resident_profile(db: AsyncSession, user_id: int) -> dict:
        result = await db.execute(
            select(Resident).where(Resident.user_id == user_id)
        )
        resident = result.scalar_one_or_none()
        if not resident:
            # Auto-provision a resident profile with placeholder defaults on first access.
            # Users can update their details later via PUT /residents/me.
            resident = Resident(user_id=user_id, apartment_number="N/A", phone="N/A")
            db.add(resident)
            await db.commit()
            await db.refresh(resident)

        # User details
        u_res = await db.execute(select(User).where(User.id == user_id))
        user = u_res.scalar_one()

        # Vehicles
        v_res = await db.execute(
            select(Vehicle).where(Vehicle.owner_user_id == user_id)
        )
        vehicles = v_res.scalars().all()

        # Visitor requests
        vr_res = await db.execute(
            select(VisitorRequest).where(VisitorRequest.resident_id == resident.id)
        )
        visitor_requests = vr_res.scalars().all()

        # Notifications
        n_res = await db.execute(
            select(Notification).where(Notification.user_id == user_id)
        )
        notifications = n_res.scalars().all()

        # Disputes
        d_res = await db.execute(
            select(Dispute).where(Dispute.raised_by_user_id == user_id)
        )
        disputes = d_res.scalars().all()

        return {
            "id": resident.id,
            "user_id": resident.user_id,
            "full_name": user.full_name,
            "email": user.email,
            "apartment_number": resident.apartment_number,
            "phone": resident.phone,
            "vehicles": vehicles,
            "visitor_requests": visitor_requests,
            "notifications": notifications,
            "disputes": disputes,
        }

    @staticmethod
    async def update_resident_profile(
        db: AsyncSession, user_id: int, apartment_number: str | None = None, phone: str | None = None
    ) -> Resident:
        result = await db.execute(
            select(Resident).where(Resident.user_id == user_id)
        )
        resident = result.scalar_one_or_none()
        if not resident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resident profile not found",
            )

        if apartment_number is not None:
            resident.apartment_number = apartment_number
        if phone is not None:
            resident.phone = phone

        await db.commit()
        await db.refresh(resident)
        return resident
