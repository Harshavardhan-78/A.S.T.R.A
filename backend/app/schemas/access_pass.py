from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AccessPassCreate(BaseModel):
    request_id: int
    valid_hours: int = 24


class AccessPassVerifyRequest(BaseModel):
    qr_token: str
    expected_vehicle_plate: str | None = None


class AccessPassVerifyResponse(BaseModel):
    status: str  # AUTHORIZED or DENIED
    reason: str | None = None
    pass_id: int | None = None
    request_id: int | None = None
    visitor_name: str | None = None
    license_plate: str | None = None


class AccessPassResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: int
    qr_token: str
    valid_from: datetime
    valid_until: datetime
    status: str
