from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import AccessPass, Resident, Visitor, VisitorRequest
from app.schemas.visitor import VisitorCreate, VisitorRequestCreate


class VisitorService:
    @staticmethod
    async def create_visitor(
        db: AsyncSession, request: VisitorCreate
    ) -> Visitor:
        visitor = Visitor(
            full_name=request.full_name,
            phone=request.phone,
            email=request.email,
            id_document_type=request.id_document_type,
            id_document_number=request.id_document_number,
        )
        db.add(visitor)
        await db.commit()
        await db.refresh(visitor)
        return visitor

    @staticmethod
    async def list_visitors(db: AsyncSession) -> list[Visitor]:
        result = await db.execute(select(Visitor))
        return list(result.scalars().all())

    @staticmethod
    async def get_visitor_by_id(db: AsyncSession, visitor_id: int) -> Visitor:
        result = await db.execute(select(Visitor).where(Visitor.id == visitor_id))
        visitor = result.scalar_one_or_none()
        if not visitor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Visitor not found",
            )
        return visitor

    @staticmethod
    async def create_visitor_request(
        db: AsyncSession, user_id: int, request: VisitorRequestCreate
    ) -> VisitorRequest:
        result = await db.execute(
            select(Resident).where(Resident.user_id == user_id)
        )
        resident = result.scalar_one_or_none()
        if not resident:
            # Auto-provision a resident profile with defaults on first use.
            # Users can update apartment_number/phone later via PUT /residents/me.
            resident = Resident(user_id=user_id, apartment_number="N/A", phone="N/A")
            db.add(resident)
            await db.commit()
            await db.refresh(resident)

        v_res = await db.execute(
            select(Visitor).where(Visitor.id == request.visitor_id)
        )
        if not v_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Visitor not found",
            )

        visitor_request = VisitorRequest(
            resident_id=resident.id,
            visitor_id=request.visitor_id,
            vehicle_id=request.vehicle_id,
            vehicle_number=request.vehicle_number.strip().upper() if request.vehicle_number else None,
            purpose=request.purpose,
            visit_date=request.visit_date,
            expected_entry=request.expected_entry,
            expected_exit=request.expected_exit,
            status="PENDING",
        )
        db.add(visitor_request)
        await db.commit()
        await db.refresh(visitor_request)
        return visitor_request

    @staticmethod
    async def list_visitor_requests(
        db: AsyncSession, user_id: int, role: str
    ) -> list[VisitorRequest]:
        if role in ["ADMIN", "SECURITY"]:
            result = await db.execute(select(VisitorRequest))
        else:
            res_res = await db.execute(
                select(Resident).where(Resident.user_id == user_id)
            )
            resident = res_res.scalar_one_or_none()
            if not resident:
                return []
            result = await db.execute(
                select(VisitorRequest).where(VisitorRequest.resident_id == resident.id)
            )
        return list(result.scalars().all())

    @staticmethod
    async def get_visitor_request_by_id(
        db: AsyncSession, request_id: int, user_id: int, role: str
    ) -> VisitorRequest:
        result = await db.execute(
            select(VisitorRequest).where(VisitorRequest.id == request_id)
        )
        v_req = result.scalar_one_or_none()
        if not v_req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Visitor request not found",
            )
        if role not in ["ADMIN", "SECURITY"]:
            res_res = await db.execute(
                select(Resident).where(Resident.user_id == user_id)
            )
            resident = res_res.scalar_one_or_none()
            if not resident or v_req.resident_id != resident.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this visitor request",
                )
        return v_req

    @staticmethod
    async def approve_visitor_request(
        db: AsyncSession, request_id: int, user_id: int, role: str
    ) -> VisitorRequest:
        v_req = await VisitorService.get_visitor_request_by_id(
            db, request_id, user_id, role
        )
        if v_req.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve request with status '{v_req.status}'",
            )

        v_req.status = "APPROVED"
        await db.commit()
        await db.refresh(v_req)

        # Auto-generate the access pass upon approval so the resident immediately
        # has a QR pass without a separate manual step.
        from app.services.access_pass_service import AccessPassService
        await AccessPassService.create_access_pass(db, request_id=v_req.id)

        return v_req

    @staticmethod
    async def reject_visitor_request(
        db: AsyncSession, request_id: int, user_id: int, role: str
    ) -> VisitorRequest:
        v_req = await VisitorService.get_visitor_request_by_id(
            db, request_id, user_id, role
        )
        if v_req.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reject request with status '{v_req.status}'",
            )

        v_req.status = "REJECTED"
        await db.commit()
        await db.refresh(v_req)
        return v_req
