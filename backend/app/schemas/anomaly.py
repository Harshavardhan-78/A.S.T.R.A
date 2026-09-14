from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AnomalyRecordCreate(BaseModel):
    anomaly_type: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    description: str | None = None
    vehicle_id: int | None = None
    user_id: int | None = None
    entry_exit_id: int | None = None


class AnomalyStatusUpdate(BaseModel):
    status: str  # OPEN, INVESTIGATING, RESOLVED, DISMISSED


class AnomalyRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    anomaly_type: str
    severity: str
    description: str | None = None
    status: str
    vehicle_id: int | None = None
    user_id: int | None = None
    entry_exit_id: int | None = None
    detected_at: datetime
