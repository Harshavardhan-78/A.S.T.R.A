from pydantic import BaseModel, ConfigDict


class VehicleCreate(BaseModel):
    license_plate: str
    make: str | None = None
    model: str | None = None
    color: str | None = None
    vehicle_type: str = "FOUR_WHEELER"


class VehicleUpdate(BaseModel):
    make: str | None = None
    model: str | None = None
    color: str | None = None
    vehicle_type: str | None = None


class VehicleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    license_plate: str
    make: str | None = None
    model: str | None = None
    color: str | None = None
    vehicle_type: str
    owner_user_id: int | None = None
    visitor_id: int | None = None