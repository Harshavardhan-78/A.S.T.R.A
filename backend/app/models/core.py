from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Resident(Base):
    __tablename__ = "residents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
    )

    apartment_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )


class Visitor(Base):
    __tablename__ = "visitors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    email: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    id_document_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    id_document_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    license_plate: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
    )

    make: Mapped[str | None] = mapped_column(String(50))
    model: Mapped[str | None] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(30))
    vehicle_type: Mapped[str] = mapped_column(String(30), nullable=False)

    owner_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    visitor_id: Mapped[int | None] = mapped_column(
        ForeignKey("visitors.id"),
        nullable=True,
    )


class VisitorRequest(Base):
    __tablename__ = "visitor_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    resident_id: Mapped[int] = mapped_column(
        ForeignKey("residents.id"),
        nullable=False,
    )

    visitor_id: Mapped[int] = mapped_column(
        ForeignKey("visitors.id"),
        nullable=False,
    )

    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id"),
        nullable=True,
    )

    vehicle_number: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    purpose: Mapped[str | None] = mapped_column(String(255))

    visit_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    expected_entry: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    expected_exit: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )


class AccessPass(Base):
    __tablename__ = "access_passes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    request_id: Mapped[int] = mapped_column(
        ForeignKey("visitor_requests.id"),
        unique=True,
        nullable=False,
    )

    qr_token: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    valid_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    valid_until: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="ACTIVE",
    )


class ParkingZone(Base):
    __tablename__ = "parking_zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    floor: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(Text)

    x_coord: Mapped[float | None] = mapped_column(Float, nullable=True)
    y_coord: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)


class ParkingSlot(Base):
    __tablename__ = "parking_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    zone_id: Mapped[int] = mapped_column(
        ForeignKey("parking_zones.id"),
        nullable=False,
    )

    slot_number: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="AVAILABLE",
    )

    x_coord: Mapped[float | None] = mapped_column(Float, nullable=True)
    y_coord: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    slot_type: Mapped[str | None] = mapped_column(String(30), nullable=True, default="STANDARD")


class ParkingSensor(Base):
    __tablename__ = "parking_sensors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    slot_id: Mapped[int] = mapped_column(
        ForeignKey("parking_slots.id"),
        nullable=False,
    )

    sensor_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    sensor_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="ULTRASONIC",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    last_ping: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class ParkingNode(Base):
    __tablename__ = "parking_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    zone_id: Mapped[int | None] = mapped_column(
        ForeignKey("parking_zones.id"),
        nullable=True,
    )

    node_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    x_coord: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    y_coord: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)


class ParkingAssignment(Base):
    __tablename__ = "parking_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    slot_id: Mapped[int] = mapped_column(
        ForeignKey("parking_slots.id"),
        nullable=False,
    )

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id"),
        nullable=False,
    )

    assigned_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    released_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="ACTIVE",
    )


class EntryExitRecord(Base):
    __tablename__ = "entry_exit_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id"),
        nullable=False,
    )

    visitor_request_id: Mapped[int | None] = mapped_column(
        ForeignKey("visitor_requests.id"),
        nullable=True,
    )

    access_pass_id: Mapped[int | None] = mapped_column(
        ForeignKey("access_passes.id"),
        nullable=True,
    )

    security_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    event_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    gate: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    notification_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    delivery_channel: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
        default="IN_APP",
    )

    delivery_status: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
        default="DELIVERED",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )


class Media(Base):
    __tablename__ = "media"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    uploaded_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id"),
        nullable=True,
    )

    entry_exit_id: Mapped[int | None] = mapped_column(
        ForeignKey("entry_exit_records.id"),
        nullable=True,
    )

    media_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    file_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )


class AnomalyRecord(Base):
    __tablename__ = "anomaly_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id"),
        nullable=True,
    )

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    entry_exit_id: Mapped[int | None] = mapped_column(
        ForeignKey("entry_exit_records.id"),
        nullable=True,
    )

    anomaly_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    severity: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(Text)

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="OPEN",
    )

    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )


class Dispute(Base):
    __tablename__ = "disputes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    raised_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id"),
        nullable=True,
    )

    anomaly_id: Mapped[int | None] = mapped_column(
        ForeignKey("anomaly_records.id"),
        nullable=True,
    )

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="OPEN",
    )

    resolution: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    jti: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    token_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    revoked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )