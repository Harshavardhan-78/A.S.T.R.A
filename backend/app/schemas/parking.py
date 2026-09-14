from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ParkingZoneCreate(BaseModel):
    name: str
    floor: str
    description: str | None = None
    x_coord: float | None = None
    y_coord: float | None = None
    width: float | None = None
    height: float | None = None


class ParkingZoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    floor: str
    description: str | None = None
    x_coord: float | None = None
    y_coord: float | None = None
    width: float | None = None
    height: float | None = None


class ParkingSlotCreate(BaseModel):
    zone_id: int
    slot_number: str
    status: str = "AVAILABLE"
    x_coord: float | None = None
    y_coord: float | None = None
    width: float | None = None
    height: float | None = None
    slot_type: str | None = "STANDARD"


class ParkingSlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    zone_id: int
    slot_number: str
    status: str
    x_coord: float | None = None
    y_coord: float | None = None
    width: float | None = None
    height: float | None = None
    slot_type: str | None = None


class ParkingAssignRequest(BaseModel):
    slot_id: int
    vehicle_id: int


class ParkingReleaseRequest(BaseModel):
    assignment_id: int | None = None
    slot_id: int | None = None
    vehicle_id: int | None = None


class ParkingAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slot_id: int
    vehicle_id: int
    assigned_by: int
    assigned_at: datetime
    released_at: datetime | None = None
    status: str
