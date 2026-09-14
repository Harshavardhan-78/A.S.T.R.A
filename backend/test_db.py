import asyncio
from sqlalchemy import text
from app.database.database import engine


async def check_db_connection():
    async with engine.connect() as connection:
        result = await connection.execute(text("SELECT 1"))
        print("Database response:", result.scalar())


if __name__ == "__main__":
    asyncio.run(check_db_connection())