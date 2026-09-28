import logging
import math
from typing import Any, Dict, List, Optional
from app.config import settings

logger = logging.getLogger("astra.damage_comparison_service")


def compute_iou(box1: List[float], box2: List[float]) -> float:
    """
    Computes Intersection-over-Union (IoU) of two normalized bounding boxes [x1, y1, x2, y2].
    """
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    intersection_area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    if intersection_area <= 0.0:
        return 0.0

    box1_area = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
    box2_area = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])

    union_area = box1_area + box2_area - intersection_area
    if union_area <= 0.0:
        return 0.0

    return round(intersection_area / union_area, 4)


def box_area(box: List[float]) -> float:
    return max(0.0, box[2] - box[0]) * max(0.0, box[3] - box[1])


def centroid_distance(box1: List[float], box2: List[float]) -> float:
    cx1 = (box1[0] + box1[2]) / 2.0
    cy1 = (box1[1] + box1[3]) / 2.0
    cx2 = (box2[0] + box2[2]) / 2.0
    cy2 = (box2[1] + box2[3]) / 2.0
    return math.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2)


class DamageComparisonService:
    @staticmethod
    def compare_inspections(
        vehicle_id: int,
        before_inspection_id: int,
        after_inspection_id: int,
        before_views: Dict[str, Dict[str, Any]],
        after_views: Dict[str, Dict[str, Any]],
        parking_assignment_id: Optional[int] = None,
        iou_threshold: Optional[float] = None,
        worsening_threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        match_iou_thresh = iou_threshold if iou_threshold is not None else settings.DAMAGE_LOCATION_MATCH_THRESHOLD
        worsen_ratio_thresh = worsening_threshold if worsening_threshold is not None else settings.DAMAGE_WORSENING_THRESHOLD

        standard_views = ["FRONT", "LEFT", "RIGHT", "REAR"]
        view_results = {}
        all_findings = []

        pre_existing_count = 0
        new_damage_count = 0
        worsened_count = 0
        uncertain_count = 0

        for view_name in standard_views:
            before_data = before_views.get(view_name, {})
            after_data = after_views.get(view_name, {})

            before_dets = before_data.get("detections", [])
            after_dets = after_data.get("detections", [])

            before_img_url = before_data.get("image_url")
            after_img_url = after_data.get("image_url")

            matched_before_indices = set()
            view_findings = []

            for after_idx, after_det in enumerate(after_dets):
                a_bbox = after_det.get("bbox", [0, 0, 0, 0])
                a_conf = after_det.get("confidence", 0.0)
                a_type = after_det.get("damage_type", "damage")

                if a_conf < settings.DAMAGE_CONFIDENCE_THRESHOLD:
                    finding = {
                        "view": view_name,
                        "damage_type": a_type,
                        "status": "UNCERTAIN",
                        "reason": "Detection confidence is below high-confidence threshold",
                        "before_confidence": None,
                        "after_confidence": a_conf,
                        "before_bbox": None,
                        "after_bbox": a_bbox,
                    }
                    view_findings.append(finding)
                    uncertain_count += 1
                    continue

                best_match_idx = -1
                best_score = 0.0

                for b_idx, b_det in enumerate(before_dets):
                    b_bbox = b_det.get("bbox", [0, 0, 0, 0])
                    iou = compute_iou(a_bbox, b_bbox)
                    c_dist = centroid_distance(a_bbox, b_bbox)

                    # Match if IoU >= threshold or centroids are very close (< 0.25)
                    is_match = (iou >= match_iou_thresh) or (c_dist < 0.25 and iou > 0.05)
                    if is_match and (iou > best_score or best_match_idx == -1):
                        best_score = iou
                        best_match_idx = b_idx

                if best_match_idx >= 0:
                    matched_before_indices.add(best_match_idx)
                    b_det = before_dets[best_match_idx]
                    b_bbox = b_det.get("bbox", [0, 0, 0, 0])
                    b_conf = b_det.get("confidence", 0.0)

                    a_area = box_area(a_bbox)
                    b_area = box_area(b_bbox)

                    if b_area > 0 and (a_area / b_area) >= worsen_ratio_thresh:
                        status = "POSSIBLE_WORSENING"
                        worsened_count += 1
                    else:
                        status = "PRE_EXISTING"
                        pre_existing_count += 1

                    finding = {
                        "view": view_name,
                        "damage_type": a_type,
                        "status": status,
                        "iou": best_score,
                        "before_confidence": b_conf,
                        "after_confidence": a_conf,
                        "before_bbox": b_bbox,
                        "after_bbox": a_bbox,
                    }
                else:
                    status = "NEW_DAMAGE"
                    new_damage_count += 1
                    finding = {
                        "view": view_name,
                        "damage_type": a_type,
                        "status": status,
                        "iou": 0.0,
                        "before_confidence": None,
                        "after_confidence": a_conf,
                        "before_bbox": None,
                        "after_bbox": a_bbox,
                    }

                view_findings.append(finding)
                all_findings.append(finding)

            for b_idx, b_det in enumerate(before_dets):
                if b_idx not in matched_before_indices:
                    b_bbox = b_det.get("bbox", [0, 0, 0, 0])
                    b_conf = b_det.get("confidence", 0.0)
                    b_type = b_det.get("damage_type", "damage")

                    pre_existing_count += 1
                    finding = {
                        "view": view_name,
                        "damage_type": b_type,
                        "status": "PRE_EXISTING",
                        "iou": 0.0,
                        "before_confidence": b_conf,
                        "after_confidence": None,
                        "before_bbox": b_bbox,
                        "after_bbox": None,
                    }
                    view_findings.append(finding)

            has_new_or_worsened = any(f["status"] in ["NEW_DAMAGE", "POSSIBLE_WORSENING"] for f in view_findings)

            view_results[view_name] = {
                "before_image_url": before_img_url,
                "after_image_url": after_img_url,
                "findings": view_findings,
                "has_new_damage": has_new_or_worsened,
                "view_status": "NEW_DAMAGE_DETECTED" if has_new_or_worsened else ("PRE_EXISTING_ONLY" if view_findings else "NO_DAMAGE"),
            }

        new_damage_detected = (new_damage_count + worsened_count) > 0

        if new_damage_detected:
            summary_message = "Potential new damage detected after vehicle retrieval."
        elif pre_existing_count > 0:
            summary_message = "Pre-existing damage observed. No new damage detected."
        else:
            summary_message = "No meaningful damage detected across all vehicle views."

        return {
            "vehicle_id": vehicle_id,
            "parking_assignment_id": parking_assignment_id,
            "before_inspection_id": before_inspection_id,
            "after_inspection_id": after_inspection_id,
            "views": view_results,
            "findings": all_findings,
            "summary": {
                "new_damage_detected": new_damage_detected,
                "pre_existing_damage_count": pre_existing_count,
                "new_damage_count": new_damage_count,
                "possible_worsening_count": worsened_count,
                "uncertain_count": uncertain_count,
                "message": summary_message,
            },
        }
