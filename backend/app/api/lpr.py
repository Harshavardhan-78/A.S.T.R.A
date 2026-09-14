from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.dependencies import get_db
from app.services.lpr_service import LPRService


router = APIRouter(
    prefix="/lpr",
    tags=["LPR"],
)


@router.post("/recognize", status_code=status.HTTP_200_OK)
async def recognize_license_plate(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contents = await file.read()
    return await LPRService.recognize_license_plate(db, contents)


@router.get("/lookup/{license_plate}")
async def lookup_license_plate(
    license_plate: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await LPRService.lookup_plate(db, license_plate)
