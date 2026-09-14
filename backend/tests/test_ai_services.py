import pytest


@pytest.mark.asyncio
async def test_ai_services_graceful_fallbacks(client):
    # Register & Login Admin
    await client.post(
        "/auth/register",
        json={"full_name": "Admin AI", "email": "aiadmin@astra.com", "password": "Password123!", "role": "ADMIN", "admin_code": "ASTRA_COMMUNITY_ADMIN_2026_SECRET"},
    )
    tokens = (await client.post("/auth/login", json={"email": "aiadmin@astra.com", "password": "Password123!", "role": "ADMIN"})).json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # 1. OCR Document Test
    ocr_res = await client.post(
        "/ocr/document",
        headers=headers,
        files={"file": ("sample.png", b"fake image bytes", "image/png")},
    )
    assert ocr_res.status_code == 200
    assert "status" in ocr_res.json()

    # 2. LPR Recognize Test
    lpr_res = await client.post(
        "/lpr/recognize",
        headers=headers,
        files={"file": ("plate.png", b"fake image bytes", "image/png")},
    )
    assert lpr_res.status_code == 200
    lpr_data = lpr_res.json()
    assert "authorization_status" in lpr_data

    # 3. Damage Analyze Test
    dmg_res = await client.post(
        "/damage/analyze",
        headers=headers,
        files={
            "entry_image": ("entry.png", b"fake entry image", "image/png"),
            "exit_image": ("exit.png", b"fake exit image", "image/png"),
        },
    )
    assert dmg_res.status_code == 200
    assert "result" in dmg_res.json()

    # 4. RAG Chatbot Test (Unconfigured LLM Key Fallback)
    chat_res = await client.post(
        "/chat",
        headers=headers,
        json={"prompt": "What are the rules for parking?"},
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["mode"] == "retrieval_only_fallback"
    assert "citations" in chat_data
