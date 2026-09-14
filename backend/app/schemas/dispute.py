from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DisputeCreate(BaseModel):
    title: str
    description: str
    vehicle_id: int | None = None
    anomaly_id: int | None = None


class DisputeResolutionRequest(BaseModel):
    resolution: str


class DisputeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    raised_by_user_id: int
    title: str
    description: str
    status: str
    resolution: str | None = None
    vehicle_id: int | None = None
    anomaly_id: int | None = None
    created_at: datetime
