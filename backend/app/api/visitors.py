from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.dependencies import get_db
from app.schemas.visitor import (
    VisitorCreate,
    VisitorRequestCreate,
    VisitorRequestResponse,
    VisitorResponse,
)
from app.services.visitor_service import VisitorService


router = APIRouter(
    tags=["Visitors"],
)


# --------------------------------------------------
# VISITORS
# --------------------------------------------------

@router.post(
    "/visitors",
    response_model=VisitorResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_visitor(
    request: VisitorCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await VisitorService.create_visitor(db, request)


@router.get("/visitors", response_model=list[VisitorResponse])
async def list_visitors(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await VisitorService.list_visitors(db)


@router.get("/visitors/{visitor_id}", response_model=VisitorResponse)
async def get_visitor(
    visitor_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await VisitorService.get_visitor_by_id(db, visitor_id)


# --------------------------------------------------
# VISITOR REQUESTS
# --------------------------------------------------

@router.post(
    "/visitor-requests",
    response_model=VisitorRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/visitors/requests",
    response_model=VisitorRequestResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_visitor_request(
    request: VisitorRequestCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await VisitorService.create_visitor_request(db, user.id, request)


@router.get("/visitor-requests", response_model=list[VisitorRequestResponse])
async def list_visitor_requests(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await VisitorService.list_visitor_requests(db, user.id, role)


@router.get("/visitor-requests/{request_id}", response_model=VisitorRequestResponse)
async def get_visitor_request(
    request_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await VisitorService.get_visitor_request_by_id(
        db, request_id, user.id, role
    )


@router.post(
    "/visitor-requests/{request_id}/approve",
    response_model=VisitorRequestResponse,
)
async def approve_visitor_request(
    request_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await VisitorService.approve_visitor_request(
        db, request_id, user.id, role
    )


@router.post(
    "/visitor-requests/{request_id}/reject",
    response_model=VisitorRequestResponse,
)
async def reject_visitor_request(
    request_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, role = current_user
    return await VisitorService.reject_visitor_request(
        db, request_id, user.id, role
    )