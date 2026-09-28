from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    delivery_channel: str | None = "IN_APP"
    delivery_status: str | None = "DELIVERED"
    created_at: datetime
