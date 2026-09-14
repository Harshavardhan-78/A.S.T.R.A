import json
import re
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chatbot import ChatMessage, ChatSession, Document


class RAGService:
    @staticmethod
    async def upload_document(
        db: AsyncSession, user_id: int, title: str, filename: str, content_text: str
    ) -> Document:
        doc = Document(
            title=title,
            filename=filename,
            content_text=content_text,
            uploaded_by_user_id=user_id,
            uploaded_at=datetime.now(timezone.utc),
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc

    @staticmethod
    async def list_documents(db: AsyncSession) -> list[Document]:
        result = await db.execute(select(Document))
        return list(result.scalars().all())

    @staticmethod
    async def create_chat_session(
        db: AsyncSession, user_id: int, title: str = "New Chat Session"
    ) -> ChatSession:
        session = ChatSession(
            user_id=user_id,
            title=title,
            created_at=datetime.now(timezone.utc),
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_chat_sessions(
        db: AsyncSession, user_id: int
    ) -> list[ChatSession]:
        res = await db.execute(
            select(ChatSession).where(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc())
        )
        return list(res.scalars().all())

    @staticmethod
    async def get_session_history(
        db: AsyncSession, session_id: int, user_id: int
    ) -> list[ChatMessage]:
        s_res = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id,
            )
        )
        if not s_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found",
            )

        res = await db.execute(
            select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
        )
        return list(res.scalars().all())

    @staticmethod
    async def retrieve_relevant_chunks(db: AsyncSession, query: str) -> list[dict]:
        docs_res = await db.execute(select(Document))
        documents = docs_res.scalars().all()

        query_words = set(re.findall(r"\w+", query.lower()))
        results = []

        for doc in documents:
            paragraphs = [p.strip() for p in doc.content_text.split("\n\n") if p.strip()]
            for p_idx, p in enumerate(paragraphs):
                p_words = set(re.findall(r"\w+", p.lower()))
                if not p_words:
                    continue
                intersection = query_words.intersection(p_words)
                score = len(intersection) / float(len(query_words) or 1)

                if score > 0.05 or not results:
                    results.append({
                        "document_id": doc.id,
                        "document_title": doc.title,
                        "filename": doc.filename,
                        "chunk_index": p_idx,
                        "text": p,
                        "score": round(score, 3),
                    })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:5]

    @staticmethod
    async def process_chat(
        db: AsyncSession, user_id: int, prompt: str, session_id: int | None = None
    ) -> dict:
        if not session_id:
            sess = await RAGService.create_chat_session(
                db, user_id, title=prompt[:40] + ("..." if len(prompt) > 40 else "")
            )
            session_id = sess.id

        # Save user message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=prompt,
            created_at=datetime.now(timezone.utc),
        )
        db.add(user_msg)
        await db.flush()

        chunks = await RAGService.retrieve_relevant_chunks(db, prompt)

        citations = [
            {
                "document_title": c["document_title"],
                "filename": c["filename"],
                "chunk_snippet": c["text"][:150] + "...",
                "relevance_score": c["score"],
            }
            for c in chunks
        ]

        mode = "retrieval_only_fallback"
        answer = ""

        if settings.LLM_API_KEY:
            try:
                # Optional LLM execution call when key configured
                import httpx
                context_text = "\n\n".join([c["text"] for c in chunks])
                sys_prompt = (
                    f"You are ASTRA Society AI Assistant. Use ONLY the following context to answer:\n{context_text}"
                )
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {settings.LLM_API_KEY}"},
                        json={
                            "model": settings.LLM_MODEL,
                            "messages": [
                                {"role": "system", "content": sys_prompt},
                                {"role": "user", "content": prompt},
                            ],
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        answer = data["choices"][0]["message"]["content"]
                        mode = "llm_generated"
            except Exception:
                mode = "retrieval_only_fallback"

        if mode == "retrieval_only_fallback":
            if chunks:
                passages = "\n\n".join([f"• [{c['document_title']}]\n{c['text']}" for c in chunks[:3]])
                answer = (
                    f"[RETRIEVAL-ONLY FALLBACK - No LLM API Key Configured]\n\n"
                    f"Relevant society document passages found:\n\n{passages}"
                )
            else:
                answer = (
                    "[RETRIEVAL-ONLY FALLBACK - No LLM API Key Configured]\n\n"
                    "No relevant society rules or documents were found matching your inquiry."
                )

        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=answer,
            sources=json.dumps(citations),
            created_at=datetime.now(timezone.utc),
        )
        db.add(assistant_msg)
        await db.commit()

        return {
            "session_id": session_id,
            "query": prompt,
            "answer": answer,
            "mode": mode,
            "citations": citations,
        }
