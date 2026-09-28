import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    # 1. Register Resident User
    reg_resp = await client.post(
        "/auth/register",
        json={
            "full_name": "Test Resident",
            "email": "resident@astra.com",
            "password": "Password123!",
            "role": "RESIDENT",
        },
    )
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert reg_data["email"] == "resident@astra.com"
    assert reg_data["role"] == "RESIDENT"

    # 2. Login
    login_resp = await client.post(
        "/auth/login",
        json={
            "email": "resident@astra.com",
            "password": "Password123!",
        },
    )
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    assert "refresh_token" in token_data

    # 3. GET /auth/me
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_resp = await client.get("/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "resident@astra.com"
    assert me_data["role"] == "RESIDENT"


@pytest.mark.asyncio
async def test_refresh_and_logout(client):
    # Register & Login
    await client.post(
        "/auth/register",
        json={
            "full_name": "Test User",
            "email": "user@astra.com",
            "password": "Password123!",
            "role": "RESIDENT",
        },
    )
    login_resp = await client.post(
        "/auth/login",
        json={"email": "user@astra.com", "password": "Password123!"},
    )
    tokens = login_resp.json()

    # Refresh
    ref_resp = await client.post(
        "/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert ref_resp.status_code == 200
    new_tokens = ref_resp.json()
    assert "access_token" in new_tokens

    # Logout
    logout_resp = await client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {new_tokens['access_token']}"},
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert logout_resp.status_code == 200

    # Revoked token check
    me_resp = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {new_tokens['access_token']}"},
    )
    assert me_resp.status_code == 401


@pytest.mark.asyncio
async def test_role_based_registration_and_admin_code(client):
    # 1. Admin registration without code -> Rejected
    admin_fail1 = await client.post(
        "/auth/register",
        json={
            "full_name": "Bad Admin",
            "email": "bad_admin@astra.com",
            "password": "Password123!",
            "role": "ADMIN",
        },
    )
    assert admin_fail1.status_code == 400

    # 2. Admin registration with invalid code -> Rejected
    admin_fail2 = await client.post(
        "/auth/register",
        json={
            "full_name": "Bad Admin 2",
            "email": "bad_admin2@astra.com",
            "password": "Password123!",
            "role": "ADMIN",
            "admin_code": "INVALID_CODE_123",
        },
    )
    assert admin_fail2.status_code == 400

    # 3. Admin registration with valid code -> Success
    admin_succ = await client.post(
        "/auth/register",
        json={
            "full_name": "Good Admin",
            "email": "good_admin@astra.com",
            "password": "Password123!",
            "role": "ADMIN",
            "admin_code": "ASTRA_COMMUNITY_ADMIN_2026_SECRET",
        },
    )
    assert admin_succ.status_code == 201
    assert admin_succ.json()["status"] == "ACTIVE"

    # 4. Security registration -> PENDING status
    sec_reg = await client.post(
        "/auth/register",
        json={
            "full_name": "Pending Guard",
            "email": "pending_sec@astra.com",
            "password": "Password123!",
            "role": "SECURITY",
        },
    )
    assert sec_reg.status_code == 201
    assert sec_reg.json()["status"] == "PENDING"

    # Pending security user login -> Rejected
    sec_login_fail = await client.post(
        "/auth/login",
        json={
            "email": "pending_sec@astra.com",
            "password": "Password123!",
            "role": "SECURITY",
        },
    )
    assert sec_login_fail.status_code == 401
    assert "pending admin approval" in sec_login_fail.json()["detail"].lower()

    # 5. Role mismatch on login -> Rejected
    mismatch_login = await client.post(
        "/auth/login",
        json={
            "email": "good_admin@astra.com",
            "password": "Password123!",
            "role": "RESIDENT",  # Actual role is ADMIN
        },
    )
    assert mismatch_login.status_code == 401
    assert "Selected role does not match" in mismatch_login.json()["detail"]


@pytest.mark.asyncio
async def test_registration_approval_and_notifications(client, db):
    # 1. Register Admin
    admin_reg = await client.post(
        "/auth/register",
        json={
            "full_name": "Main Admin",
            "email": "mainadmin@astra.com",
            "password": "Password123!",
            "role": "ADMIN",
            "admin_code": "ASTRA_COMMUNITY_ADMIN_2026_SECRET",
        },
    )
    assert admin_reg.status_code == 201

    admin_login = (await client.post("/auth/login", json={"email": "mainadmin@astra.com", "password": "Password123!", "role": "ADMIN"})).json()
    admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}

    # 2. Register new Security user -> PENDING
    sec_reg = await client.post(
        "/auth/register",
        json={
            "full_name": "Guard Bob",
            "email": "guardbob@astra.com",
            "password": "Password123!",
            "role": "SECURITY",
        },
    )
    assert sec_reg.status_code == 201
    sec_id = sec_reg.json()["user_id"]
    assert sec_reg.json()["status"] == "PENDING"

    # 3. Admin receives notification for new SECURITY registration
    admin_notifs = (await client.get("/notifications", headers=admin_headers)).json()
    assert any("New SECURITY Registration" in n["title"] for n in admin_notifs)

    # 4. Admin Approves SECURITY User -> ACTIVE
    app_res = await client.put(f"/admin/users/{sec_id}/status", headers=admin_headers, json={"status": "ACTIVE"})
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "ACTIVE"

    # 5. Approved Security User can log in & has received approval notification
    sec_login = (await client.post("/auth/login", json={"email": "guardbob@astra.com", "password": "Password123!", "role": "SECURITY"})).json()
    sec_headers = {"Authorization": f"Bearer {sec_login['access_token']}"}

    sec_notifs = (await client.get("/notifications", headers=sec_headers)).json()
    assert any("Account Approved" in n["title"] for n in sec_notifs)

    # 6. Register new Valet user -> PENDING
    valet_reg = await client.post(
        "/auth/register",
        json={
            "full_name": "Valet Dave",
            "email": "valetdave@astra.com",
            "password": "Password123!",
            "role": "VALET",
        },
    )
    assert valet_reg.status_code == 201
    valet_id = valet_reg.json()["user_id"]

    # 7. Admin Rejects Valet User -> REJECTED
    rej_res = await client.put(f"/admin/users/{valet_id}/status", headers=admin_headers, json={"status": "REJECTED"})
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "REJECTED"

    # 8. Rejected user login attempt -> 401 Unauthorized
    valet_login_fail = await client.post("/auth/login", json={"email": "valetdave@astra.com", "password": "Password123!", "role": "VALET"})
    assert valet_login_fail.status_code == 401
    assert "rejected" in valet_login_fail.json()["detail"].lower()


