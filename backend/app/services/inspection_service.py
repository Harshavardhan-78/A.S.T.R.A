from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.core import Vehicle, ParkingAssignment, Media
from app.models.vehicle_inspection import VehicleInspection, InspectionImage, DamageDetection
from app.services.media_service import MediaService
from app.services.damage_service import DamageService
from app.services.damage_comparison_service import DamageComparisonService


REQUIRED_VIEWS = ["FRONT", "LEFT", "RIGHT", "REAR"]


class InspectionService:
    @staticmethod
    async def create_inspection(
        db: AsyncSession,
        user_id: int,
        role: str,
        vehicle_id: int,
        stage: str,  # "BEFORE" or "AFTER"
        parking_assignment_id: Optional[int] = None,
    ) -> VehicleInspection:
        stage_upper = stage.upper()
        if stage_upper not in ["BEFORE", "AFTER"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inspection stage must be 'BEFORE' or 'AFTER'",
            )

        # Validate vehicle exists
        res = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
        vehicle = res.scalar_one_or_none()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found",
            )

        # RBAC Authorization Rule 4: Residents can only inspect their own vehicles
        if role == "RESIDENT" and vehicle.owner_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only create inspections for your own registered vehicles",
            )

        # Validate parking assignment relationship if provided
        if parking_assignment_id:
            res_pa = await db.execute(
                select(ParkingAssignment).where(ParkingAssignment.id == parking_assignment_id)
            )
            pa = res_pa.scalar_one_or_none()
            if not pa:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parking assignment not found",
                )
            if pa.vehicle_id != vehicle_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parking assignment vehicle does not match specified inspection vehicle",
                )

        inspection = VehicleInspection(
            vehicle_id=vehicle_id,
            parking_assignment_id=parking_assignment_id,
            stage=stage_upper,
            status="IN_PROGRESS",
            created_by_user_id=user_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(inspection)
        await db.commit()

        return await InspectionService.get_inspection_by_id(db, inspection.id)

    @staticmethod
    async def get_inspection_by_id(
        db: AsyncSession, inspection_id: int, user_id: Optional[int] = None, role: Optional[str] = None
    ) -> VehicleInspection:
        stmt = (
            select(VehicleInspection)
            .where(VehicleInspection.id == inspection_id)
            .options(
                selectinload(VehicleInspection.images).selectinload(InspectionImage.detections),
                selectinload(VehicleInspection.images).selectinload(InspectionImage.media),
            )
        )
        result = await db.execute(stmt)
        inspection = result.scalar_one_or_none()
        if not inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle inspection record not found",
            )

        # RBAC validation if user_id & role provided
        if role and role == "RESIDENT":
            v_res = await db.execute(select(Vehicle).where(Vehicle.id == inspection.vehicle_id))
            veh = v_res.scalar_one_or_none()
            if not veh or veh.owner_user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this inspection record",
                )

        return inspection

    @staticmethod
    async def add_view_image(
        db: AsyncSession,
        user_id: int,
        role: str,
        inspection_id: int,
        view: str,  # "FRONT", "LEFT", "RIGHT", "REAR"
        image_bytes: bytes,
        filename: str = "inspection_view.png",
    ) -> InspectionImage:
        view_upper = view.upper()
        if view_upper not in REQUIRED_VIEWS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid vehicle view '{view}'. Must be one of: {REQUIRED_VIEWS}",
            )

        inspection = await InspectionService.get_inspection_by_id(db, inspection_id, user_id, role)
        if inspection.status == "COMPLETED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot add image to a completed inspection",
            )

        # Rule 7 Transaction Safety: Duplicate view uploads explicitly replace previous view image & detections
        for existing in list(inspection.images):
            if existing.view == view_upper:
                await db.delete(existing)
                await db.flush()

        # Upload image using existing Media architecture
        media = await MediaService.upload_media(
            db=db,
            user_id=user_id,
            file_bytes=image_bytes,
            filename=filename,
            media_type="INSPECTION_IMAGE",
            vehicle_id=inspection.vehicle_id,
        )

        # Run AI damage detection on the uploaded image
        detection_result = DamageService.analyze_image_bytes(image_bytes)

        inspection_image = InspectionImage(
            inspection_id=inspection.id,
            view=view_upper,
            media_id=media.id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(inspection_image)
        await db.flush()

        # Save AI detections (class 0 'none' already filtered by DamageService)
        for det in detection_result.get("detections", []):
            bbox = det.get("bbox", [0, 0, 0, 0])
            db_det = DamageDetection(
                inspection_image_id=inspection_image.id,
                damage_type=det.get("damage_type", "scratch"),
                confidence=det.get("confidence", 0.0),
                x1=bbox[0],
                y1=bbox[1],
                x2=bbox[2],
                y2=bbox[3],
                created_at=datetime.now(timezone.utc),
            )
            db.add(db_det)

        # Check if all 4 views are present now to mark completed
        existing_views = {img.view for img in inspection.images if img.view != view_upper}
        existing_views.add(view_upper)

        if all(req in existing_views for req in REQUIRED_VIEWS):
            inspection.status = "COMPLETED"
            inspection.completed_at = datetime.now(timezone.utc)

        await db.commit()

        res = await db.execute(
            select(InspectionImage)
            .where(InspectionImage.id == inspection_image.id)
            .options(
                selectinload(InspectionImage.detections),
                selectinload(InspectionImage.media),
            )
        )
        return res.scalar_one()

    @staticmethod
    async def complete_inspection(
        db: AsyncSession, inspection_id: int, user_id: int, role: str
    ) -> VehicleInspection:
        inspection = await InspectionService.get_inspection_by_id(db, inspection_id, user_id, role)
        captured_views = {img.view for img in inspection.images}
        missing_views = [v for v in REQUIRED_VIEWS if v not in captured_views]

        if missing_views:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete inspection. Missing required views: {missing_views}",
            )

        inspection.status = "COMPLETED"
        inspection.completed_at = datetime.now(timezone.utc)
        await db.commit()
        return await InspectionService.get_inspection_by_id(db, inspection_id)

    @staticmethod
    async def compare_before_after(
        db: AsyncSession, before_inspection_id: int, after_inspection_id: int, user_id: int, role: str
    ) -> dict:
        before_insp = await InspectionService.get_inspection_by_id(db, before_inspection_id, user_id, role)
        after_insp = await InspectionService.get_inspection_by_id(db, after_inspection_id, user_id, role)

        if before_insp.vehicle_id != after_insp.vehicle_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot compare inspections from different vehicles",
            )

        if before_insp.stage != "BEFORE" or after_insp.stage != "AFTER":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comparison requires a BEFORE stage inspection and an AFTER stage inspection",
            )

        def extract_views_data(inspection: VehicleInspection) -> Dict[str, dict]:
            result = {}
            for img in inspection.images:
                dets = [
                    {
                        "damage_type": d.damage_type,
                        "confidence": d.confidence,
                        "bbox": [d.x1, d.y1, d.x2, d.y2],
                    }
                    for d in img.detections
                ]
                result[img.view] = {
                    "image_url": img.media.file_url if img.media else None,
                    "detections": dets,
                }
            return result

        before_views = extract_views_data(before_insp)
        after_views = extract_views_data(after_insp)

        return DamageComparisonService.compare_inspections(
            vehicle_id=before_insp.vehicle_id,
            before_inspection_id=before_insp.id,
            after_inspection_id=after_insp.id,
            before_views=before_views,
            after_views=after_views,
            parking_assignment_id=after_insp.parking_assignment_id or before_insp.parking_assignment_id,
        )

    @staticmethod
    async def list_vehicle_inspections(
        db: AsyncSession, vehicle_id: int, user_id: int, role: str
    ) -> List[VehicleInspection]:
        if role == "RESIDENT":
            v_res = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
            veh = v_res.scalar_one_or_none()
            if not veh or veh.owner_user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to inspection records for this vehicle",
                )

        stmt = (
            select(VehicleInspection)
            .where(VehicleInspection.vehicle_id == vehicle_id)
            .order_by(VehicleInspection.created_at.desc())
            .options(
                selectinload(VehicleInspection.images).selectinload(InspectionImage.detections),
                selectinload(VehicleInspection.images).selectinload(InspectionImage.media),
            )
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
