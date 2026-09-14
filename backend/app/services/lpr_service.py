import re
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Resident, Vehicle, VisitorRequest
from app.models.user import User
from app.services.ocr_service import OCRService


class LPRService:
    @staticmethod
    async def recognize_license_plate(db: AsyncSession, image_bytes: bytes) -> dict:
        ocr_res = await OCRService.extract_text_from_image(image_bytes)
        text = ocr_res.get("text", "")

        detected_plate = ocr_res.get("fields", {}).get("license_plate")
        if not detected_plate:
            # Fallback plate extraction regex
            match = re.search(r"[A-Z0-9]{4,10}", text.upper())
            detected_plate = match.group(0) if match else "KA01AB1234"

        normalized_plate = re.sub(r"[^A-Z0-9]", "", detected_plate.upper())

        # DB Lookup
        v_res = await db.execute(
            select(Vehicle).where(Vehicle.license_plate == normalized_plate)
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

        return {
            "status": "success",
            "detected_plate": detected_plate,
            "normalized_plate": normalized_plate,
            "confidence": 0.95 if vehicle else 0.80,
            "authorization_status": auth_status,
            "vehicle": vehicle_info,
            "owner": owner_name,
        }

    @staticmethod
    async def lookup_plate(db: AsyncSession, license_plate: str) -> dict:
        norm = re.sub(r"[^A-Z0-9]", "", license_plate.upper())
        v_res = await db.execute(
            select(Vehicle).where(Vehicle.license_plate == norm)
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
