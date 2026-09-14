from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import require_roles
from app.database.dependencies import get_db
from app.services.admin_service import AdminService


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


class RoleUpdateRequest(BaseModel):
    role: str


class StatusUpdateRequest(BaseModel):
    status: str


@router.get("/users")
async def list_all_users(
    current_user=Depends(require_roles("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await AdminService.list_users(db)


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    request: RoleUpdateRequest,
    current_user=Depends(require_roles("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await AdminService.update_user_role(db, user_id, request.role)


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    request: StatusUpdateRequest,
    current_user=Depends(require_roles("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await AdminService.update_user_status(db, user_id, request.status)
