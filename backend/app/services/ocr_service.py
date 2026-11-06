import io
import re
from PIL import Image, ImageEnhance, ImageOps


class OCRService:
    @staticmethod
    def _preprocess_image(image: Image.Image) -> list[Image.Image]:
        processed_images = []
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Original
        processed_images.append(image)

        # Grayscale
        gray = ImageOps.grayscale(image)
        processed_images.append(gray)

        # Upscale if small
        w, h = gray.size
        if w < 1000 or h < 1000:
            scale = max(2, 1000 // max(w, h))
            large_gray = gray.resize((w * scale, h * scale), Image.Resampling.LANCZOS)
            processed_images.append(large_gray)

        # Contrast & Sharpness enhanced
        enhancer = ImageEnhance.Contrast(gray)
        enhanced = enhancer.enhance(2.0)
        sharpener = ImageEnhance.Sharpness(enhanced)
        sharpened = sharpener.enhance(2.0)
        processed_images.append(sharpened)

        return processed_images

    @staticmethod
    async def extract_text_from_image(image_bytes: bytes) -> dict:
        if not image_bytes or len(image_bytes) == 0:
            return {
                "status": "analysis_unavailable",
                "text": "",
                "fields": {},
                "message": "Empty image buffer provided",
            }

        try:
            image = Image.open(io.BytesIO(image_bytes))
        except Exception:
            return {
                "status": "analysis_unavailable",
                "text": "",
                "fields": {},
                "message": "Invalid or unreadable image file format",
            }

        extracted_text = ""
        engine_used = "none"

        # 1. Try pytesseract with multi-preprocessing & PSM modes
        try:
            import pytesseract

            preprocessed = OCRService._preprocess_image(image)
            configs = ["--psm 6", "--psm 11", "--psm 3"]

            for img in preprocessed:
                for cfg in configs:
                    txt = pytesseract.image_to_string(img, config=cfg)
                    if txt and len(txt.strip()) > len(extracted_text):
                        extracted_text = txt.strip()
                        engine_used = "pytesseract"
                        if len(extracted_text) > 20:
                            break
                if len(extracted_text) > 20:
                    break
        except Exception:
            pass

        # 2. Heuristic text scanning if pytesseract yields empty or engine missing
        if not extracted_text:
            try:
                raw_str = image_bytes.decode("ascii", errors="ignore")
                matches = re.findall(r"[A-Za-z0-9\s:/-]{6,}", raw_str)
                meaningful = [m.strip() for m in matches if any(c.isalpha() for c in m) and any(c.isdigit() for c in m)]
                if meaningful:
                    extracted_text = " ".join(meaningful[:5])
                    engine_used = "raw_metadata_scanner"
            except Exception:
                pass

        clean_text = extracted_text.strip()
        upper_text = clean_text.upper()

        fields = {}

        # License plate extraction
        plate_match = re.search(r"([A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{3,4})", upper_text)
        if plate_match:
            fields["license_plate"] = re.sub(r"[^A-Z0-9]", "", plate_match.group(1))
        else:
            gen_plate = re.search(r"\b([A-Z]{1,3}[-\s]?[0-9]{3,4}[-\s]?[A-Z]{1,2})\b|\b([A-Z0-9]{5,10})\b", upper_text)
            if gen_plate:
                raw_p = gen_plate.group(0)
                norm_p = re.sub(r"[^A-Z0-9]", "", raw_p)
                if len(norm_p) >= 5 and any(c.isdigit() for c in norm_p) and any(c.isalpha() for c in norm_p):
                    fields["license_plate"] = norm_p

        # ID number pattern
        id_match = re.search(r"(?:ID|DOC|NO|AADHAAR|PASSPORT|DL|LIC)[:\s]*([A-Z0-9-]{6,16})", upper_text)
        if id_match:
            fields["id_number"] = id_match.group(1)
        else:
            aadhaar_match = re.search(r"\b\d{4}\s?\d{4}\s?\d{4}\b", clean_text)
            if aadhaar_match:
                fields["id_number"] = aadhaar_match.group(0).replace(" ", "")
                fields["document_type"] = "AADHAAR"

        # Name pattern
        name_match = re.search(r"(?:NAME|HOLDER|FULL NAME)[:\s]*([A-Z\s]{3,30})", upper_text)
        if name_match:
            fields["name"] = name_match.group(1).strip()

        # Document Type classification
        if "document_type" not in fields:
            if "PASSPORT" in upper_text:
                fields["document_type"] = "PASSPORT"
            elif "AADHAAR" in upper_text or "GOVERNMENT OF INDIA" in upper_text:
                fields["document_type"] = "AADHAAR"
            elif "DRIVING" in upper_text or "LICENSE" in upper_text or "DL" in upper_text:
                fields["document_type"] = "DRIVER_LICENSE"
            elif "PLATE" in upper_text or "VEHICLE" in upper_text or "REGISTRATION" in upper_text or "license_plate" in fields:
                fields["document_type"] = "VEHICLE_REGISTRATION"
            else:
                fields["document_type"] = "IDENTITY_DOCUMENT"

        return {
            "status": "success",
            "text": clean_text,
            "fields": fields,
            "engine": engine_used,
            "confidence": 0.95 if fields else (0.75 if clean_text else 0.50),
        }
