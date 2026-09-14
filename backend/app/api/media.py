from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.dependencies import get_db
from app.schemas.media import MediaResponse
from app.services.media_service import MediaService


router = APIRouter(
    prefix="/media",
    tags=["Media"],
)


@router.post("/upload", response_model=MediaResponse, status_code=status.HTTP_201_CREATED)
async def upload_media_file(
    file: UploadFile = File(...),
    media_type: str = Form("IMAGE"),
    vehicle_id: int | None = Form(None),
    entry_exit_id: int | None = Form(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    contents = await file.read()
    return await MediaService.upload_media(
        db,
        user_id=user.id,
        file_bytes=contents,
        filename=file.filename or "file.png",
        media_type=media_type,
        vehicle_id=vehicle_id,
        entry_exit_id=entry_exit_id,
    )


@router.get("/{id}", response_model=MediaResponse)
async def get_media(
    id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await MediaService.get_media_by_id(db, id)


@router.delete("/{id}")
async def delete_media(
    id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await MediaService.delete_media(db, id, user.id, role)
