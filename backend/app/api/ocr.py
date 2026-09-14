from fastapi import APIRouter, Depends, File, UploadFile, status

from app.api.dependencies import get_current_user
from app.services.ocr_service import OCRService


router = APIRouter(
    prefix="/ocr",
    tags=["OCR"],
)


@router.post("/document", status_code=status.HTTP_200_OK)
async def ocr_document(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    contents = await file.read()
    return await OCRService.extract_text_from_image(contents)
