from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.database.dependencies import get_db
from app.schemas.chatbot import (
    ChatRequest,
    ChatResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    DocumentResponse,
)
from app.services.rag_service import RAGService


router = APIRouter(
    tags=["Chatbot & Documents"],
)


# --------------------------------------------------
# CHATBOT ENDPOINTS
# --------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def process_chat_prompt(
    request: ChatRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await RAGService.process_chat(
        db, user_id=user.id, prompt=request.prompt, session_id=request.session_id
    )


@router.post("/chat/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    request: ChatSessionCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await RAGService.create_chat_session(db, user_id=user.id, title=request.title)


@router.get("/chat/sessions", response_model=list[ChatSessionResponse])
async def list_chat_sessions(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await RAGService.get_chat_sessions(db, user.id)


@router.get("/chat/sessions/{id}")
async def get_session_history(
    id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await RAGService.get_session_history(db, session_id=id, user_id=user.id)


# --------------------------------------------------
# DOCUMENT INGESTION ENDPOINTS
# --------------------------------------------------

@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(require_roles("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    contents = await file.read()
    text_content = contents.decode("utf-8", errors="ignore")

    return await RAGService.upload_document(
        db,
        user_id=user.id,
        title=title,
        filename=file.filename or "doc.txt",
        content_text=text_content,
    )


@router.get("/documents", response_model=list[DocumentResponse])
async def list_documents(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await RAGService.list_documents(db)
