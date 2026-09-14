import asyncio

from app.database.base import Base
from app.database.database import engine

import app.models


async def create_tables():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    print("Database tables created successfully.")


if __name__ == "__main__":
    asyncio.run(create_tables())