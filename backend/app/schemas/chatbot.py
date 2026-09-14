from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    filename: str
    uploaded_by_user_id: int
    uploaded_at: datetime


class ChatSessionCreate(BaseModel):
    title: str = "New Chat Session"


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    created_at: datetime


class ChatRequest(BaseModel):
    session_id: int | None = None
    prompt: str


class ChatResponse(BaseModel):
    session_id: int
    query: str
    answer: str
    mode: str
    citations: list[dict]
