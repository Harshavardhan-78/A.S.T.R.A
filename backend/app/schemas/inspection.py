from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class DamageDetectionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    damage_type: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float
    created_at: datetime


class InspectionImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    inspection_id: int
    view: str
    media_id: int
    file_url: Optional[str] = None
    created_at: datetime
    detections: List[DamageDetectionSchema] = []

    @classmethod
    def from_orm_custom(cls, img_obj):
        file_url = img_obj.media.file_url if (hasattr(img_obj, "media") and img_obj.media) else None
        return cls(
            id=img_obj.id,
            inspection_id=img_obj.inspection_id,
            view=img_obj.view,
            media_id=img_obj.media_id,
            file_url=file_url,
            created_at=img_obj.created_at,
            detections=[DamageDetectionSchema.model_validate(d) for d in img_obj.detections],
        )


class VehicleInspectionCreate(BaseModel):
    vehicle_id: int
    stage: str  # "BEFORE" or "AFTER"
    parking_assignment_id: Optional[int] = None


class VehicleInspectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    parking_assignment_id: Optional[int] = None
    stage: str
    status: str
    created_by_user_id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    images: List[InspectionImageResponse] = []


class SingleImageAnalysisResponse(BaseModel):
    detected: bool
    detections: List[Dict[str, Any]]
    image_size: Optional[List[int]] = None
    device: Optional[str] = None
    error: Optional[str] = None


class ComparisonFindingSchema(BaseModel):
    view: str
    damage_type: str
    status: str  # "PRE_EXISTING", "NEW_DAMAGE", "POSSIBLE_WORSENING", "UNCERTAIN", "NO_CHANGE"
    iou: Optional[float] = None
    reason: Optional[str] = None
    before_confidence: Optional[float] = None
    after_confidence: Optional[float] = None
    before_bbox: Optional[List[float]] = None
    after_bbox: Optional[List[float]] = None


class ComparisonSummarySchema(BaseModel):
    new_damage_detected: bool
    pre_existing_damage_count: int
    new_damage_count: int
    possible_worsening_count: int
    uncertain_count: int
    message: str


class BeforeAfterComparisonResponse(BaseModel):
    vehicle_id: int
    parking_assignment_id: Optional[int] = None
    before_inspection_id: int
    after_inspection_id: int
    views: Dict[str, Any]
    findings: List[ComparisonFindingSchema]
    summary: ComparisonSummarySchema
