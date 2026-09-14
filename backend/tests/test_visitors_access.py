from datetime import datetime, timedelta, timezone
import pytest


from tests.test_security_parking import create_test_user


@pytest.mark.asyncio
async def test_visitor_and_access_pass_workflow(client, db):
    # Setup Resident & Login
    await client.post(
        "/auth/register",
        json={
            "full_name": "Alice Resident",
            "email": "alice@astra.com",
            "password": "Password123!",
            "role": "RESIDENT",
        },
    )
    alice_tokens = (
        await client.post(
            "/auth/login",
            json={"email": "alice@astra.com", "password": "Password123!"},
        )
    ).json()
    res_headers = {"Authorization": f"Bearer {alice_tokens['access_token']}"}

    await client.post(
        "/residents",
        headers=res_headers,
        json={"apartment_number": "B-202", "phone": "+9876543210"},
    )

    # 1. Create Visitor
    v_res = await client.post(
        "/visitors",
        headers=res_headers,
        json={
            "full_name": "Bob Visitor",
            "phone": "+1122334455",
            "email": "bob@visitor.com",
        },
    )
    assert v_res.status_code == 201
    visitor = v_res.json()

    # 2. Create Visitor Request (Vehicle Number is Mandatory)
    now = datetime.now(timezone.utc)
    vr_res = await client.post(
        "/visitor-requests",
        headers=res_headers,
        json={
            "visitor_id": visitor["id"],
            "vehicle_number": "TS09AB1234",
            "purpose": "Delivery",
            "visit_date": now.isoformat(),
        },
    )
    assert vr_res.status_code == 201
    v_req = vr_res.json()
    assert v_req["status"] == "PENDING"
    assert v_req["vehicle_number"] == "TS09AB1234"

    # 3. Approve Request
    app_res = await client.post(
        f"/visitor-requests/{v_req['id']}/approve",
        headers=res_headers,
    )
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "APPROVED"

    # 4. Generate Access Pass
    pass_res = await client.post(
        f"/access-passes/{v_req['id']}",
        headers=res_headers,
    )
    assert pass_res.status_code == 201
    ap = pass_res.json()
    assert ap["status"] == "ACTIVE"
    assert "ASTRA-" in ap["qr_token"]

    # 5. Verify Access Pass
    ver_res = await client.post(
        "/access-passes/verify",
        json={"qr_token": ap["qr_token"]},
    )
    assert ver_res.status_code == 200
    assert ver_res.json()["status"] == "AUTHORIZED"

    # 6. Verify Vehicle Endpoint with SECURITY authorization (Feature 4 & 9)
    await create_test_user(db, "Security Guard", "sec2@astra.com", "Password123!", "SECURITY")
    sec_tokens = (await client.post("/auth/login", json={"email": "sec2@astra.com", "password": "Password123!", "role": "SECURITY"})).json()
    sec_headers = {"Authorization": f"Bearer {sec_tokens['access_token']}"}

    veh_ver_res = await client.post(
        "/security/verify-vehicle",
        headers=sec_headers,
        json={"vehicle_number": "ts09-ab-1234"},  # Normalized search
    )
    assert veh_ver_res.status_code == 200
    veh_data = veh_ver_res.json()
    assert veh_data["status"] == "VALID"
    assert veh_data["visitor_name"] == "Bob Visitor"
    assert veh_data["responsible_resident"] == "Alice Resident"


@pytest.mark.asyncio
async def test_twilio_notification_delivery_status_tracking(db, monkeypatch):
    from app.services.notification_service import NotificationService
    from app.services.twilio_service import TwilioService

    # 1. Missing credentials fallback test
    notif_unconfigured = await NotificationService.create_notification(
        db,
        user_id=1,
        title="Gate Entry Alert",
        message="Visitor checked in",
        notification_type="IN_APP_SMS",
        user_phone="+1234567890",
    )
    assert notif_unconfigured.delivery_channel == "SMS"
    assert notif_unconfigured.delivery_status == "NOT_CONFIGURED"

    # 2. Simulated Twilio DELIVERED success test
    async def mock_send_sms_success(to_phone, message):
        return {"status": "DELIVERED", "detail": "SMS sent successfully via Twilio", "sms_id": "SM123"}

    monkeypatch.setattr(TwilioService, "send_sms", mock_send_sms_success)
    notif_delivered = await NotificationService.create_notification(
        db,
        user_id=1,
        title="Gate Entry Alert",
        message="Visitor checked in",
        notification_type="IN_APP_SMS",
        user_phone="+1234567890",
    )
    assert notif_delivered.delivery_channel == "SMS"
    assert notif_delivered.delivery_status == "DELIVERED"

    # 3. Simulated Twilio FAILED failure test (must preserve DB notification without crashing)
    async def mock_send_sms_failed(to_phone, message):
        return {"status": "FAILED", "detail": "Twilio API returned status 400", "sms_id": None}

    monkeypatch.setattr(TwilioService, "send_sms", mock_send_sms_failed)
    notif_failed = await NotificationService.create_notification(
        db,
        user_id=1,
        title="Gate Entry Alert",
        message="Visitor checked in",
        notification_type="IN_APP_SMS",
        user_phone="+1234567890",
    )
    assert notif_failed.id is not None
    assert notif_failed.delivery_channel == "SMS"
    assert notif_failed.delivery_status == "FAILED"



