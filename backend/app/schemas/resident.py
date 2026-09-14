from pydantic import BaseModel, ConfigDict


class ResidentCreate(BaseModel):
    apartment_number: str
    phone: str


class ResidentUpdate(BaseModel):
    apartment_number: str | None = None
    phone: str | None = None


class ResidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    apartment_number: str
    phone: str