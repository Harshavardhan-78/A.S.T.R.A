import io
import pytest
from PIL import Image

from app.services.damage_service import DamageService
from app.services.damage_comparison_service import DamageComparisonService, compute_iou
from test_security_parking import create_test_user


def create_test_image_bytes(color=(255, 0, 0), size=(400, 400), format="PNG") -> bytes:
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_damage_service_initialization():
    detector = DamageService.get_detector()
    assert detector is not None
    assert detector.device in ["cuda", "cpu"]


@pytest.mark.asyncio
async def test_invalid_image_rejected():
    res = DamageService.analyze_image_bytes(b"invalid_corrupt_bytes")
    assert res["detected"] is False
    assert "Corrupt or unsupported image format" in res.get("error", "")


@pytest.mark.asyncio
async def test_empty_image_rejected():
    res = DamageService.analyze_image_bytes(b"")
    assert res["detected"] is False
    assert "Empty or invalid image data" in res.get("error", "")


@pytest.mark.asyncio
async def test_valid_image_inference_schema():
    img_bytes = create_test_image_bytes()
    res = DamageService.analyze_image_bytes(img_bytes)
    assert "detected" in res
    assert "detections" in res
    assert isinstance(res["detections"], list)


def test_iou_computation():
    box1 = [0.1, 0.1, 0.5, 0.5]
    box2 = [0.1, 0.1, 0.5, 0.5]
    assert compute_iou(box1, box2) == 1.0

    box3 = [0.6, 0.6, 0.9, 0.9]
    assert compute_iou(box1, box3) == 0.0


def test_damage_comparison_engine_classifications():
    vehicle_id = 1
    before_views = {
        "FRONT": {
            "image_url": "/uploads/before_front.png",
            "detections": [
                {"damage_type": "scratch", "confidence": 0.85, "bbox": [0.1, 0.1, 0.3, 0.3]}
            ]
        },
        "LEFT": {
            "image_url": "/uploads/before_left.png",
            "detections": []
        },
        "RIGHT": {
            "image_url": "/uploads/before_right.png",
            "detections": [
                {"damage_type": "dent", "confidence": 0.90, "bbox": [0.4, 0.4, 0.5, 0.5]}
            ]
        },
        "REAR": {
            "image_url": "/uploads/before_rear.png",
            "detections": []
        }
    }

    after_views = {
        "FRONT": {
            "image_url": "/uploads/after_front.png",
            "detections": [
                {"damage_type": "scratch", "confidence": 0.88, "bbox": [0.1, 0.1, 0.3, 0.3]} # PRE_EXISTING
            ]
        },
        "LEFT": {
            "image_url": "/uploads/after_left.png",
            "detections": [
                {"damage_type": "dent", "confidence": 0.92, "bbox": [0.2, 0.2, 0.4, 0.4]} # NEW_DAMAGE
            ]
        },
        "RIGHT": {
            "image_url": "/uploads/after_right.png",
            "detections": [
                {"damage_type": "dent", "confidence": 0.91, "bbox": [0.4, 0.4, 0.7, 0.7]} # POSSIBLE_WORSENING
            ]
        },
        "REAR": {
            "image_url": "/uploads/after_rear.png",
            "detections": [
                {"damage_type": "scratch", "confidence": 0.15, "bbox": [0.5, 0.5, 0.6, 0.6]} # UNCERTAIN
            ]
        }
    }

    cmp_res = DamageComparisonService.compare_inspections(
        vehicle_id=vehicle_id,
        before_inspection_id=10,
        after_inspection_id=11,
        before_views=before_views,
        after_views=after_views,
    )

    assert cmp_res["summary"]["new_damage_detected"] is True
    assert cmp_res["summary"]["new_damage_count"] >= 1
    assert cmp_res["summary"]["pre_existing_damage_count"] >= 1
    assert cmp_res["summary"]["possible_worsening_count"] >= 1
    assert cmp_res["summary"]["uncertain_count"] >= 1
    assert "Potential new damage detected" in cmp_res["summary"]["message"]


@pytest.mark.asyncio
async def test_inspection_api_workflow(client, db):
    # Register & Login Admin user
    await create_test_user(db, "Admin User", "admin_dmg@astra.com", "Password123!", "ADMIN")
    login_resp = await client.post(
        "/auth/login",
        json={"email": "admin_dmg@astra.com", "password": "Password123!", "role": "ADMIN"}
    )
    assert login_resp.status_code == 200
    tokens = login_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # Register test vehicle
    v_res = await client.post(
        "/vehicles",
        headers=headers,
        json={
            "license_plate": "TEST-DMG-100",
            "make": "Toyota",
            "model": "Camry",
            "color": "Silver",
            "vehicle_type": "FOUR_WHEELER"
        }
    )
    assert v_res.status_code in [200, 201]
    vehicle = v_res.json()
    vehicle_id = vehicle["id"]

    # 1. Start BEFORE inspection
    create_insp_res = await client.post(
        "/damage/inspections",
        headers=headers,
        json={
            "vehicle_id": vehicle_id,
            "stage": "BEFORE"
        }
    )
    assert create_insp_res.status_code == 201
    before_insp = create_insp_res.json()
    before_insp_id = before_insp["id"]
    assert before_insp["stage"] == "BEFORE"

    # 2. Upload images for 4 views (FRONT, LEFT, RIGHT, REAR)
    img_bytes = create_test_image_bytes()
    for view in ["FRONT", "LEFT", "RIGHT", "REAR"]:
        u_res = await client.post(
            f"/damage/inspections/{before_insp_id}/images",
            headers=headers,
            data={"view": view},
            files={"image": ("view.png", img_bytes, "image/png")}
        )
        assert u_res.status_code == 201
        assert u_res.json()["view"] == view

    # 3. Complete BEFORE inspection
    comp_res = await client.post(
        f"/damage/inspections/{before_insp_id}/complete",
        headers=headers
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"

    # 4. Start AFTER inspection
    create_after_res = await client.post(
        "/damage/inspections",
        headers=headers,
        json={
            "vehicle_id": vehicle_id,
            "stage": "AFTER"
        }
    )
    assert create_after_res.status_code == 201
    after_insp_id = create_after_res.json()["id"]

    for view in ["FRONT", "LEFT", "RIGHT", "REAR"]:
        await client.post(
            f"/damage/inspections/{after_insp_id}/images",
            headers=headers,
            data={"view": view},
            files={"image": ("view.png", img_bytes, "image/png")}
        )

    await client.post(
        f"/damage/inspections/{after_insp_id}/complete",
        headers=headers
    )

    # 5. Run BEFORE/AFTER comparison
    cmp_api_res = await client.post(
        f"/damage/compare/{before_insp_id}/{after_insp_id}",
        headers=headers
    )
    assert cmp_api_res.status_code == 200
    cmp_json = cmp_api_res.json()
    assert cmp_json["vehicle_id"] == vehicle_id
    assert "summary" in cmp_json
    assert "views" in cmp_json
