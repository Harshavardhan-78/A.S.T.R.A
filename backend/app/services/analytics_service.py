from datetime import datetime, timedelta, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import (
    AnomalyRecord,
    Dispute,
    EntryExitRecord,
    ParkingSlot,
    Resident,
    Vehicle,
    Visitor,
    VisitorRequest,
)
from app.models.user import User


class AnalyticsService:
    @staticmethod
    async def get_overview(db: AsyncSession) -> dict:
        total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
        total_residents = (await db.execute(select(func.count(Resident.id)))).scalar_one()
        total_visitors = (await db.execute(select(func.count(Visitor.id)))).scalar_one()
        total_vehicles = (await db.execute(select(func.count(Vehicle.id)))).scalar_one()

        total_slots = (await db.execute(select(func.count(ParkingSlot.id)))).scalar_one()
        occupied_slots = (
            await db.execute(
                select(func.count(ParkingSlot.id)).where(ParkingSlot.status == "OCCUPIED")
            )
        ).scalar_one()

        open_anomalies = (
            await db.execute(
                select(func.count(AnomalyRecord.id)).where(AnomalyRecord.status == "OPEN")
            )
        ).scalar_one()

        open_disputes = (
            await db.execute(
                select(func.count(Dispute.id)).where(Dispute.status == "OPEN")
            )
        ).scalar_one()

        return {
            "total_users": total_users,
            "total_residents": total_residents,
            "total_visitors": total_visitors,
            "total_vehicles": total_vehicles,
            "parking_total_slots": total_slots,
            "parking_occupied_slots": occupied_slots,
            "parking_available_slots": total_slots - occupied_slots,
            "parking_occupancy_rate": (
                round((occupied_slots / total_slots) * 100, 2) if total_slots > 0 else 0.0
            ),
            "open_anomalies": open_anomalies,
            "open_disputes": open_disputes,
        }

    @staticmethod
    async def get_parking_analytics(db: AsyncSession) -> dict:
        total_slots = (await db.execute(select(func.count(ParkingSlot.id)))).scalar_one()
        available = (
            await db.execute(
                select(func.count(ParkingSlot.id)).where(ParkingSlot.status == "AVAILABLE")
            )
        ).scalar_one()
        occupied = (
            await db.execute(
                select(func.count(ParkingSlot.id)).where(ParkingSlot.status == "OCCUPIED")
            )
        ).scalar_one()
        reserved = (
            await db.execute(
                select(func.count(ParkingSlot.id)).where(ParkingSlot.status == "RESERVED")
            )
        ).scalar_one()
        maintenance = (
            await db.execute(
                select(func.count(ParkingSlot.id)).where(ParkingSlot.status == "MAINTENANCE")
            )
        ).scalar_one()

        return {
            "total_slots": total_slots,
            "available_slots": available,
            "occupied_slots": occupied,
            "reserved_slots": reserved,
            "maintenance_slots": maintenance,
            "occupancy_percentage": (
                round((occupied / total_slots) * 100, 2) if total_slots > 0 else 0.0
            ),
        }

    @staticmethod
    async def get_security_analytics(db: AsyncSession) -> dict:
        total_entries = (
            await db.execute(
                select(func.count(EntryExitRecord.id)).where(EntryExitRecord.event_type == "ENTRY")
            )
        ).scalar_one()
        total_exits = (
            await db.execute(
                select(func.count(EntryExitRecord.id)).where(EntryExitRecord.event_type == "EXIT")
            )
        ).scalar_one()

        # Currently inside
        currently_inside = max(0, total_entries - total_exits)

        return {
            "total_entries": total_entries,
            "total_exits": total_exits,
            "vehicles_currently_inside": currently_inside,
        }

    @staticmethod
    async def get_visitor_analytics(db: AsyncSession) -> dict:
        total_visitors = (await db.execute(select(func.count(Visitor.id)))).scalar_one()
        total_requests = (await db.execute(select(func.count(VisitorRequest.id)))).scalar_one()
        pending = (
            await db.execute(
                select(func.count(VisitorRequest.id)).where(VisitorRequest.status == "PENDING")
            )
        ).scalar_one()
        approved = (
            await db.execute(
                select(func.count(VisitorRequest.id)).where(VisitorRequest.status == "APPROVED")
            )
        ).scalar_one()
        rejected = (
            await db.execute(
                select(func.count(VisitorRequest.id)).where(VisitorRequest.status == "REJECTED")
            )
        ).scalar_one()

        return {
            "total_visitors": total_visitors,
            "total_requests": total_requests,
            "pending_requests": pending,
            "approved_requests": approved,
            "rejected_requests": rejected,
        }

    @staticmethod
    async def get_anomaly_analytics(db: AsyncSession) -> dict:
        total_anomalies = (await db.execute(select(func.count(AnomalyRecord.id)))).scalar_one()
        open_cnt = (
            await db.execute(
                select(func.count(AnomalyRecord.id)).where(AnomalyRecord.status == "OPEN")
            )
        ).scalar_one()
        investigating_cnt = (
            await db.execute(
                select(func.count(AnomalyRecord.id)).where(AnomalyRecord.status == "INVESTIGATING")
            )
        ).scalar_one()
        resolved_cnt = (
            await db.execute(
                select(func.count(AnomalyRecord.id)).where(AnomalyRecord.status == "RESOLVED")
            )
        ).scalar_one()

        return {
            "total_anomalies": total_anomalies,
            "open_anomalies": open_cnt,
            "investigating_anomalies": investigating_cnt,
            "resolved_anomalies": resolved_cnt,
        }
