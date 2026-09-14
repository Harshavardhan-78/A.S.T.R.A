import asyncio

from sqlalchemy import select

from app.database.database import AsyncSessionLocal
from app.models.role import Role


ROLES = [
    "ADMIN",
    "SECURITY",
    "RESIDENT",
    "VALET",
]


async def seed_roles():
    async with AsyncSessionLocal() as session:

        for role_name in ROLES:

            result = await session.execute(
                select(Role).where(Role.name == role_name)
            )

            existing_role = result.scalar_one_or_none()

            if existing_role is None:
                session.add(Role(name=role_name))
                print(f"Created role: {role_name}")
            else:
                print(f"Role already exists: {role_name}")

        await session.commit()

    print("Role seeding completed.")


if __name__ == "__main__":
    asyncio.run(seed_roles())