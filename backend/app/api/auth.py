import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.database.dependencies import get_db
from app.models.core import RevokedToken
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

security_bearer = HTTPBearer()


# --------------------------------------------------
# REGISTER
# --------------------------------------------------

@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    # Check whether email already exists
    result = await db.execute(
        select(User).where(User.email == request.email)
    )

    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    req_role = (request.role or "RESIDENT").strip().upper()
    valid_roles = ["RESIDENT", "SECURITY", "VALET", "ADMIN"]
    if req_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: '{request.role}'",
        )

    # 1. ADMIN registration requires valid Community Admin Authorization Code
    if req_role == "ADMIN":
        expected_code = os.getenv("ASTRA_ADMIN_REGISTRATION_CODE", "ASTRA_COMMUNITY_ADMIN_2026_SECRET")
        if not request.admin_code or request.admin_code.strip() != expected_code.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or missing Community Admin Authorization Code.",
            )

    # 2. Retrieve Role from DB
    role_res = await db.execute(
        select(Role).where(Role.name == req_role)
    )
    role = role_res.scalar_one_or_none()

    if role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role '{req_role}' not found in database",
        )

    # 3. Determine status: SECURITY & VALET start as PENDING awaiting Admin approval
    user_status = "PENDING" if req_role in ["SECURITY", "VALET"] else "ACTIVE"

    # Create user
    user = User(
        full_name=request.full_name,
        email=request.email,
        password_hash=hash_password(request.password),
        role_id=role.id,
        status=user_status,
    )

    db.add(user)

    await db.commit()
    await db.refresh(user)

    msg = "User registered successfully."
    if user_status == "PENDING":
        msg = f"Registration submitted! Your {req_role} account is pending Admin approval."

    return {
        "message": msg,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": role.name,
        "status": user.status,
    }


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@router.post(
    "/login",
    response_model=TokenResponse,
)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.email == request.email)
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(
        request.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check account status
    if getattr(user, "status", "ACTIVE") == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account registration is pending admin approval.",
        )

    # Load user's role
    result = await db.execute(
        select(Role).where(Role.id == user.role_id)
    )

    role = result.scalar_one()

    # Compare actual database role with selected role in login request
    if request.role and request.role.strip().upper() != role.name.strip().upper():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Selected role does not match this account.",
        )

    access_token = create_access_token(
        user_id=user.id,
        role=role.name,
    )

    refresh_token = create_refresh_token(
        user_id=user.id,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


# --------------------------------------------------
# REFRESH TOKEN
# --------------------------------------------------

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = decode_token(request.refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )

    # Check token revocation
    result = await db.execute(
        select(RevokedToken).where(RevokedToken.jti == jti)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token sub",
        )

    result = await db.execute(
        select(User).where(User.id == int(user_id))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    result = await db.execute(
        select(Role).where(Role.id == user.role_id)
    )
    role = result.scalar_one()

    new_access_token = create_access_token(user_id=user.id, role=role.name)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=request.refresh_token,
    )


# --------------------------------------------------
# LOGOUT
# --------------------------------------------------

@router.post("/logout")
async def logout(
    request: LogoutRequest | None = None,
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
):
    token = credentials.credentials
    try:
        payload = decode_token(token)
        jti = payload.get("jti")
        exp = payload.get("exp")

        if jti and exp:
            exp_datetime = datetime.fromtimestamp(exp, tz=timezone.utc)
            revoked_access = RevokedToken(
                jti=jti,
                token_type=payload.get("type", "access"),
                expires_at=exp_datetime,
            )
            db.add(revoked_access)
    except Exception:
        pass

    if request and request.refresh_token:
        try:
            r_payload = decode_token(request.refresh_token)
            r_jti = r_payload.get("jti")
            r_exp = r_payload.get("exp")
            if r_jti and r_exp:
                r_exp_datetime = datetime.fromtimestamp(r_exp, tz=timezone.utc)
                revoked_refresh = RevokedToken(
                    jti=r_jti,
                    token_type="refresh",
                    expires_at=r_exp_datetime,
                )
                db.add(revoked_refresh)
        except Exception:
            pass

    await db.commit()
    return {"message": "Successfully logged out"}


# --------------------------------------------------
# CURRENT USER
# --------------------------------------------------

@router.get("/me")
async def get_me(
    current_user=Depends(get_current_user),
):
    user, role = current_user

    return {
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": role,
    }


# --------------------------------------------------
# ADMIN-ONLY TEST ENDPOINT
# --------------------------------------------------

@router.get("/admin-test")
async def admin_test(
    current_user=Depends(require_roles("ADMIN")),
):
    user, role = current_user

    return {
        "message": "Admin access granted",
        "user_id": user.id,
        "role": role,
    }


# --------------------------------------------------
# SECURITY-ONLY TEST ENDPOINT
# --------------------------------------------------

@router.get("/security-test")
async def security_test(
    current_user=Depends(require_roles("SECURITY")),
):
    user, role = current_user

    return {
        "message": "Security access granted",
        "user_id": user.id,
        "role": role,
    }

