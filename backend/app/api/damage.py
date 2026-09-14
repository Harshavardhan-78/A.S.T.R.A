from fastapi import APIRouter, Depends, File, UploadFile, status

from app.api.dependencies import get_current_user
from app.services.damage_service import DamageService


router = APIRouter(
    prefix="/damage",
    tags=["Damage Detection"],
)


@router.post("/analyze", status_code=status.HTTP_200_OK)
async def analyze_vehicle_damage(
    entry_image: UploadFile = File(...),
    exit_image: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    entry_bytes = await entry_image.read()
    exit_bytes = await exit_image.read()
    return await DamageService.analyze_vehicle_damage(entry_bytes, exit_bytes)
