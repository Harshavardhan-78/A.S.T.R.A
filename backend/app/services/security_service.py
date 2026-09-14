import re
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import (
    AccessPass,
    EntryExitRecord,
    Resident,
    Vehicle,
    Visitor,
    VisitorRequest,
)
from app.models.user import User
from app.schemas.security import GateEntryRequest, GateExitRequest, VehicleVerifyResponse
from app.services.access_pass_service import AccessPassService
from app.services.notification_service import NotificationService


class SecurityService:
    @staticmethod
    async def verify_qr(
        db: AsyncSession, qr_token: str, license_plate: str | None = None
    ):
        return await AccessPassService.verify_pass_token(
            db, qr_token, expected_vehicle_plate=license_plate
        )

    @staticmethod
    async def verify_vehicle(db: AsyncSession, vehicle_number: str) -> VehicleVerifyResponse:
        raw_plate = vehicle_number.strip().upper()
        norm_plate = re.sub(r"[^A-Z0-9]", "", raw_plate)

        if not norm_plate:
            return VehicleVerifyResponse(
                status="INVALID",
                vehicle_number=vehicle_number,
                message="Vehicle number format is invalid",
            )

        # 1. Search for matching VisitorRequest
        stmt = (
            select(VisitorRequest, Visitor, Resident, User)
            .join(Visitor, VisitorRequest.visitor_id == Visitor.id)
            .join(Resident, VisitorRequest.resident_id == Resident.id)
            .join(User, Resident.user_id == User.id)
            .order_by(VisitorRequest.created_at.desc())
        )
        res = await db.execute(stmt)
        rows = res.all()

        matched_req = None
        matched_visitor = None
        matched_resident = None
        matched_user = None

        for v_req, vtr, res_obj, usr in rows:
            req_plate = re.sub(r"[^A-Z0-9]", "", (v_req.vehicle_number or "").upper())
            if req_plate == norm_plate:
                matched_req = v_req
                matched_visitor = vtr
                matched_resident = res_obj
                matched_user = usr
                break

        # Fallback: search Vehicles table
        if not matched_req:
            veh_stmt = select(Vehicle).where(Vehicle.license_plate == raw_plate)
            veh_res = await db.execute(veh_stmt)
            veh_obj = veh_res.scalar_one_or_none()
            if veh_obj:
                vr_stmt = (
                    select(VisitorRequest, Visitor, Resident, User)
                    .join(Visitor, VisitorRequest.visitor_id == Visitor.id)
                    .join(Resident, VisitorRequest.resident_id == Resident.id)
                    .join(User, Resident.user_id == User.id)
                    .where(VisitorRequest.vehicle_id == veh_obj.id)
                    .order_by(VisitorRequest.created_at.desc())
                )
                vr_res = await db.execute(vr_stmt)
                match = vr_res.first()
                if match:
                    matched_req, matched_visitor, matched_resident, matched_user = match

        if not matched_req:
            return VehicleVerifyResponse(
                status="NOT_FOUND",
                vehicle_number=raw_plate,
                message=f"No visitor request found for vehicle number {raw_plate}",
            )

        # Retrieve AccessPass
        ap_stmt = select(AccessPass).where(AccessPass.request_id == matched_req.id)
        ap_res = await db.execute(ap_stmt)
        access_pass = ap_res.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        responsible_res_name = matched_user.full_name if matched_user else "Resident"
        apt_no = matched_resident.apartment_number if matched_resident else "N/A"
        visitor_name = matched_visitor.full_name if matched_visitor else "Visitor"
        visitor_phone = matched_visitor.phone if matched_visitor else None

        if not access_pass:
            return VehicleVerifyResponse(
                status="INVALID",
                vehicle_number=raw_plate,
                visitor_name=visitor_name,
                visitor_phone=visitor_phone,
                responsible_resident=responsible_res_name,
                apartment_number=apt_no,
                request_id=matched_req.id,
                message="No access pass has been generated for this request",
            )

        if access_pass.status == "REVOKED":
            return VehicleVerifyResponse(
                status="REVOKED",
                vehicle_number=raw_plate,
                visitor_name=visitor_name,
                visitor_phone=visitor_phone,
                responsible_resident=responsible_res_name,
                apartment_number=apt_no,
                pass_status="REVOKED",
                pass_id=access_pass.id,
                request_id=matched_req.id,
                qr_token=access_pass.qr_token,
                valid_from=access_pass.valid_from,
                valid_until=access_pass.valid_until,
                message="Access pass has been revoked by the resident",
            )

        pass_until = access_pass.valid_until
        if pass_until and pass_until.tzinfo is None:
            pass_until = pass_until.replace(tzinfo=timezone.utc)

        if pass_until and pass_until < now:
            return VehicleVerifyResponse(
                status="EXPIRED",
                vehicle_number=raw_plate,
                visitor_name=visitor_name,
                visitor_phone=visitor_phone,
                responsible_resident=responsible_res_name,
                apartment_number=apt_no,
                pass_status="EXPIRED",
                pass_id=access_pass.id,
                request_id=matched_req.id,
                qr_token=access_pass.qr_token,
                valid_from=access_pass.valid_from,
                valid_until=access_pass.valid_until,
                message="Access pass expired",
            )

        # Check entry record
        recent_entry_stmt = (
            select(EntryExitRecord)
            .where(
                EntryExitRecord.visitor_request_id == matched_req.id,
                EntryExitRecord.event_type == "ENTRY",
            )
            .order_by(EntryExitRecord.timestamp.desc())
        )
        recent_entry = (await db.execute(recent_entry_stmt)).scalars().first()

        if recent_entry:
            recent_exit_stmt = select(EntryExitRecord).where(
                EntryExitRecord.visitor_request_id == matched_req.id,
                EntryExitRecord.event_type == "EXIT",
                EntryExitRecord.timestamp > recent_entry.timestamp,
            )
            if not (await db.execute(recent_exit_stmt)).scalars().first():
                return VehicleVerifyResponse(
                    status="ALREADY_CHECKED_IN",
                    vehicle_number=raw_plate,
                    visitor_name=visitor_name,
                    visitor_phone=visitor_phone,
                    responsible_resident=responsible_res_name,
                    apartment_number=apt_no,
                    pass_status=access_pass.status,
                    pass_id=access_pass.id,
                    request_id=matched_req.id,
                    qr_token=access_pass.qr_token,
                    valid_from=access_pass.valid_from,
                    valid_until=access_pass.valid_until,
                    message="Visitor is currently checked in on premises",
                )

        return VehicleVerifyResponse(
            status="VALID",
            vehicle_number=raw_plate,
            visitor_name=visitor_name,
            visitor_phone=visitor_phone,
            responsible_resident=responsible_res_name,
            apartment_number=apt_no,
            pass_status=access_pass.status,
            pass_id=access_pass.id,
            request_id=matched_req.id,
            qr_token=access_pass.qr_token,
            valid_from=access_pass.valid_from,
            valid_until=access_pass.valid_until,
            message="Vehicle and visitor pass verified successfully",
        )

    @staticmethod
    async def process_entry(
        db: AsyncSession, security_user_id: int, request: GateEntryRequest
    ) -> EntryExitRecord:
        # 1. Verify pass
        verification = await AccessPassService.verify_pass_token(
            db, request.qr_token, expected_vehicle_plate=request.license_plate
        )

        if verification.status != "AUTHORIZED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gate entry denied: {verification.reason}",
            )

        # Retrieve pass and request
        ap_res = await db.execute(
            select(AccessPass).where(AccessPass.qr_token == request.qr_token)
        )
        access_pass = ap_res.scalar_one()

        vr_res = await db.execute(
            select(VisitorRequest).where(VisitorRequest.id == access_pass.request_id)
        )
        v_req = vr_res.scalar_one()

        # Find or ensure vehicle
        vehicle_id = v_req.vehicle_id
        plate_str = request.license_plate or v_req.vehicle_number or f"WALKIN-{v_req.id}"
        plate_norm = plate_str.strip().upper()

        if not vehicle_id:
            v_lookup = await db.execute(
                select(Vehicle).where(Vehicle.license_plate == plate_norm)
            )
            existing_veh = v_lookup.scalar_one_or_none()
            if existing_veh:
                vehicle_id = existing_veh.id
            else:
                new_veh = Vehicle(
                    license_plate=plate_norm,
                    vehicle_type="FOUR_WHEELER",
                    visitor_id=v_req.visitor_id,
                )
                db.add(new_veh)
                await db.flush()
                vehicle_id = new_veh.id

        record = EntryExitRecord(
            vehicle_id=vehicle_id,
            visitor_request_id=v_req.id,
            access_pass_id=access_pass.id,
            security_user_id=security_user_id,
            event_type="ENTRY",
            timestamp=datetime.now(timezone.utc),
            gate=request.gate,
            notes=request.notes,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

        # Notify responsible resident
        try:
            res_stmt = (
                select(Resident, User)
                .join(User, Resident.user_id == User.id)
                .where(Resident.id == v_req.resident_id)
            )
            res_row = (await db.execute(res_stmt)).first()
            if res_row:
                res_obj, user_obj = res_row
                vtr_res = await db.execute(select(Visitor).where(Visitor.id == v_req.visitor_id))
                vtr_obj = vtr_res.scalar_one_or_none()
                vtr_name = vtr_obj.full_name if vtr_obj else "Visitor"
                await NotificationService.create_notification(
                    db,
                    user_id=user_obj.id,
                    title="Visitor Checked In",
                    message=f"Visitor {vtr_name} ({plate_norm}) has checked in at {request.gate or 'Main Gate'}.",
                    notification_type="IN_APP_SMS",
                    user_phone=res_obj.phone,
                )
        except Exception:
            pass

        return record

    @staticmethod
    async def process_exit(
        db: AsyncSession, security_user_id: int, request: GateExitRequest
    ) -> EntryExitRecord:
        plate_norm = request.license_plate.strip().upper()
        veh_res = await db.execute(
            select(Vehicle).where(Vehicle.license_plate == plate_norm)
        )
        vehicle = veh_res.scalar_one_or_none()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with plate '{plate_norm}' not found",
            )

        # Check active entry
        entry_res = await db.execute(
            select(EntryExitRecord).where(
                EntryExitRecord.vehicle_id == vehicle.id,
                EntryExitRecord.event_type == "ENTRY",
            ).order_by(EntryExitRecord.timestamp.desc())
        )
        last_entry = entry_res.scalars().first()

        if not last_entry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No prior active entry record found for this vehicle",
            )

        record = EntryExitRecord(
            vehicle_id=vehicle.id,
            visitor_request_id=last_entry.visitor_request_id,
            access_pass_id=last_entry.access_pass_id,
            security_user_id=security_user_id,
            event_type="EXIT",
            timestamp=datetime.now(timezone.utc),
            gate=request.gate,
            notes=request.notes,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

        # Notify responsible resident
        try:
            if last_entry.visitor_request_id:
                vr_res = await db.execute(
                    select(VisitorRequest).where(VisitorRequest.id == last_entry.visitor_request_id)
                )
                v_req = vr_res.scalar_one_or_none()
                if v_req:
                    res_stmt = (
                        select(Resident, User)
                        .join(User, Resident.user_id == User.id)
                        .where(Resident.id == v_req.resident_id)
                    )
                    res_row = (await db.execute(res_stmt)).first()
                    if res_row:
                        res_obj, user_obj = res_row
                        vtr_res = await db.execute(select(Visitor).where(Visitor.id == v_req.visitor_id))
                        vtr_obj = vtr_res.scalar_one_or_none()
                        vtr_name = vtr_obj.full_name if vtr_obj else "Visitor"
                        await NotificationService.create_notification(
                            db,
                            user_id=user_obj.id,
                            title="Visitor Checked Out",
                            message=f"Visitor {vtr_name} ({plate_norm}) has checked out at {request.gate or 'Main Gate'}.",
                            notification_type="IN_APP_SMS",
                            user_phone=res_obj.phone,
                        )
        except Exception:
            pass

        return record

    @staticmethod
    async def get_active_visitors(db: AsyncSession) -> list[dict]:
        entries_res = await db.execute(
            select(EntryExitRecord).where(EntryExitRecord.event_type == "ENTRY")
        )
        entries = entries_res.scalars().all()

        active = []
        for entry in entries:
            exit_res = await db.execute(
                select(EntryExitRecord).where(
                    EntryExitRecord.vehicle_id == entry.vehicle_id,
                    EntryExitRecord.event_type == "EXIT",
                    EntryExitRecord.timestamp > entry.timestamp,
                )
            )
            if not exit_res.scalars().first():
                v_res = await db.execute(
                    select(Vehicle).where(Vehicle.id == entry.vehicle_id)
                )
                veh = v_res.scalar_one_or_none()
                active.append({
                    "entry_record_id": entry.id,
                    "vehicle_id": entry.vehicle_id,
                    "license_plate": veh.license_plate if veh else None,
                    "visitor_request_id": entry.visitor_request_id,
                    "entry_time": entry.timestamp,
                    "gate": entry.gate,
                })
        return active

    @staticmethod
    async def get_security_history(db: AsyncSession, limit: int = 50) -> list[EntryExitRecord]:
        result = await db.execute(
            select(EntryExitRecord).order_by(EntryExitRecord.timestamp.desc()).limit(limit)
        )
        return list(result.scalars().all())
