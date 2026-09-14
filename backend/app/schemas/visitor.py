from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class VisitorCreate(BaseModel):
    full_name: str
    phone: str
    email: EmailStr | None = None
    id_document_type: str | None = None
    id_document_number: str | None = None


class VisitorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    phone: str
    email: str | None = None
    id_document_type: str | None = None
    id_document_number: str | None = None


class VisitorRequestCreate(BaseModel):
    visitor_id: int
    vehicle_number: str
    vehicle_id: int | None = None
    purpose: str | None = None
    visit_date: datetime
    expected_entry: datetime | None = None
    expected_exit: datetime | None = None


class VisitorRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resident_id: int
    visitor_id: int
    vehicle_id: int | None = None
    vehicle_number: str | None = None
    purpose: str | None = None
    visit_date: datetime
    expected_entry: datetime | None = None
    expected_exit: datetime | None = None
    status: str