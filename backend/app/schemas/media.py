from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MediaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uploaded_by_user_id: int
    media_type: str
    file_url: str
    vehicle_id: int | None = None
    entry_exit_id: int | None = None
    created_at: datetime
