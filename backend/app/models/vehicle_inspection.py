from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class VehicleInspection(Base):
    __tablename__ = "vehicle_inspections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id"),
        nullable=False,
    )

    parking_assignment_id: Mapped[int | None] = mapped_column(
        ForeignKey("parking_assignments.id"),
        nullable=True,
    )

    stage: Mapped[str] = mapped_column(
        String(20),  # "BEFORE" or "AFTER"
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),  # "IN_PROGRESS", "COMPLETED"
        nullable=False,
        default="IN_PROGRESS",
    )

    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    images = relationship("InspectionImage", back_populates="inspection", cascade="all, delete-orphan")


class InspectionImage(Base):
    __tablename__ = "inspection_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("vehicle_inspections.id"),
        nullable=False,
    )

    view: Mapped[str] = mapped_column(
        String(20),  # "FRONT", "LEFT", "RIGHT", "REAR"
        nullable=False,
    )

    media_id: Mapped[int] = mapped_column(
        ForeignKey("media.id"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    inspection = relationship("VehicleInspection", back_populates="images")
    media = relationship("Media")
    detections = relationship("DamageDetection", back_populates="inspection_image", cascade="all, delete-orphan")


class DamageDetection(Base):
    __tablename__ = "damage_detections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    inspection_image_id: Mapped[int] = mapped_column(
        ForeignKey("inspection_images.id"),
        nullable=False,
    )

    damage_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    x1: Mapped[float] = mapped_column(Float, nullable=False)
    y1: Mapped[float] = mapped_column(Float, nullable=False)
    x2: Mapped[float] = mapped_column(Float, nullable=False)
    y2: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    inspection_image = relationship("InspectionImage", back_populates="detections")
