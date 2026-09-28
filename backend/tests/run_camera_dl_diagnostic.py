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
from app.models.vehicle_inspection import VehicleInspection, InspectionImage, DamageDetection
from app.services.damage_service import DamageService
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
        await create_test_user(session, "Resident A", "res_a@astra.com", "Password123!", "RESIDENT")


async def override_get_db():
    async with TestAsyncSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


def run_camera_dl_diagnostic():
    print("=" * 80)
    print("A.S.T.R.A. CAMERA -> DL MODEL -> BEFORE/AFTER DIAGNOSTIC SUITE")
    print("=" * 80)

    asyncio.run(setup_db_tables())
    client = TestClient(app)

    # 1. Login & vehicle creation
    r_valet_login = client.post("/auth/login", json={"email": "valetop@astra.com", "password": "Password123!", "role": "VALET"})
    valet_token = r_valet_login.json()["access_token"]
    valet_headers = {"Authorization": f"Bearer {valet_token}"}

    r_admin_login = client.post("/auth/login", json={"email": "sysadmin@astra.com", "password": "Password123!", "role": "ADMIN"})
    admin_token = r_admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    r_res_a_login = client.post("/auth/login", json={"email": "res_a@astra.com", "password": "Password123!", "role": "RESIDENT"})
    res_a_headers = {"Authorization": f"Bearer {r_res_a_login.json()['access_token']}"}

    r_veh = client.post("/vehicles", headers=res_a_headers, json={"license_plate": "DIAG-101", "make": "Toyota", "model": "Camry", "vehicle_type": "FOUR_WHEELER"})
    veh_id = r_veh.json()["id"]

    # Load real damaged image hero.png
    hero_path = backend_dir.parent / "frontend" / "src" / "assets" / "hero.png"
    assert hero_path.exists(), "hero.png not found"
    with open(hero_path, "rb") as f:
        hero_bytes = f.read()

    print(f"\n[REAL DAMAGED IMAGE LOADED]: {hero_path} ({len(hero_bytes)} bytes)")

    # Phase 7 Direct API vs Camera Workflow
    print("\n--- PHASE 7: BYPASS CAMERA TEST (DIRECT API vs CAMERA WORKFLOW) ---")
    
    # Direct API: POST /damage/analyze-single
    r_direct = client.post(
        "/damage/analyze-single",
        headers=valet_headers,
        files={"image": ("captured-front.png", hero_bytes, "image/png")},
    )
    print(f"Direct API POST /damage/analyze-single status: {r_direct.status_code}")
    direct_res = r_direct.json()
    print("Direct API Response:", direct_res)

    # Camera Workflow Init Inspection
    r_insp = client.post("/damage/inspections", headers=valet_headers, json={"vehicle_id": veh_id, "stage": "BEFORE"})
    before_insp_id = r_insp.json()["id"]

    # Camera Workflow Upload FRONT image (Simulating CameraCaptureModal payload)
    r_cam_upload = client.post(
        f"/damage/inspections/{before_insp_id}/images",
        headers=valet_headers,
        data={"view": "FRONT"},
        files={"image": ("inspection_front.png", hero_bytes, "image/png")},
    )
    print(f"Camera Upload POST /damage/inspections/{before_insp_id}/images status: {r_cam_upload.status_code}")
    cam_res = r_cam_upload.json()
    print("Camera Upload Response:", cam_res)

    print("\n--- PHASE 8: FRONT IMAGE DATABASE TEST ---")
    async def check_db_persistence():
        async with TestAsyncSessionLocal() as db:
            stmt = select(InspectionImage).where(InspectionImage.inspection_id == before_insp_id, InspectionImage.view == "FRONT")
            res = await db.execute(stmt)
            img_rec = res.scalar_one_or_none()
            print("DB InspectionImage Record view:", img_rec.view if img_rec else "None")
            
            det_stmt = select(DamageDetection).where(DamageDetection.inspection_image_id == img_rec.id)
            det_res = await db.execute(det_stmt)
            detections = det_res.scalars().all()
            print(f"DB DamageDetection Record Count: {len(detections)}")
            for d in detections:
                print(f"  DB Detection: type={d.damage_type}, conf={d.confidence}, bbox=[{d.x1}, {d.y1}, {d.x2}, {d.y2}]")
                assert d.damage_type != "none", "Class 0 ('none') stored in DB!"

    asyncio.run(check_db_persistence())

    print("\n--- PHASE 9: COMPLETE ALL FOUR BEFORE VIEWS ---")
    # Upload LEFT and RIGHT
    client.post(f"/damage/inspections/{before_insp_id}/images", headers=valet_headers, data={"view": "LEFT"}, files={"image": ("left.png", hero_bytes, "image/png")})
    client.post(f"/damage/inspections/{before_insp_id}/images", headers=valet_headers, data={"view": "RIGHT"}, files={"image": ("right.png", hero_bytes, "image/png")})

    # Try complete with only 3 views
    r_incomplete = client.post(f"/damage/inspections/{before_insp_id}/complete", headers=valet_headers)
    print(f"Attempt completion with 3 views status: {r_incomplete.status_code} (Expected 400)")
    assert r_incomplete.status_code == 400

    # Upload REAR view
    client.post(f"/damage/inspections/{before_insp_id}/images", headers=valet_headers, data={"view": "REAR"}, files={"image": ("rear.png", hero_bytes, "image/png")})
    r_complete = client.post(f"/damage/inspections/{before_insp_id}/complete", headers=valet_headers)
    print(f"Completion with 4 views status: {r_complete.status_code}, status field: {r_complete.json()['status']}")
    assert r_complete.status_code == 200

    print("\n--- PHASE 10: PARKING WORKFLOW ---")
    client.post("/parking/zones", headers=admin_headers, json={"name": "Zone B", "floor": "Ground"})
    r_slot = client.post("/parking/slots", headers=admin_headers, json={"zone_id": 1, "slot_number": "B-201", "slot_type": "STANDARD"})
    slot_id = r_slot.json()["id"]

    r_assign = client.post("/parking/assign", headers=valet_headers, json={"slot_id": slot_id, "vehicle_id": veh_id})
    print(f"Parking assignment status after BEFORE completion: {r_assign.status_code}")
    assert r_assign.status_code == 201
    pa_id = r_assign.json()["id"]

    print("\n--- PHASE 11: AFTER WORKFLOW ---")
    r_after = client.post("/damage/inspections", headers=valet_headers, json={"vehicle_id": veh_id, "stage": "AFTER", "parking_assignment_id": pa_id})
    after_insp_id = r_after.json()["id"]

    for view in ["FRONT", "LEFT", "RIGHT", "REAR"]:
        client.post(f"/damage/inspections/{after_insp_id}/images", headers=valet_headers, data={"view": view}, files={"image": (f"{view}.png", hero_bytes, "image/png")})

    r_after_comp = client.post(f"/damage/inspections/{after_insp_id}/complete", headers=valet_headers)
    print(f"AFTER inspection completion status: {r_after_comp.status_code}")
    assert r_after_comp.status_code == 200

    print("\n--- PHASE 12: BEFORE/AFTER COMPARISON ENGINE ---")
    r_cmp = client.post(f"/damage/compare/{before_insp_id}/{after_insp_id}", headers=valet_headers)
    print(f"Comparison status: {r_cmp.status_code}")
    cmp_json = r_cmp.json()
    print("Comparison Response Summary:", cmp_json["summary"])
    print("Findings:")
    for f in cmp_json["findings"]:
        print(f"  Finding: view={f['view']}, type={f['damage_type']}, status={f['status']}, iou={f.get('iou')}")

    print("\n" + "=" * 80)
    print("DIAGNOSTIC WORKFLOW SUITE COMPLETED SUCCESSFULLY")
    print("=" * 80)

if __name__ == "__main__":
    run_camera_dl_diagnostic()
