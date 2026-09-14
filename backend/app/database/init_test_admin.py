import asyncio
import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.role import Role
from app.models.user import User
from app.services.security import hash_password


async def ensure_test_admin():
    async with AsyncSessionLocal() as db:
        # Check ADMIN role
        r_res = await db.execute(select(Role).where(Role.name == "ADMIN"))
        admin_role = r_res.scalar_one_or_none()
        if not admin_role:
            print("ADMIN role not found in database!")
            return

        # Check existing test admin
        email = "astra_admin_test@astra.dev"
        u_res = await db.execute(select(User).where(User.email == email))
        user = u_res.scalar_one_or_none()

        if user:
            print(f"Test ADMIN account '{email}' already exists (ID #{user.id}, Role ID #{user.role_id}, Status: {getattr(user, 'status', 'ACTIVE')}).")
            user.password_hash = hash_password("Admin@2026")
            user.role_id = admin_role.id
            user.status = "ACTIVE"
            await db.commit()
            print(f"Verified & updated test ADMIN account '{email}'.")
        else:
            new_admin = User(
                full_name="ASTRA Admin Test",
                email=email,
                password_hash=hash_password("Admin@2026"),
                role_id=admin_role.id,
                status="ACTIVE",
            )
            db.add(new_admin)
            await db.commit()
            await db.refresh(new_admin)
            print(f"Successfully created test ADMIN account '{email}' (ID #{new_admin.id}).")


if __name__ == "__main__":
    asyncio.run(ensure_test_admin())
