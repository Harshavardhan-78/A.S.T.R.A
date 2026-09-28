import sys
import os
import io
import json
import asyncio
import logging
from pathlib import Path
from PIL import Image

# Ensure backend root is in sys.path
BACKEND_DIR = Path("d:/ASTRA/backend")
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(str(BACKEND_DIR))

import torch
from ultralytics import YOLO
from app.config import settings
from app.services.damage_service import DamageService, DamageDetectorModel
from app.services.inspection_service import InspectionService
from app.services.damage_comparison_service import DamageComparisonService
from app.database.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.vehicle_inspection import VehicleInspection, InspectionImage, DamageDetection
from app.models.core import Vehicle
from app.models.user import User

# Artifact Directory Path for output logging
ARTIFACT_DIR = Path(r"C:\Users\HARSHAVARDHAN\.gemini\antigravity-ide\brain\b79dfff3-a7aa-4723-a828-f5b08ec92edd")

IMAGES = {
    "CLEAN": ARTIFACT_DIR / "clean_vehicle_test_1790169679738.jpg",
    "TEST-01_DENT": ARTIFACT_DIR / "dent_vehicle_test_1790169720412.jpg",
    "TEST-02_SCRATCH": ARTIFACT_DIR / "scratch_vehicle_test_1790169758636.jpg",
    "TEST-03_CRACK": ARTIFACT_DIR / "crack_windshield_test_1790169796946.jpg",
    "TEST-04_LAMP_BROKEN": ARTIFACT_DIR / "lamp_broken_test_1790169834258.jpg",
    "TEST-05_GLASS_SHATTER": ARTIFACT_DIR / "glass_shatter_test_1790169888975.jpg",
    "TEST-06_TIRE_FLAT": ARTIFACT_DIR / "tire_flat_test_1790169933962.jpg",
}

GROUND_TRUTH = {
    "CLEAN": {"gt_class": "none", "gt_bbox": None, "region": "vehicle body"},
    "TEST-01_DENT": {"gt_class": "dent", "gt_bbox": [0.10, 0.20, 0.65, 0.85], "region": "front door panel"},
    "TEST-02_SCRATCH": {"gt_class": "scratch", "gt_bbox": [0.15, 0.25, 0.85, 0.75], "region": "side door panel"},
    "TEST-03_CRACK": {"gt_class": "crack", "gt_bbox": [0.20, 0.15, 0.90, 0.80], "region": "front windshield"},
    "TEST-04_LAMP_BROKEN": {"gt_class": "lamp broken", "gt_bbox": [0.15, 0.10, 0.85, 0.75], "region": "headlamp housing"},
    "TEST-05_GLASS_SHATTER": {"gt_class": "glass shatter", "gt_bbox": [0.10, 0.15, 0.90, 0.75], "region": "side window frame"},
    "TEST-06_TIRE_FLAT": {"gt_class": "tire flat", "gt_bbox": [0.10, 0.10, 0.85, 0.90], "region": "front tire rim"},
}

def compute_iou(box1, box2):
    if not box1 or not box2:
        return 0.0
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    if intersection <= 0.0:
        return 0.0
    area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
    area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])
    union = area1 + area2 - intersection
    return round(intersection / union, 4) if union > 0 else 0.0

async def main():
    report_data = {}

    print("============================================================")
    print("PHASE 1 & 2: MODEL DIRECT VERIFICATION")
    print("============================================================")

    model_path = BACKEND_DIR / "models_weights/vehicle_damage_yolov8.pt"
    print(f"Checkpoint Path: {model_path}")
    print(f"Checkpoint Exists: {model_path.exists()}")

    if not model_path.exists():
        print("MODEL LOAD = FAIL (Checkpoint file missing)")
        return

    try:
        yolo_model = YOLO(str(model_path))
        print("Model loaded successfully with Ultralytics YOLO.")
        print(f"Device: CPU (torch CUDA available: {torch.cuda.is_available()})")
        print(f"Class Names: {yolo_model.names}")
        print(f"Model Task/Type: {getattr(yolo_model, 'task', 'detect')}")
        print("MODEL LOAD = PASS")
        report_data["phase2"] = {
            "checkpoint": str(model_path),
            "exists": True,
            "loaded": True,
            "classes": yolo_model.names,
            "device": "cpu",
            "cuda_available": torch.cuda.is_available(),
            "status": "PASS"
        }
    except Exception as e:
        print(f"MODEL LOAD = FAIL ({e})")
        report_data["phase2"] = {"status": "FAIL", "error": str(e)}
        return

    print("\n============================================================")
    print("PHASE 4 & 5: DIRECT YOLO TEST AT conf=0.01 AND conf=0.25")
    print("============================================================")

    yolo_direct_results = {}

    for test_key, img_path in IMAGES.items():
        img = Image.open(img_path).convert("RGB")
        w, h = img.size
        gt = GROUND_TRUTH[test_key]

        # conf = 0.01
        res_001 = yolo_model(img, conf=0.01, verbose=False)
        dets_001 = []
        for r in res_001:
            if r.boxes is not None:
                for b in r.boxes:
                    cls_id = int(b.cls[0].item())
                    cls_name = yolo_model.names.get(cls_id, str(cls_id)).lower()
                    conf_val = float(b.conf[0].item())
                    xyxy = b.xyxy[0].tolist()
                    norm_bbox = [round(xyxy[0]/w, 4), round(xyxy[1]/h, 4), round(xyxy[2]/w, 4), round(xyxy[3]/h, 4)]
                    dets_001.append({
                        "cls_id": cls_id,
                        "cls_name": cls_name,
                        "confidence": round(conf_val, 4),
                        "bbox": norm_bbox
                    })

        # conf = 0.25 (Production threshold)
        res_025 = yolo_model(img, conf=0.25, verbose=False)
        dets_025 = []
        for r in res_025:
            if r.boxes is not None:
                for b in r.boxes:
                    cls_id = int(b.cls[0].item())
                    cls_name = yolo_model.names.get(cls_id, str(cls_id)).lower()
                    conf_val = float(b.conf[0].item())
                    xyxy = b.xyxy[0].tolist()
                    norm_bbox = [round(xyxy[0]/w, 4), round(xyxy[1]/h, 4), round(xyxy[2]/w, 4), round(xyxy[3]/h, 4)]
                    dets_025.append({
                        "cls_id": cls_id,
                        "cls_name": cls_name,
                        "confidence": round(conf_val, 4),
                        "bbox": norm_bbox
                    })

        yolo_direct_results[test_key] = {
            "image_size": [w, h],
            "gt": gt,
            "conf_0.01_dets": dets_001,
            "conf_0.25_dets": dets_025
        }

        print(f"\n--- {test_key} ---")
        print(f"Ground Truth: {gt['gt_class']} @ {gt['region']}")
        print(f"Direct YOLO (conf=0.01): {len(dets_001)} detection(s)")
        for d in dets_001:
            print(f"   -> id={d['cls_id']} name='{d['cls_name']}' conf={d['confidence']} bbox={d['bbox']}")
        print(f"Direct YOLO (conf=0.25): {len(dets_025)} detection(s)")
        for d in dets_025:
            print(f"   -> id={d['cls_id']} name='{d['cls_name']}' conf={d['confidence']} bbox={d['bbox']}")

    report_data["phase5"] = yolo_direct_results

    print("\n============================================================")
    print("PHASE 7: A.S.T.R.A. API / SERVICE TEST")
    print("============================================================")

    api_results = {}
    for test_key, img_path in IMAGES.items():
        with open(img_path, "rb") as f:
            img_bytes = f.read()

        # Service / Endpoint logic test
        serv_res = DamageService.analyze_image_bytes(img_bytes, confidence_threshold=0.25)
        api_results[test_key] = serv_res
        print(f"\n{test_key} API Service Output:")
        print(f"  Detected: {serv_res['detected']}")
        print(f"  Detections Count: {len(serv_res['detections'])}")
        for d in serv_res['detections']:
            print(f"   -> type='{d['damage_type']}' conf={d['confidence']} bbox={d['bbox']}")

    report_data["phase7"] = api_results

    print("\n============================================================")
    print("PHASE 8: DATABASE TEST")
    print("============================================================")

    db_results = {}
    async with AsyncSessionLocal() as db:
        # Get or create a test vehicle and user
        v_res = await db.execute(select(Vehicle).limit(1))
        test_vehicle = v_res.scalar_one_or_none()
        if not test_vehicle:
            print("No vehicle in DB, using fallback vehicle_id=1")
            v_id = 1
            u_id = 1
        else:
            v_id = test_vehicle.id
            u_id = test_vehicle.owner_user_id

        # Create a test inspection
        insp = await InspectionService.create_inspection(
            db=db,
            user_id=u_id,
            role="ADMIN",
            vehicle_id=v_id,
            stage="BEFORE"
        )
        print(f"Created Test VehicleInspection ID={insp.id}, Stage={insp.stage}")

        for test_key, img_path in IMAGES.items():
            if test_key == "CLEAN":
                view_name = "RIGHT"
            elif test_key == "TEST-01_DENT":
                view_name = "FRONT"
            elif test_key == "TEST-02_SCRATCH":
                view_name = "LEFT"
            elif test_key == "TEST-04_LAMP_BROKEN":
                view_name = "REAR"
            else:
                continue

            with open(img_path, "rb") as f:
                img_bytes = f.read()

            img_rec = await InspectionService.add_view_image(
                db=db,
                user_id=u_id,
                role="ADMIN",
                inspection_id=insp.id,
                view=view_name,
                image_bytes=img_bytes,
                filename=f"{test_key.lower()}.jpg"
            )

            # Query DB to verify persistence
            stmt = select(InspectionImage).where(InspectionImage.id == img_rec.id)
            res = await db.execute(stmt)
            fetched_img = res.scalar_one()

            dets_in_db = [
                {
                    "damage_type": d.damage_type,
                    "confidence": d.confidence,
                    "bbox": [d.x1, d.y1, d.x2, d.y2]
                }
                for d in fetched_img.detections
            ]

            # Check rule: class "none" must NEVER be stored
            has_none_class = any(d["damage_type"].lower() in ["none", "0"] for d in dets_in_db)

            db_results[test_key] = {
                "view": view_name,
                "inspection_image_id": img_rec.id,
                "db_detections_count": len(dets_in_db),
                "db_detections": dets_in_db,
                "has_none_class": has_none_class,
                "status": "PASS" if not has_none_class else "FAIL_CLASS_NONE_PERSISTED"
            }
            print(f"Uploaded {test_key} for view {view_name} -> DB Image ID={img_rec.id}, Detections Stored={len(dets_in_db)}, Class 'none' saved? {has_none_class}")

    report_data["phase8"] = db_results

    print("\n============================================================")
    print("PHASE 9: FOUR-VIEW WORKFLOW TEST")
    print("============================================================")

    four_view_insp_id = None
    async with AsyncSessionLocal() as db:
        v_res = await db.execute(select(Vehicle).limit(1))
        test_vehicle = v_res.scalar_one_or_none()
        v_id = test_vehicle.id if test_vehicle else 1
        u_id = test_vehicle.owner_user_id if test_vehicle else 1

        four_view_insp = await InspectionService.create_inspection(
            db=db, user_id=u_id, role="ADMIN", vehicle_id=v_id, stage="BEFORE"
        )
        four_view_insp_id = four_view_insp.id

        four_views_map = {
            "FRONT": IMAGES["TEST-01_DENT"],
            "LEFT": IMAGES["TEST-02_SCRATCH"],
            "RIGHT": IMAGES["CLEAN"],
            "REAR": IMAGES["TEST-04_LAMP_BROKEN"]
        }

        for view_name, img_path in four_views_map.items():
            with open(img_path, "rb") as f:
                img_bytes = f.read()
            await InspectionService.add_view_image(
                db=db, user_id=u_id, role="ADMIN", inspection_id=four_view_insp_id, view=view_name, image_bytes=img_bytes
            )

    # Reload in fresh session
    async with AsyncSessionLocal() as db:
        completed_insp = await InspectionService.get_inspection_by_id(db, four_view_insp_id)
        print(f"Four-View Inspection ID={completed_insp.id} Status: {completed_insp.status}")

        four_view_summary = {}
        for img in completed_insp.images:
            four_view_summary[img.view] = [d.damage_type for d in img.detections]
            print(f"   View {img.view}: {len(img.detections)} detection(s) -> {[d.damage_type for d in img.detections]}")

        report_data["phase9"] = {
            "inspection_id": completed_insp.id,
            "status": completed_insp.status,
            "views": four_view_summary
        }

    print("\n============================================================")
    print("PHASE 10: BEFORE / AFTER COMPARISON TEST")
    print("============================================================")

    insp_before_id = None
    insp_after_id = None

    async with AsyncSessionLocal() as db:
        v_res = await db.execute(select(Vehicle).limit(1))
        test_vehicle = v_res.scalar_one_or_none()
        v_id = test_vehicle.id if test_vehicle else 1
        u_id = test_vehicle.owner_user_id if test_vehicle else 1

        # BEFORE Inspection
        insp_before = await InspectionService.create_inspection(
            db=db, user_id=u_id, role="ADMIN", vehicle_id=v_id, stage="BEFORE"
        )
        insp_before_id = insp_before.id
        before_views = {
            "FRONT": IMAGES["TEST-01_DENT"],
            "LEFT": IMAGES["CLEAN"],
            "RIGHT": IMAGES["TEST-02_SCRATCH"],
            "REAR": IMAGES["CLEAN"]
        }
        for v, p in before_views.items():
            with open(p, "rb") as f:
                await InspectionService.add_view_image(db=db, user_id=u_id, role="ADMIN", inspection_id=insp_before_id, view=v, image_bytes=f.read())

        # AFTER Inspection
        insp_after = await InspectionService.create_inspection(
            db=db, user_id=u_id, role="ADMIN", vehicle_id=v_id, stage="AFTER"
        )
        insp_after_id = insp_after.id
        after_views = {
            "FRONT": IMAGES["TEST-01_DENT"],
            "LEFT": IMAGES["TEST-02_SCRATCH"],
            "RIGHT": IMAGES["TEST-02_SCRATCH"],
            "REAR": IMAGES["TEST-04_LAMP_BROKEN"]
        }
        for v, p in after_views.items():
            with open(p, "rb") as f:
                await InspectionService.add_view_image(db=db, user_id=u_id, role="ADMIN", inspection_id=insp_after_id, view=v, image_bytes=f.read())

    # Run comparison in fresh session
    async with AsyncSessionLocal() as db:
        cmp_res = await InspectionService.compare_before_after(
            db=db, before_inspection_id=insp_before_id, after_inspection_id=insp_after_id, user_id=1, role="ADMIN"
        )

        print("Comparison Summary:", cmp_res.get("summary"))
        for v_name, v_data in cmp_res.get("views", {}).items():
            print(f"View {v_name} status: {v_data.get('view_status')}, findings count: {len(v_data.get('findings', []))}")
            for f in v_data.get('findings', []):
                print(f"   -> [{f.get('status')}] damage_type='{f.get('damage_type')}' iou={f.get('iou')}")

        report_data["phase10"] = cmp_res

    # Save full JSON report
    with open(ARTIFACT_DIR / "validation_test_results.json", "w") as out_f:
        json.dump(report_data, out_f, indent=2)

    print("\nValidation pipeline execution complete! Results saved to validation_test_results.json.")

if __name__ == "__main__":
    asyncio.run(main())
