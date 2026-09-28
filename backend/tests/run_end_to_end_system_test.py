import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio
import io
import os
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select

os.environ["JWT_SECRET_KEY"] = "test_jwt_secret_key_astra_12345"

import app.models
from app.main import app
from app.database.base import Base
from app.database.dependencies import get_db
from app.models.role import Role
from app.services.damage_service import DamageService
from app.services.damage_comparison_service import DamageComparisonService, compute_iou
from test_security_parking import create_test_user


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def setup_db_tables():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        roles = ["ADMIN", "SECURITY", "RESIDENT", "VALET"]
        for role_name in roles:
            session.add(Role(name=role_name))
        await session.commit()

        await create_test_user(session, "Sys Admin", "sysadmin@astra.com", "Password123!", "ADMIN")
        await create_test_user(session, "Valet Op", "valetop@astra.com", "Password123!", "VALET")
        await create_test_user(session, "Security Guard", "secguard@astra.com", "Password123!", "SECURITY")
        await create_test_user(session, "Resident A", "res_a@astra.com", "Password123!", "RESIDENT")
        await create_test_user(session, "Resident B", "res_b@astra.com", "Password123!", "RESIDENT")


async def override_get_db():
    async with TestAsyncSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


def run_full_system_test():
    print("=" * 70)
    print("A.S.T.R.A. END-TO-END VEHICLE DAMAGE SYSTEM TEST SUITE")
    print("=" * 70)

    asyncio.run(setup_db_tables())
    client = TestClient(app)

    # 1. Environment / Startup Verification
    print("\n[1. ENVIRONMENT & STARTUP]")
    r_health = client.get("/health")
    print(f"[OK] GET /health: {r_health.status_code}, response: {r_health.json()}")
    assert r_health.status_code == 200

    r_docs = client.get("/docs")
    print(f"[OK] GET /docs: {r_docs.status_code}")
    assert r_docs.status_code == 200

    # 2. Model Functional Test
    print("\n[2. MODEL FUNCTIONAL TEST]")
    detector = DamageService.get_detector()
    print(f"[OK] Model device: {detector.device}")
    print(f"[OK] Model is_mock: {detector.is_mock}")

    checkpoint_path = backend_dir / "models_weights" / "vehicle_damage_yolov8.pt"
    print(f"[OK] Checkpoint Path: {checkpoint_path.resolve()}")
    assert checkpoint_path.exists(), f"Checkpoint missing at {checkpoint_path}"

    if not detector.is_mock and detector._model is not None:
        print(f"[OK] Model class names: {detector._model.names}")
        assert 0 in detector._model.names and detector._model.names[0] == "none"

    sample_img_dir = backend_dir / "tests" / "assets"
    realistic_img_found = False
    if sample_img_dir.exists():
        for ext in ["*.jpg", "*.jpeg", "*.png"]:
            files = list(sample_img_dir.glob(ext))
            if files:
                sample_img_path = files[0]
                realistic_img_found = True
                break

    if realistic_img_found:
        print(f"[OK] Realistic damage image found")
    else:
        print("[INFO] Real damaged-vehicle detection could not be validated because no suitable test image was available in local assets.")

    # Setup Auth Users & Tokens
    print("\n[SETTING UP AUTH USERS & TOKENS]")
    r_admin_login = client.post("/auth/login", json={"email": "sysadmin@astra.com", "password": "Password123!", "role": "ADMIN"})
    admin_token = r_admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[OK] Admin User logged in.")

    r_valet_login = client.post("/auth/login", json={"email": "valetop@astra.com", "password": "Password123!", "role": "VALET"})
    valet_token = r_valet_login.json()["access_token"]
    valet_headers = {"Authorization": f"Bearer {valet_token}"}
    print("[OK] Valet User logged in.")

    r_sec_login = client.post("/auth/login", json={"email": "secguard@astra.com", "password": "Password123!", "role": "SECURITY"})
    sec_token = r_sec_login.json()["access_token"]
    sec_headers = {"Authorization": f"Bearer {sec_token}"}
    print("[OK] Security User logged in.")

    r_res_a_login = client.post("/auth/login", json={"email": "res_a@astra.com", "password": "Password123!", "role": "RESIDENT"})
    res_a_token = r_res_a_login.json()["access_token"]
    res_a_headers = {"Authorization": f"Bearer {res_a_token}"}

    r_res_b_login = client.post("/auth/login", json={"email": "res_b@astra.com", "password": "Password123!", "role": "RESIDENT"})
    res_b_token = r_res_b_login.json()["access_token"]
    res_b_headers = {"Authorization": f"Bearer {res_b_token}"}
    print("[OK] Residents A & B logged in.")

    r_veh_a = client.post("/vehicles", headers=res_a_headers, json={"license_plate": "RES-A-9999", "make": "Honda", "model": "Civic", "vehicle_type": "FOUR_WHEELER"})
    assert r_veh_a.status_code in [200, 201]
    veh_a_id = r_veh_a.json()["id"]

    r_veh_b = client.post("/vehicles", headers=res_b_headers, json={"license_plate": "RES-B-8888", "make": "BMW", "model": "X5", "vehicle_type": "FOUR_WHEELER"})
    assert r_veh_b.status_code in [200, 201]
    veh_b_id = r_veh_b.json()["id"]

    # 3. API Test — Single Image
    print("\n[3. API TEST — SINGLE IMAGE]")
    test_img = Image.new("RGB", (400, 400), color=(100, 100, 100))
    buf = io.BytesIO()
    test_img.save(buf, format="PNG")
    valid_bytes = buf.getvalue()

    r_single = client.post("/damage/analyze-single", headers=valet_headers, files={"image": ("test.png", valid_bytes, "image/png")})
    print(f"[OK] POST /damage/analyze-single (authenticated): {r_single.status_code}")
    assert r_single.status_code == 200
    assert "detections" in r_single.json()
    assert not any(d.get("damage_type") == "none" for d in r_single.json()["detections"])

    r_invalid = client.post("/damage/analyze-single", headers=valet_headers, files={"image": ("bad.txt", b"invalid_bytes", "text/plain")})
    print(f"[OK] POST /damage/analyze-single (corrupt image): {r_invalid.status_code}")
    assert r_invalid.json()["detected"] is False

    # 4. RBAC / Security Test
    print("\n[4. RBAC & SECURITY VERIFICATION]")
    r_sec_assign = client.post("/parking/assign", headers=sec_headers, json={"slot_id": 1, "vehicle_id": veh_a_id})
    print(f"[OK] SECURITY attempt /parking/assign status: {r_sec_assign.status_code} (Expected 403 Forbidden)")
    assert r_sec_assign.status_code == 403

    r_res_b_insp = client.post("/damage/inspections", headers=res_b_headers, json={"vehicle_id": veh_a_id, "stage": "BEFORE"})
    print(f"[OK] Resident B attempt inspect Resident A vehicle: {r_res_b_insp.status_code} (Expected 403 Forbidden)")
    assert r_res_b_insp.status_code == 403

    # 5. Before Inspection Test
    print("\n[5. BEFORE INSPECTION TEST]")
    r_before_create = client.post("/damage/inspections", headers=valet_headers, json={"vehicle_id": veh_a_id, "stage": "BEFORE"})
    print(f"[OK] Valet start BEFORE inspection status: {r_before_create.status_code}")
    assert r_before_create.status_code == 201
    before_insp_id = r_before_create.json()["id"]

    for view in ["FRONT", "LEFT", "RIGHT"]:
        r_u = client.post(f"/damage/inspections/{before_insp_id}/images", headers=valet_headers, data={"view": view}, files={"image": (f"{view}.png", valid_bytes, "image/png")})
        assert r_u.status_code == 201

    r_comp_fail = client.post(f"/damage/inspections/{before_insp_id}/complete", headers=valet_headers)
    print(f"[OK] Attempt complete inspection with 3 views status: {r_comp_fail.status_code} (Expected 400 Bad Request)")
    assert r_comp_fail.status_code == 400

    r_u_rear = client.post(f"/damage/inspections/{before_insp_id}/images", headers=valet_headers, data={"view": "REAR"}, files={"image": ("REAR.png", valid_bytes, "image/png")})
    assert r_u_rear.status_code == 201

    r_comp_success = client.post(f"/damage/inspections/{before_insp_id}/complete", headers=valet_headers)
    print(f"[OK] Complete BEFORE inspection with all 4 views status: {r_comp_success.status_code}")
    assert r_comp_success.status_code == 200
    assert r_comp_success.json()["status"] == "COMPLETED"

    # 6. Parking Workflow Test
    print("\n[6. PARKING WORKFLOW TEST]")
    client.post("/parking/zones", headers=admin_headers, json={"name": "Zone A", "floor": "Ground Floor"})
    r_slot = client.post("/parking/slots", headers=admin_headers, json={"zone_id": 1, "slot_number": "A-101", "slot_type": "STANDARD"})
    slot_id = r_slot.json()["id"]

    r_assign = client.post("/parking/assign", headers=valet_headers, json={"slot_id": slot_id, "vehicle_id": veh_a_id})
    print(f"[OK] Valet parking assignment status: {r_assign.status_code}")
    assert r_assign.status_code == 201

    # 7. After Inspection Test
    print("\n[7. AFTER INSPECTION TEST]")
    r_after_create = client.post("/damage/inspections", headers=valet_headers, json={"vehicle_id": veh_a_id, "stage": "AFTER", "parking_assignment_id": r_assign.json()["id"]})
    print(f"[OK] Valet start AFTER inspection status: {r_after_create.status_code}")
    assert r_after_create.status_code == 201
    after_insp_id = r_after_create.json()["id"]

    for view in ["FRONT", "LEFT", "RIGHT", "REAR"]:
        r_u = client.post(f"/damage/inspections/{after_insp_id}/images", headers=valet_headers, data={"view": view}, files={"image": (f"{view}.png", valid_bytes, "image/png")})
        assert r_u.status_code == 201

    r_after_comp = client.post(f"/damage/inspections/{after_insp_id}/complete", headers=valet_headers)
    print(f"[OK] Complete AFTER inspection status: {r_after_comp.status_code}")
    assert r_after_comp.status_code == 200

    r_release = client.post("/parking/release", headers=valet_headers, json={"slot_id": slot_id})
    print(f"[OK] Valet parking release status: {r_release.status_code}")
    assert r_release.status_code == 200

    # 8. Before vs After Comparison Test
    print("\n[8. BEFORE vs AFTER COMPARISON ENGINE TEST]")
    r_cmp = client.post(f"/damage/compare/{before_insp_id}/{after_insp_id}", headers=valet_headers)
    print(f"[OK] POST /damage/compare/{before_insp_id}/{after_insp_id} status: {r_cmp.status_code}")
    assert r_cmp.status_code == 200
    cmp_res = r_cmp.json()
    print(f"[OK] Comparison Summary Message: '{cmp_res['summary']['message']}'")

    # 9. Dispute Integration Test
    print("\n[9. DISPUTE INTEGRATION TEST]")
    r_disp = client.post("/disputes", headers=res_a_headers, json={"vehicle_id": veh_a_id, "title": "Evidence Review Request", "description": "Manual dispute review requested for inspection evidence."})
    print(f"[OK] Manual Dispute creation status: {r_disp.status_code}, Dispute ID: {r_disp.json().get('id')}")
    assert r_disp.status_code == 201

    print("\n" + "=" * 70)
    print("ALL END-TO-END SYSTEM TESTS EXECUTED AND PASSED 100%")
    print("=" * 70)


if __name__ == "__main__":
    run_full_system_test()
