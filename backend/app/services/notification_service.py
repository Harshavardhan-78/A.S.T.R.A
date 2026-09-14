import logging
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Notification
from app.services.twilio_service import TwilioService

logger = logging.getLogger("astra.notifications")


class NotificationService:
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: int,
        title: str,
        message: str,
        notification_type: str = "IN_APP",
        user_phone: str | None = None,
        user_email: str | None = None,
    ) -> Notification:
        is_sms = "SMS" in notification_type.upper() and bool(user_phone)
        delivery_channel = "SMS" if is_sms else "IN_APP"
        initial_status = "NOT_CONFIGURED" if is_sms else "DELIVERED"

        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type.upper(),
            is_read=False,
            delivery_channel=delivery_channel,
            delivery_status=initial_status,
            created_at=datetime.now(timezone.utc),
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        if is_sms and user_phone:
            try:
                sms_res = await TwilioService.send_sms(user_phone, message)
                notification.delivery_status = sms_res.get("status", "FAILED")
            except Exception as exc:
                logger.error(f"Failed to dispatch SMS via TwilioService: {exc}")
                notification.delivery_status = "FAILED"

            await db.commit()
            await db.refresh(notification)

        return notification

    @staticmethod
    async def get_user_notifications(
        db: AsyncSession, user_id: int, unread_only: bool = False
    ) -> list[Notification]:
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.is_read == False)
        stmt = stmt.order_by(Notification.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def mark_as_read(
        db: AsyncSession, notification_id: int, user_id: int
    ) -> Notification:
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        n = result.scalar_one_or_none()
        if not n:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )
        n.is_read = True
        await db.commit()
        await db.refresh(n)
        return n

    @staticmethod
    async def mark_all_as_read(db: AsyncSession, user_id: int) -> dict:
        await db.execute(
            update(Notification)
            .where(Notification.user_id == user_id)
            .values(is_read=True)
        )
        await db.commit()
        return {"message": "All notifications marked as read"}
