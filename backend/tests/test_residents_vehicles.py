import pytest


@pytest.mark.asyncio
async def test_residents_and_vehicles_workflow(client):
    # Register Resident
    await client.post(
        "/auth/register",
        json={
            "full_name": "John Resident",
            "email": "john@astra.com",
            "password": "Password123!",
            "role": "RESIDENT",
        },
    )
    login_res = await client.post(
        "/auth/login",
        json={"email": "john@astra.com", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 1. Create Resident Profile
    res_resp = await client.post(
        "/residents",
        headers=headers,
        json={"apartment_number": "A-101", "phone": "+1234567890"},
    )
    assert res_resp.status_code == 201

    # 2. Get /residents/me
    me_resp = await client.get("/residents/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["apartment_number"] == "A-101"

    # 3. Create Vehicle (uppercase plate normalization)
    v_resp = await client.post(
        "/vehicles",
        headers=headers,
        json={
            "license_plate": "ka-05-mc-1234",
            "make": "Toyota",
            "model": "Corolla",
            "color": "Silver",
            "vehicle_type": "FOUR_WHEELER",
        },
    )
    assert v_resp.status_code == 201
    veh_data = v_resp.json()
    assert veh_data["license_plate"] == "KA-05-MC-1234"

    # 4. Prevent duplicate plate
    dup_resp = await client.post(
        "/vehicles",
        headers=headers,
        json={
            "license_plate": "KA-05-MC-1234",
            "vehicle_type": "FOUR_WHEELER",
        },
    )
    assert dup_resp.status_code == 400
