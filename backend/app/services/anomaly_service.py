from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import AnomalyRecord
from app.schemas.anomaly import AnomalyRecordCreate


class AnomalyService:
    @staticmethod
    async def create_anomaly(
        db: AsyncSession, request: AnomalyRecordCreate
    ) -> AnomalyRecord:
        anomaly = AnomalyRecord(
            anomaly_type=request.anomaly_type,
            severity=request.severity.upper(),
            description=request.description,
            vehicle_id=request.vehicle_id,
            user_id=request.user_id,
            entry_exit_id=request.entry_exit_id,
            status="OPEN",
            detected_at=datetime.now(timezone.utc),
        )
        db.add(anomaly)
        await db.commit()
        await db.refresh(anomaly)
        return anomaly

    @staticmethod
    async def list_anomalies(
        db: AsyncSession, status_filter: str | None = None
    ) -> list[AnomalyRecord]:
        stmt = select(AnomalyRecord)
        if status_filter:
            stmt = stmt.where(AnomalyRecord.status == status_filter.upper())
        stmt = stmt.order_by(AnomalyRecord.detected_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_anomaly_by_id(db: AsyncSession, anomaly_id: int) -> AnomalyRecord:
        result = await db.execute(
            select(AnomalyRecord).where(AnomalyRecord.id == anomaly_id)
        )
        anomaly = result.scalar_one_or_none()
        if not anomaly:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Anomaly record not found",
            )
        return anomaly

    @staticmethod
    async def update_anomaly_status(
        db: AsyncSession, anomaly_id: int, new_status: str
    ) -> AnomalyRecord:
        anomaly = await AnomalyService.get_anomaly_by_id(db, anomaly_id)
        anomaly.status = new_status.upper()
        await db.commit()
        await db.refresh(anomaly)
        return anomaly
