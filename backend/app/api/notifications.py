from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.dependencies import get_db
from app.schemas.notification import NotificationResponse
from app.services.notification_service import NotificationService


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await NotificationService.get_user_notifications(
        db, user.id, unread_only=unread_only
    )


@router.post("/{id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await NotificationService.mark_as_read(db, id, user.id)


@router.post("/read-all")
async def mark_all_notifications_read(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await NotificationService.mark_all_as_read(db, user.id)
