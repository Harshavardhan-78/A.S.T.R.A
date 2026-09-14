from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Dispute
from app.schemas.dispute import DisputeCreate


class DisputeService:
    @staticmethod
    async def create_dispute(
        db: AsyncSession, user_id: int, request: DisputeCreate
    ) -> Dispute:
        dispute = Dispute(
            raised_by_user_id=user_id,
            title=request.title,
            description=request.description,
            vehicle_id=request.vehicle_id,
            anomaly_id=request.anomaly_id,
            status="OPEN",
            created_at=datetime.now(timezone.utc),
        )
        db.add(dispute)
        await db.commit()
        await db.refresh(dispute)
        return dispute

    @staticmethod
    async def list_disputes(
        db: AsyncSession, user_id: int, role: str
    ) -> list[Dispute]:
        if role in ["ADMIN", "SECURITY"]:
            stmt = select(Dispute).order_by(Dispute.created_at.desc())
        else:
            stmt = select(Dispute).where(Dispute.raised_by_user_id == user_id).order_by(Dispute.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_dispute_by_id(
        db: AsyncSession, dispute_id: int, user_id: int, role: str
    ) -> Dispute:
        result = await db.execute(
            select(Dispute).where(Dispute.id == dispute_id)
        )
        dispute = result.scalar_one_or_none()
        if not dispute:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispute not found",
            )
        if role not in ["ADMIN", "SECURITY"] and dispute.raised_by_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this dispute",
            )
        return dispute

    @staticmethod
    async def mark_investigating(
        db: AsyncSession, dispute_id: int, user_id: int, role: str
    ) -> Dispute:
        dispute = await DisputeService.get_dispute_by_id(db, dispute_id, user_id, role)
        dispute.status = "INVESTIGATING"
        await db.commit()
        await db.refresh(dispute)
        return dispute

    @staticmethod
    async def resolve_dispute(
        db: AsyncSession, dispute_id: int, user_id: int, role: str, resolution: str, dismiss: bool = False
    ) -> Dispute:
        dispute = await DisputeService.get_dispute_by_id(db, dispute_id, user_id, role)
        dispute.status = "DISMISSED" if dismiss else "RESOLVED"
        dispute.resolution = resolution
        await db.commit()
        await db.refresh(dispute)
        return dispute
