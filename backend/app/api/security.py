from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import require_roles
from app.database.dependencies import get_db
from app.schemas.access_pass import AccessPassVerifyRequest, AccessPassVerifyResponse
from app.schemas.security import (
    EntryExitRecordResponse,
    GateEntryRequest,
    GateExitRequest,
    VehicleVerifyRequest,
    VehicleVerifyResponse,
)
from app.services.security_service import SecurityService


router = APIRouter(
    prefix="/security",
    tags=["Security"],
)


@router.post("/verify-vehicle", response_model=VehicleVerifyResponse)
async def verify_vehicle_number(
    request: VehicleVerifyRequest,
    current_user=Depends(require_roles("SECURITY", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await SecurityService.verify_vehicle(db, request.vehicle_number)


@router.post("/verify-qr", response_model=AccessPassVerifyResponse)
async def verify_qr_gate(
    request: AccessPassVerifyRequest,
    current_user=Depends(require_roles("SECURITY", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await SecurityService.verify_qr(
        db, request.qr_token, license_plate=request.expected_vehicle_plate
    )


@router.post("/entry", response_model=EntryExitRecordResponse, status_code=status.HTTP_201_CREATED)
async def record_gate_entry(
    request: GateEntryRequest,
    current_user=Depends(require_roles("SECURITY", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await SecurityService.process_entry(db, security_user_id=user.id, request=request)


@router.post("/exit", response_model=EntryExitRecordResponse, status_code=status.HTTP_201_CREATED)
async def record_gate_exit(
    request: GateExitRequest,
    current_user=Depends(require_roles("SECURITY", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await SecurityService.process_exit(db, security_user_id=user.id, request=request)


@router.get("/active-visitors")
async def list_active_visitors(
    current_user=Depends(require_roles("SECURITY", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await SecurityService.get_active_visitors(db)


@router.get("/history", response_model=list[EntryExitRecordResponse])
async def get_gate_history(
    limit: int = 50,
    current_user=Depends(require_roles("SECURITY", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await SecurityService.get_security_history(db, limit=limit)
