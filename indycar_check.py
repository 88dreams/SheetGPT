import asyncio
from src.models.sports_models import League
from sqlalchemy.future import select
from src.utils.database import get_session

async def get_indycar():
    async with get_session() as session:
        query = select(League).where(League.name == 'IndyCar')
        result = await session.execute(query)
        league = result.scalar_one_or_none()
        if league:
            print("Found IndyCar league:")
            print(f"ID: {league.id}")
            print(f"Name: {league.name}")
            print(f"Sport: {league.sport}")
            print(f"Country: {league.country}")
            print(f"Created: {league.created_at}")
        else:
            print("IndyCar league not found")

asyncio.run(get_indycar())
