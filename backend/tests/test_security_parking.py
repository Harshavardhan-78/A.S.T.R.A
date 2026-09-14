import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.role import Role
from app.models.user import User
from app.services.security import hash_password


async def create_test_user(db: AsyncSession, full_name: str, email: str, password: str, role_name: str):
    result = await db.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one()
    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role_id=role.id,
    )
    db.add(user)
    await db.commit()


@pytest.mark.asyncio
async def test_security_gate_and_valet_parking_workflow(client, db):
    # Setup Admin / Security / Valet / Resident
    await create_test_user(db, "Admin User", "admin@astra.com", "Password123!", "ADMIN")
    admin_tokens = (await client.post("/auth/login", json={"email": "admin@astra.com", "password": "Password123!", "role": "ADMIN"})).json()
    admin_headers = {"Authorization": f"Bearer {admin_tokens['access_token']}"}

    await create_test_user(db, "Security Guard", "sec@astra.com", "Password123!", "SECURITY")
    sec_tokens = (await client.post("/auth/login", json={"email": "sec@astra.com", "password": "Password123!", "role": "SECURITY"})).json()
    sec_headers = {"Authorization": f"Bearer {sec_tokens['access_token']}"}

    # Create Zone & Slot as Admin/Valet
    z_res = await client.post("/parking/zones", headers=admin_headers, json={"name": "Zone Alpha", "floor": "Ground"})
    zone = z_res.json()

    s_res = await client.post(
        "/parking/slots",
        headers=admin_headers,
        json={"zone_id": zone["id"], "slot_number": "A-01", "status": "AVAILABLE"},
    )
    slot = s_res.json()

    # Create Resident & Vehicle
    await client.post(
        "/auth/register",
        json={"full_name": "Res One", "email": "res1@astra.com", "password": "Password123!", "role": "RESIDENT"},
    )
    res_tokens = (await client.post("/auth/login", json={"email": "res1@astra.com", "password": "Password123!"})).json()
    res_headers = {"Authorization": f"Bearer {res_tokens['access_token']}"}

    veh_res = await client.post(
        "/vehicles",
        headers=res_headers,
        json={"license_plate": "KA01AB9999", "vehicle_type": "FOUR_WHEELER"},
    )
    veh = veh_res.json()

    # 1. Valet / Admin Assign Slot
    assign_res = await client.post(
        "/parking/assign",
        headers=admin_headers,
        json={"slot_id": slot["id"], "vehicle_id": veh["id"]},
    )
    assert assign_res.status_code == 201
    asgn = assign_res.json()
    assert asgn["status"] == "ACTIVE"

    # 2. Release Slot
    rel_res = await client.post(
        "/parking/release",
        headers=admin_headers,
        json={"assignment_id": asgn["id"]},
    )
    assert rel_res.status_code == 200
    assert rel_res.json()["status"] == "RELEASED"
