from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.database.dependencies import get_db
from app.schemas.inspection import (
    VehicleInspectionCreate,
    VehicleInspectionResponse,
    InspectionImageResponse,
    SingleImageAnalysisResponse,
    BeforeAfterComparisonResponse,
)
from app.services.damage_service import DamageService
from app.services.inspection_service import InspectionService


router = APIRouter(
    prefix="/damage",
    tags=["Damage Detection & Inspection"],
)


@router.post("/analyze", status_code=status.HTTP_200_OK)
async def analyze_vehicle_damage_legacy(
    entry_image: UploadFile = File(...),
    exit_image: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    entry_bytes = await entry_image.read()
    exit_bytes = await exit_image.read()
    return await DamageService.analyze_vehicle_damage(entry_bytes, exit_bytes)


@router.post(
    "/analyze-single",
    response_model=SingleImageAnalysisResponse,
    status_code=status.HTTP_200_OK,
)
async def analyze_single_image(
    image: UploadFile = File(...),
    confidence_threshold: Optional[float] = Form(None),
    current_user=Depends(get_current_user),
):
    image_bytes = await image.read()
    result = DamageService.analyze_image_bytes(
        image_bytes, confidence_threshold=confidence_threshold
    )
    return result


@router.post(
    "/inspections",
    response_model=VehicleInspectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_vehicle_inspection(
    request: VehicleInspectionCreate,
    current_user=Depends(require_roles("ADMIN", "SECURITY", "VALET", "RESIDENT")),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    inspection = await InspectionService.create_inspection(
        db=db,
        user_id=user.id,
        role=role,
        vehicle_id=request.vehicle_id,
        stage=request.stage,
        parking_assignment_id=request.parking_assignment_id,
    )

    images_resp = [InspectionImageResponse.from_orm_custom(img) for img in inspection.images]
    return VehicleInspectionResponse(
        id=inspection.id,
        vehicle_id=inspection.vehicle_id,
        parking_assignment_id=inspection.parking_assignment_id,
        stage=inspection.stage,
        status=inspection.status,
        created_by_user_id=inspection.created_by_user_id,
        created_at=inspection.created_at,
        completed_at=inspection.completed_at,
        images=images_resp,
    )


@router.post(
    "/inspections/{inspection_id}/images",
    response_model=InspectionImageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_inspection_view_image(
    inspection_id: int,
    view: str = Form(...),
    image: UploadFile = File(...),
    current_user=Depends(require_roles("ADMIN", "SECURITY", "VALET", "RESIDENT")),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    image_bytes = await image.read()

    img_record = await InspectionService.add_view_image(
        db=db,
        user_id=user.id,
        role=role,
        inspection_id=inspection_id,
        view=view,
        image_bytes=image_bytes,
        filename=image.filename or f"inspection_{view}.png",
    )

    return InspectionImageResponse.from_orm_custom(img_record)


@router.get(
    "/inspections/{inspection_id}",
    response_model=VehicleInspectionResponse,
    status_code=status.HTTP_200_OK,
)
async def get_vehicle_inspection(
    inspection_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    inspection = await InspectionService.get_inspection_by_id(db, inspection_id, user.id, role)
    images_resp = [InspectionImageResponse.from_orm_custom(img) for img in inspection.images]

    return VehicleInspectionResponse(
        id=inspection.id,
        vehicle_id=inspection.vehicle_id,
        parking_assignment_id=inspection.parking_assignment_id,
        stage=inspection.stage,
        status=inspection.status,
        created_by_user_id=inspection.created_by_user_id,
        created_at=inspection.created_at,
        completed_at=inspection.completed_at,
        images=images_resp,
    )


@router.post(
    "/inspections/{inspection_id}/complete",
    response_model=VehicleInspectionResponse,
    status_code=status.HTTP_200_OK,
)
async def complete_vehicle_inspection(
    inspection_id: int,
    current_user=Depends(require_roles("ADMIN", "SECURITY", "VALET", "RESIDENT")),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    inspection = await InspectionService.complete_inspection(db, inspection_id, user.id, role)
    images_resp = [InspectionImageResponse.from_orm_custom(img) for img in inspection.images]

    return VehicleInspectionResponse(
        id=inspection.id,
        vehicle_id=inspection.vehicle_id,
        parking_assignment_id=inspection.parking_assignment_id,
        stage=inspection.stage,
        status=inspection.status,
        created_by_user_id=inspection.created_by_user_id,
        created_at=inspection.created_at,
        completed_at=inspection.completed_at,
        images=images_resp,
    )


@router.post(
    "/compare/{before_inspection_id}/{after_inspection_id}",
    response_model=BeforeAfterComparisonResponse,
    status_code=status.HTTP_200_OK,
)
async def compare_before_after_inspections(
    before_inspection_id: int,
    after_inspection_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    result = await InspectionService.compare_before_after(
        db=db,
        before_inspection_id=before_inspection_id,
        after_inspection_id=after_inspection_id,
        user_id=user.id,
        role=role,
    )
    return result


@router.get(
    "/vehicle/{vehicle_id}/history",
    response_model=List[VehicleInspectionResponse],
    status_code=status.HTTP_200_OK,
)
async def get_vehicle_inspection_history(
    vehicle_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    inspections = await InspectionService.list_vehicle_inspections(db, vehicle_id, user.id, role)
    output = []
    for insp in inspections:
        images_resp = [InspectionImageResponse.from_orm_custom(img) for img in insp.images]
        output.append(
            VehicleInspectionResponse(
                id=insp.id,
                vehicle_id=insp.vehicle_id,
                parking_assignment_id=insp.parking_assignment_id,
                stage=insp.stage,
                status=insp.status,
                created_by_user_id=insp.created_by_user_id,
                created_at=insp.created_at,
                completed_at=insp.completed_at,
                images=images_resp,
            )
        )
    return output
