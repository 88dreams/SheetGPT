import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.utils.database import get_db_session
from src.models.sports_models import League

async def fix_indycar():
    async with get_db_session() as session:
        # Find IndyCar league
        query = select(League).where(League.name == 'IndyCar')
        result = await session.execute(query)
        indycar = result.scalar_one_or_none()
        
        if indycar:
            print(f"Found IndyCar league ID: {indycar.id}")
            print(f"Current Sport: {indycar.sport}")
            print(f"Current Country: {indycar.country}")
            
            # Fix the sport field if it's incorrect 
            if indycar.sport == 'NBC Sports':
                print("Fixing incorrect sport value\!")
                indycar.sport = 'Motorsport'
                await session.commit()
                print("Updated IndyCar sport to 'Motorsport'")
        else:
            print("IndyCar league not found\!")

if __name__ == "__main__":
    asyncio.run(fix_indycar())
