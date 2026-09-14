import io
from PIL import Image, ImageChops, ImageStat


class DamageService:
    @staticmethod
    async def analyze_vehicle_damage(
        entry_image_bytes: bytes, exit_image_bytes: bytes
    ) -> dict:
        try:
            img_entry = Image.open(io.BytesIO(entry_image_bytes)).convert("RGB")
            img_exit = Image.open(io.BytesIO(exit_image_bytes)).convert("RGB")

            # Resize to match dimensions for comparison
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
