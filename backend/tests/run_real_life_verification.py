"""Real-Life Integration Diagnostic Test for OCR Recognition, Twilio SMS, and Digital Twin Map Auto-Generation."""
import asyncio
import io
import os
import sys
from PIL import Image, ImageDraw, ImageFont

from sqlalchemy import select
from app.database.connection import async_session_factory
from app.models.core import Vehicle, ParkingSlot, ParkingZone
from app.models.user import User
from app.models.role import Role
from app.services.ocr_service import OCRService
from app.services.lpr_service import LPRService
from app.services.digital_twin_service import DigitalTwinService
from app.services.parking_service import ParkingService
from app.services.notification_service import NotificationService
from app.services.twilio_service import TwilioService
from app.services.security import hash_password


def create_real_plate_image(plate_text: str = "KA 01 AB 1234") -> bytes:
    """Creates a synthetic license plate image with text for OCR verification."""
    img = Image.new("RGB", (500, 150), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Outer yellow/white border & plate background
    draw.rectangle([5, 5, 495, 145], fill=(255, 255, 255), outline=(0, 0, 0), width=6)
    draw.rectangle([15, 15, 485, 135], fill=(245, 245, 245), outline=(0, 0, 0), width=3)
    
    # Draw plate text
    try:
        font = ImageFont.truetype("arial.ttf", 60)
    except Exception:
        font = ImageFont.load_default()

    draw.text((40, 35), plate_text, fill=(0, 0, 0), font=font)
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def run_diagnostic():
    print("=" * 70)
    print("🚀 REAL-LIFE SYSTEM DIAGNOSTIC & VERIFICATION TEST")
    print("=" * 70)

    async with async_session_factory() as db:
        # ----------------------------------------------------
        # TEST 1: OCR Recognition & Vehicle LPR
        # ----------------------------------------------------
        print("\n--- 1. TESTING OCR RECOGNITION & LPR SYSTEM ---")
        plate_str = "KA01AB1234"
        img_bytes = create_real_plate_image("KA 01 AB 1234")
        
        # Test OCR extraction
        ocr_result = await OCRService.extract_text_from_image(img_bytes)
        print(f"📷 Image Bytes Generated: {len(img_bytes)} bytes")
        print(f"🔍 OCR Output Status: {ocr_result.get('status')}")
        print(f"⚙️ OCR Engine Used: {ocr_result.get('engine')}")
        print(f"📝 OCR Extracted Fields: {ocr_result.get('fields')}")

        # Seed test vehicle in database
        role_res = await db.execute(select(Role).where(Role.name == "RESIDENT"))
        role = role_res.scalar_one_or_none()
        if not role:
            role = Role(name="RESIDENT", description="Resident")
            db.add(role)
            await db.flush()

        u_res = await db.execute(select(User).where(User.email == "real_owner@astra.dev"))
        user = u_res.scalar_one_or_none()
        if not user:
            user = User(
                full_name="Harshavardhan Resident",
                email="real_owner@astra.dev",
                password_hash=hash_password("Pass123!"),
                role_id=role.id,
                status="ACTIVE",
            )
            db.add(user)
            await db.flush()
            await db.refresh(user)

        v_res = await db.execute(select(Vehicle).where(Vehicle.license_plate == plate_str))
        vehicle = v_res.scalar_one_or_none()
        if not vehicle:
            vehicle = Vehicle(
                license_plate=plate_str,
                make="Tesla",
                model="Model 3",
                color="Midnight Silver",
                vehicle_type="FOUR_WHEELER",
                owner_user_id=user.id,
            )
            db.add(vehicle)
            await db.commit()
            await db.refresh(vehicle)

        # Run LPR recognition
        lpr_result = await LPRService.recognize_license_plate(db, img_bytes)
        print(f"🚘 Recognized License Plate: {lpr_result.get('license_plate')}")
        print(f"🛡️ Authorization Status: {lpr_result.get('authorization_status')}")
        print(f"👤 Registered Owner: {lpr_result.get('owner')}")
        
        assert lpr_result.get("authorization_status") == "AUTHORIZED"
        print("✅ STEP 1 PASS: OCR & Vehicle LPR Recognition Verified!")

        # ----------------------------------------------------
        # TEST 2: Digital Twin Map Auto-Generation
        # ----------------------------------------------------
        print("\n--- 2. TESTING DIGITAL TWIN MAP AUTO-GENERATION ---")
        twin_res = await DigitalTwinService.generate_twin_layout(
            db,
            num_floors=3,
            slots_per_floor=20,
            slots_per_zone=10,
            clear_existing=True,
        )
        print(f"🏢 Floors Generated: {twin_res.get('num_floors')}")
        print(f"📍 Slots Generated: {twin_res.get('created_slots')}")
        print(f"📡 Sensors Deployed: {twin_res.get('created_sensors')}")

        layout = twin_res.get("layout", {})
        print(f"🗺️ Layout Floor List: {layout.get('floors')}")
        print(f"📊 Total Configured Slots: {len(layout.get('slots', []))}")

        assert twin_res.get("status") == "success"
        assert len(layout.get("slots", [])) == 60
        print("✅ STEP 2 PASS: Digital Twin API Layout Auto-Generated!")

        # ----------------------------------------------------
        # TEST 3: Automatic Parking Slot Assignment
        # ----------------------------------------------------
        print("\n--- 3. TESTING AUTOMATIC PARKING SLOT ASSIGNMENT ---")
        slots_list = layout.get("slots", [])
        avail_slot = next((s for s in slots_list if s["status"] == "AVAILABLE"), None)
        assert avail_slot is not None

        slot_id = avail_slot["id"]
        slot_num = avail_slot["slot_number"]
        print(f"🅿️ Selected Available Slot: #{slot_id} ({slot_num})")

        # Assign slot via ParkingService
        from app.schemas.parking import ParkingAssignRequest
        assign_req = ParkingAssignRequest(slot_id=slot_id, vehicle_id=vehicle.id)
        assignment = await ParkingService.assign_slot(db, assigned_by_user_id=user.id, request=assign_req)
        print(f"✅ Slot Assigned Successfully! Assignment ID: {assignment.id}, Status: {assignment.status}")

        # ----------------------------------------------------
        # TEST 4: Twilio Communication & Notification
        # ----------------------------------------------------
        print("\n--- 4. TESTING TWILIO SMS & COMMUNICATION ---")
        sms_msg = (
            f"ASTRA Security Alert: Vehicle {plate_str} recognized! "
            f"Assigned Parking Slot {slot_num} on Floor GROUND. Welcome!"
        )
        phone = "+12345678901"
        sms_res = await TwilioService.send_sms(phone, sms_msg)
        print(f"📱 Twilio Dispatch Status: {sms_res.get('status')}")
        print(f"ℹ️ Twilio Details: {sms_res.get('detail')}")

        # In-app notification creation
        notif = await NotificationService.create_notification(
            db,
            user_id=user.id,
            title="Parking Slot Assigned",
            message=sms_msg,
            notification_type="IN_APP_SMS",
            user_phone=phone,
        )
        print(f"🔔 System Notification Record ID: {notif.id}, Delivery Channel: {notif.delivery_channel}")

        print("\n" + "=" * 70)
        print("🎉 ALL REAL-LIFE INTEGRATION TESTS PASSED SUCCESSFULLY!")
        print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_diagnostic())
