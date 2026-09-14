from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.dependencies import get_db
from app.models.core import AccessPass, Resident, VisitorRequest
from app.schemas.access_pass import (
    AccessPassCreate,
    AccessPassResponse,
    AccessPassVerifyRequest,
    AccessPassVerifyResponse,
)
from app.services.access_pass_service import AccessPassService


router = APIRouter(
    prefix="/access-passes",
    tags=["Access Passes"],
)


@router.post("/verify", response_model=AccessPassVerifyResponse)
async def verify_access_pass(
    request: AccessPassVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    return await AccessPassService.verify_pass_token(
        db, request.qr_token, expected_vehicle_plate=request.expected_vehicle_plate
    )


@router.get("", response_model=list[AccessPassResponse])
async def list_access_passes(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all access passes for the current resident user.
    ADMIN / SECURITY see all passes."""
    user, role = current_user
    if role in ("ADMIN", "SECURITY"):
        result = await db.execute(select(AccessPass))
        return list(result.scalars().all())

    # For RESIDENT: find resident -> their visitor requests -> passes
    res_res = await db.execute(
        select(Resident).where(Resident.user_id == user.id)
    )
    resident = res_res.scalar_one_or_none()
    if not resident:
        return []

    vr_res = await db.execute(
        select(VisitorRequest).where(VisitorRequest.resident_id == resident.id)
    )
    request_ids = [vr.id for vr in vr_res.scalars().all()]
    if not request_ids:
        return []

    ap_res = await db.execute(
        select(AccessPass).where(AccessPass.request_id.in_(request_ids))
    )
    return list(ap_res.scalars().all())


@router.get("/by-request/{request_id}", response_model=AccessPassResponse)
async def get_pass_by_request(
    request_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the access pass generated for a specific visitor request."""
    result = await db.execute(
        select(AccessPass).where(AccessPass.request_id == request_id)
    )
    ap = result.scalar_one_or_none()
    if not ap:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No access pass found for this visitor request",
        )
    return ap


@router.post(
    "/{request_id}",
    response_model=AccessPassResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_access_pass(
    request_id: int,
    valid_hours: int = 24,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AccessPassService.create_access_pass(
        db, request_id=request_id, valid_hours=valid_hours
    )


@router.get("/{pass_id}", response_model=AccessPassResponse)
async def get_access_pass(
    pass_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AccessPassService.get_access_pass(db, pass_id)


@router.get("/{pass_id}/qr-image")
async def get_access_pass_qr_image(
    pass_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ap = await AccessPassService.get_access_pass(db, pass_id)
    base64_image = await AccessPassService.generate_qr_code_image_base64(ap.qr_token)
    return {
        "pass_id": pass_id,
        "qr_token": ap.qr_token,
        "qr_image_data_uri": f"data:image/png;base64,{base64_image}",
    }


@router.post("/{pass_id}/revoke", response_model=AccessPassResponse)
async def revoke_access_pass(
    pass_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AccessPassService.revoke_access_pass(db, pass_id)
