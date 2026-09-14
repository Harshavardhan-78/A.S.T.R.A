from datetime import datetime
from pydantic import BaseModel, ConfigDict


class GateEntryRequest(BaseModel):
    qr_token: str
    license_plate: str | None = None
    gate: str | None = "MAIN_GATE"
    notes: str | None = None


class GateExitRequest(BaseModel):
    license_plate: str
    gate: str | None = "MAIN_GATE"
    notes: str | None = None


class EntryExitRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    visitor_request_id: int | None = None
    access_pass_id: int | None = None
    security_user_id: int
    event_type: str
    timestamp: datetime
    gate: str | None = None
    notes: str | None = None


class VehicleVerifyRequest(BaseModel):
    vehicle_number: str


class VehicleVerifyResponse(BaseModel):
    status: str
    vehicle_number: str
    visitor_name: str | None = None
    visitor_phone: str | None = None
    responsible_resident: str | None = None
    apartment_number: str | None = None
    pass_status: str | None = None
    pass_id: int | None = None
    request_id: int | None = None
    qr_token: str | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    message: str | None = None
