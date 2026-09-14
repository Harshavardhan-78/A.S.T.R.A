import base64
import io
import uuid
from datetime import datetime, timedelta, timezone

import qrcode
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import AccessPass, Vehicle, Visitor, VisitorRequest
from app.schemas.access_pass import AccessPassVerifyResponse


class AccessPassService:
    @staticmethod
    async def create_access_pass(
        db: AsyncSession, request_id: int, valid_hours: int = 24
    ) -> AccessPass:
        result = await db.execute(
            select(VisitorRequest).where(VisitorRequest.id == request_id)
        )
        v_req = result.scalar_one_or_none()
        if not v_req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Visitor request not found",
            )

        if v_req.status != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Access pass can only be generated for approved visitor requests",
            )

        # Check existing access pass
        ap_res = await db.execute(
            select(AccessPass).where(AccessPass.request_id == request_id)
        )
        existing_pass = ap_res.scalar_one_or_none()
        if existing_pass:
            return existing_pass

        now = datetime.now(timezone.utc)
        valid_until = now + timedelta(hours=valid_hours)
        qr_token = f"ASTRA-{uuid.uuid4().hex.upper()}"

        access_pass = AccessPass(
            request_id=request_id,
            qr_token=qr_token,
            valid_from=now,
            valid_until=valid_until,
            status="ACTIVE",
        )
        db.add(access_pass)
        await db.commit()
        await db.refresh(access_pass)
        return access_pass

    @staticmethod
    async def generate_qr_code_image_base64(qr_token: str) -> str:
        # Create QR code with token only
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_token)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        img_bytes = buffer.getvalue()
        return base64.b64encode(img_bytes).decode("utf-8")

    @staticmethod
    async def get_access_pass(db: AsyncSession, pass_id: int) -> AccessPass:
        result = await db.execute(
            select(AccessPass).where(AccessPass.id == pass_id)
        )
        ap = result.scalar_one_or_none()
        if not ap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access pass not found",
            )
        return ap

    @staticmethod
    async def verify_pass_token(
        db: AsyncSession, qr_token: str, expected_vehicle_plate: str | None = None
    ) -> AccessPassVerifyResponse:
        result = await db.execute(
            select(AccessPass).where(AccessPass.qr_token == qr_token)
        )
        access_pass = result.scalar_one_or_none()
        if not access_pass:
            return AccessPassVerifyResponse(status="DENIED", reason="Invalid QR token")

        if access_pass.status == "REVOKED":
            return AccessPassVerifyResponse(status="DENIED", reason="Access pass revoked")
        if access_pass.status == "EXPIRED":
            return AccessPassVerifyResponse(status="DENIED", reason="Access pass expired")

        now = datetime.now(timezone.utc)
        if access_pass.valid_until.tzinfo is None:
            pass_until = access_pass.valid_until.replace(tzinfo=timezone.utc)
        else:
            pass_until = access_pass.valid_until

        if now > pass_until:
            access_pass.status = "EXPIRED"
            await db.commit()
            return AccessPassVerifyResponse(status="DENIED", reason="Access pass expired")

        # Load visitor request
        vr_res = await db.execute(
            select(VisitorRequest).where(VisitorRequest.id == access_pass.request_id)
        )
        v_req = vr_res.scalar_one_or_none()
        if not v_req or v_req.status == "REJECTED":
            return AccessPassVerifyResponse(status="DENIED", reason="Visitor request rejected or invalid")

        # Load visitor details
        vis_res = await db.execute(
            select(Visitor).where(Visitor.id == v_req.visitor_id)
        )
        visitor = vis_res.scalar_one_or_none()
        visitor_name = visitor.full_name if visitor else None

        # Check vehicle if expected
        license_plate = None
        if v_req.vehicle_id:
            veh_res = await db.execute(
                select(Vehicle).where(Vehicle.id == v_req.vehicle_id)
            )
            vehicle = veh_res.scalar_one_or_none()
            if vehicle:
                license_plate = vehicle.license_plate
                if expected_vehicle_plate and expected_vehicle_plate.upper() != vehicle.license_plate:
                    return AccessPassVerifyResponse(
                        status="DENIED",
                        reason="Vehicle mismatch",
                        pass_id=access_pass.id,
                        request_id=v_req.id,
                        visitor_name=visitor_name,
                        license_plate=license_plate,
                    )

        return AccessPassVerifyResponse(
            status="AUTHORIZED",
            reason="Access pass valid",
            pass_id=access_pass.id,
            request_id=v_req.id,
            visitor_name=visitor_name,
            license_plate=license_plate,
        )

    @staticmethod
    async def revoke_access_pass(db: AsyncSession, pass_id: int) -> AccessPass:
        ap = await AccessPassService.get_access_pass(db, pass_id)
        ap.status = "REVOKED"
        await db.commit()
        await db.refresh(ap)
        return ap
