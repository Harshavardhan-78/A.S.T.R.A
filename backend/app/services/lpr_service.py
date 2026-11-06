import re
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Vehicle, VisitorRequest
from app.models.user import User
from app.services.ocr_service import OCRService


class LPRService:
    @staticmethod
    async def recognize_license_plate(db: AsyncSession, image_bytes: bytes) -> dict:
        ocr_res = await OCRService.extract_text_from_image(image_bytes)
        text = ocr_res.get("text", "")
        fields = ocr_res.get("fields", {})

        detected_plate = fields.get("license_plate")
        if not detected_plate:
            upper_no_space = text.upper().replace(" ", "").replace("-", "")
            match = re.search(r"([A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4})", upper_no_space)
            if match:
                detected_plate = match.group(1)
            else:
                gen_match = re.search(r"([A-Z0-9]{5,10})", upper_no_space)
                if gen_match:
                    candidate = gen_match.group(1)
                    if any(c.isdigit() for c in candidate) and any(c.isalpha() for c in candidate):
                        detected_plate = candidate

        if not detected_plate:
            return {
                "status": "success",
                "detected_plate": None,
                "license_plate": None,
                "normalized_plate": None,
                "confidence": 0.0,
                "authorization_status": "NOT_VERIFIED",
                "vehicle": None,
                "owner": None,
                "ocr_details": ocr_res,
            }

        normalized_plate = re.sub(r"[^A-Z0-9]", "", detected_plate.upper())

        # DB Lookup resilient to spaces and dashes in DB column
        v_res = await db.execute(
            select(Vehicle).where(
                func.replace(func.replace(func.upper(Vehicle.license_plate), "-", ""), " ", "") == normalized_plate
            )
        )
        vehicle = v_res.scalar_one_or_none()

        auth_status = "UNAUTHORIZED"
        owner_name = None
        vehicle_info = None

        if vehicle:
            vehicle_info = {
                "id": vehicle.id,
                "license_plate": vehicle.license_plate,
                "make": vehicle.make,
                "model": vehicle.model,
                "color": vehicle.color,
                "vehicle_type": vehicle.vehicle_type,
            }
            if vehicle.owner_user_id:
                u_res = await db.execute(
                    select(User).where(User.id == vehicle.owner_user_id)
                )
                user = u_res.scalar_one_or_none()
                if user:
                    owner_name = user.full_name
                    auth_status = "AUTHORIZED"

            if vehicle.visitor_id and auth_status != "AUTHORIZED":
                vr_res = await db.execute(
                    select(VisitorRequest).where(
                        VisitorRequest.vehicle_id == vehicle.id,
                        VisitorRequest.status == "APPROVED",
                    )
                )
                if vr_res.scalar_one_or_none():
                    auth_status = "AUTHORIZED"

        if auth_status != "AUTHORIZED":
            # Check if there is an approved visitor request for this vehicle number
            vr_plate_res = await db.execute(
                select(VisitorRequest).where(
                    func.replace(func.replace(func.upper(VisitorRequest.vehicle_number), "-", ""), " ", "") == normalized_plate,
                    VisitorRequest.status == "APPROVED",
                )
            )
            if vr_plate_res.scalar_one_or_none():
                auth_status = "AUTHORIZED"

        return {
            "status": "success",
            "detected_plate": detected_plate,
            "license_plate": detected_plate,
            "normalized_plate": normalized_plate,
            "confidence": 0.95 if vehicle else (0.85 if auth_status == "AUTHORIZED" else 0.75),
            "authorization_status": auth_status,
            "vehicle": vehicle_info,
            "owner": owner_name,
            "ocr_details": ocr_res,
        }

    @staticmethod
    async def lookup_plate(db: AsyncSession, license_plate: str) -> dict:
        norm = re.sub(r"[^A-Z0-9]", "", license_plate.upper())
        v_res = await db.execute(
            select(Vehicle).where(
                func.replace(func.replace(func.upper(Vehicle.license_plate), "-", ""), " ", "") == norm
            )
        )
        vehicle = v_res.scalar_one_or_none()
        if not vehicle:
            return {
                "found": False,
                "license_plate": norm,
                "message": "Vehicle not found in system database",
            }
        return {
            "found": True,
            "license_plate": vehicle.license_plate,
            "vehicle_id": vehicle.id,
            "vehicle_type": vehicle.vehicle_type,
            "owner_user_id": vehicle.owner_user_id,
            "visitor_id": vehicle.visitor_id,
        }
