from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role
from app.models.user import User


class AdminService:
    @staticmethod
    async def list_users(db: AsyncSession) -> list[dict]:
        stmt = select(User, Role.name).join(Role, User.role_id == Role.id)
        res = await db.execute(stmt)
        users = []
        for user, role_name in res.all():
            users.append({
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "role": role_name,
                "status": getattr(user, "status", "ACTIVE"),
            })
        return users

    @staticmethod
    async def update_user_role(db: AsyncSession, target_user_id: int, new_role_name: str) -> dict:
        u_res = await db.execute(select(User).where(User.id == target_user_id))
        user = u_res.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user not found",
            )

        r_res = await db.execute(select(Role).where(Role.name == new_role_name.upper()))
        role = r_res.scalar_one_or_none()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role '{new_role_name}'",
            )

        user.role_id = role.id
        user.status = "ACTIVE"
        await db.commit()
        await db.refresh(user)

        return {
            "message": "User role updated and account activated successfully",
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "new_role": role.name,
            "status": user.status,
        }

    @staticmethod
    async def update_user_status(db: AsyncSession, target_user_id: int, new_status: str) -> dict:
        u_res = await db.execute(select(User).where(User.id == target_user_id))
        user = u_res.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user not found",
            )

        status_clean = new_status.strip().upper()
        if status_clean not in ["ACTIVE", "PENDING", "REJECTED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{new_status}'",
            )

        user.status = status_clean
        await db.commit()
        await db.refresh(user)

        # Notify target user if APPROVED or REJECTED
        if status_clean in ["ACTIVE", "REJECTED"]:
            from app.services.notification_service import NotificationService
            r_res = await db.execute(select(Role).where(Role.id == user.role_id))
            user_role = r_res.scalar_one_or_none()
            role_name = user_role.name if user_role else "account"

            if status_clean == "ACTIVE":
                notif_title = "Account Approved"
                notif_msg = f"Your {role_name} account has been approved. You can now log in."
            else:
                notif_title = "Registration Rejected"
                notif_msg = f"Your {role_name} registration was rejected by the administrator."

            await NotificationService.create_notification(
                db=db,
                user_id=user.id,
                title=notif_title,
                message=notif_msg,
                notification_type="IN_APP",
            )

        return {
            "message": f"User status updated to {status_clean} successfully",
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "status": user.status,
        }
