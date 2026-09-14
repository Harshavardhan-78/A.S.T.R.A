import os
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Media


class MediaService:
    @staticmethod
    async def upload_media(
        db: AsyncSession,
        user_id: int,
        file_bytes: bytes,
        filename: str,
        media_type: str = "IMAGE",
        vehicle_id: int | None = None,
        entry_exit_id: int | None = None,
    ) -> Media:
        # Create local uploads directory as fallback
        uploads_dir = os.path.join(os.getcwd(), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)

        ext = os.path.splitext(filename)[1] or ".png"
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        local_path = os.path.join(uploads_dir, unique_filename)

        with open(local_path, "wb") as f:
            f.write(file_bytes)

        file_url = f"/uploads/{unique_filename}"

        media = Media(
            uploaded_by_user_id=user_id,
            vehicle_id=vehicle_id,
            entry_exit_id=entry_exit_id,
            media_type=media_type.upper(),
            file_url=file_url,
            created_at=datetime.now(timezone.utc),
        )
        db.add(media)
        await db.commit()
        await db.refresh(media)
        return media

    @staticmethod
    async def get_media_by_id(db: AsyncSession, media_id: int) -> Media:
        res = await db.execute(select(Media).where(Media.id == media_id))
        media = res.scalar_one_or_none()
        if not media:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Media record not found",
            )
        return media

    @staticmethod
    async def delete_media(db: AsyncSession, media_id: int, user_id: int, role: str) -> dict:
        media = await MediaService.get_media_by_id(db, media_id)
        if role not in ["ADMIN", "SECURITY"] and media.uploaded_by_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to delete this media",
            )
        await db.delete(media)
        await db.commit()
        return {"message": "Media deleted successfully", "media_id": media_id}
