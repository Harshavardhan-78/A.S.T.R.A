import io
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from PIL import Image, ImageChops, ImageStat

from app.config import settings

logger = logging.getLogger("astra.damage_service")

# Resolve backend project root relative to this file
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


class DamageDetectorModel:
    _instance: Optional["DamageDetectorModel"] = None
    _model: Any = None
    _device: str = "cpu"
    _is_mock: bool = False

    @classmethod
    def get_instance(cls) -> "DamageDetectorModel":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_model_if_needed(self):
        if self._model is not None or self._is_mock:
            return

        try:
            import torch
            from ultralytics import YOLO

            requested_device = settings.DAMAGE_DEVICE.lower()
            if requested_device == "cuda" or (requested_device == "auto" and torch.cuda.is_available()):
                self._device = "cuda"
            else:
                self._device = "cpu"

            raw_path = Path(settings.DAMAGE_MODEL_PATH)
            if not raw_path.is_absolute():
                model_path = BACKEND_ROOT / raw_path
            else:
                model_path = raw_path

            if not model_path.exists():
                err_msg = (
                    f"Vehicle damage model checkpoint missing at: {model_path}. "
                    "Please download the fine-tuned checkpoint 'best_dts.pt' from "
                    "https://huggingface.co/shawnmichael/yolo-car-damage-detection and save to backend/models_weights/vehicle_damage_yolov8.pt"
                )
                logger.error(err_msg)
                raise FileNotFoundError(err_msg)

            logger.info(f"Loading vehicle damage YOLO model checkpoint from: {model_path}")
            self._model = YOLO(str(model_path))

            if hasattr(self._model, "to"):
                self._model.to(self._device)

            logger.info(f"Damage model device: {self._device}")
        except FileNotFoundError:
            raise
        except Exception as e:
            logger.warning(f"Failed to initialize DL model ({e}). Fallback to mock/stub inference.")
            self._is_mock = True
            self._device = "cpu"

    @property
    def device(self) -> str:
        return self._device

    @property
    def is_mock(self) -> bool:
        return self._is_mock

    def set_mock_mode(self, mock: bool):
        self._is_mock = mock
        if mock:
            self._model = None
            self._device = "cpu"

    def predict(self, image: Image.Image, confidence_threshold: Optional[float] = None) -> List[Dict[str, Any]]:
        self._load_model_if_needed()
        threshold = confidence_threshold if confidence_threshold is not None else settings.DAMAGE_CONFIDENCE_THRESHOLD

        if self._is_mock or self._model is None:
            return []

        try:
            results = self._model(image, conf=threshold, verbose=False)
            detections = []
            width, height = image.size

            for result in results:
                if result.boxes is None:
                    continue
                for box in result.boxes:
                    cls_id = int(box.cls[0].item()) if hasattr(box.cls, "__getitem__") else int(box.cls.item())
                    conf = float(box.conf[0].item()) if hasattr(box.conf, "__getitem__") else float(box.conf.item())
                    xyxy = box.xyxy[0].tolist() if hasattr(box.xyxy, "__getitem__") else box.xyxy.tolist()

                    # MANDATORY RULE 2: Class 0 ("none") must NOT be stored as a DamageDetection
                    if cls_id == 0:
                        continue

                    # Get class name from model names or default
                    if hasattr(self._model, "names") and cls_id in self._model.names:
                        damage_type = str(self._model.names[cls_id]).lower()
                    else:
                        damage_type = "scratch"

                    # Normalize bounding box coordinates to [0.0, 1.0] range
                    norm_x1 = max(0.0, min(1.0, round(xyxy[0] / width, 4)))
                    norm_y1 = max(0.0, min(1.0, round(xyxy[1] / height, 4)))
                    norm_x2 = max(0.0, min(1.0, round(xyxy[2] / width, 4)))
                    norm_y2 = max(0.0, min(1.0, round(xyxy[3] / height, 4)))

                    detections.append({
                        "damage_type": damage_type,
                        "confidence": round(conf, 4),
                        "bbox": [norm_x1, norm_y1, norm_x2, norm_y2],
                    })

            return detections
        except Exception as e:
            logger.error(f"Error during model prediction: {e}")
            return []


class DamageService:
    @staticmethod
    def get_detector() -> DamageDetectorModel:
        return DamageDetectorModel.get_instance()

    @staticmethod
    def analyze_image_bytes(
        image_bytes: bytes,
        confidence_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        if not image_bytes or len(image_bytes) == 0:
            return {
                "detected": False,
                "error": "Empty or invalid image data",
                "detections": []
            }

        if len(image_bytes) > 20 * 1024 * 1024:
            return {
                "detected": False,
                "error": "Image file size exceeds maximum limit of 20MB",
                "detections": []
            }

        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            logger.warning(f"Invalid image format: {e}")
            return {
                "detected": False,
                "error": "Corrupt or unsupported image format",
                "detections": []
            }

        detector = DamageService.get_detector()
        detections = detector.predict(image, confidence_threshold=confidence_threshold)

        return {
            "detected": len(detections) > 0,
            "detections": detections,
            "image_size": list(image.size),
            "device": detector.device,
        }

    @staticmethod
    async def analyze_vehicle_damage(
        entry_image_bytes: bytes, exit_image_bytes: bytes
    ) -> dict:
        try:
            img_entry = Image.open(io.BytesIO(entry_image_bytes)).convert("RGB")
            img_exit = Image.open(io.BytesIO(exit_image_bytes)).convert("RGB")

            target_size = (300, 300)
            img_entry = img_entry.resize(target_size)
            img_exit = img_exit.resize(target_size)

            diff = ImageChops.difference(img_entry, img_exit)
            stat = ImageStat.Stat(diff)
            mean_diff = sum(stat.mean) / len(stat.mean)

            if mean_diff < 15.0:
                result_label = "no obvious difference"
                confidence = 0.92
            else:
                result_label = "possible damage"
                confidence = round(min(0.95, mean_diff / 100.0), 2)

            return {
                "status": "success",
                "result": result_label,
                "difference_score": round(mean_diff, 2),
                "confidence": confidence,
                "message": f"Image comparison completed. Output: {result_label}",
            }
        except Exception as e:
            return {
                "status": "analysis_unavailable",
                "result": "analysis unavailable",
                "message": f"Unable to perform image comparison: {str(e)}",
            }
