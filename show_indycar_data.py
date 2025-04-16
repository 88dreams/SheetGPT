import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_
from src.utils.database import get_db_session
from src.models.sports_models import (
    League, Team, Player, BroadcastRights, Brand, 
    DivisionConference, Game, GameBroadcast,
    Stadium
)
import json
from datetime import datetime

# Helper to convert objects to serializable dictionaries
def obj_to_dict(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    
    # If it's a SQLAlchemy model, convert it to a dict
    if hasattr(obj, '__table__'):
        result = {}
        for column in obj.__table__.columns:
            value = getattr(obj, column.name)
            if isinstance(value, datetime):
                result[column.name] = value.isoformat()
            else:
                result[column.name] = value
        return result
    
    return str(obj)

async def get_indycar_data():
    async with get_db_session() as session:
        # Find IndyCar league
        league_query = select(League).where(League.name == 'IndyCar')
        result = await session.execute(league_query)
        indycar = result.scalar_one_or_none()
        
        if not indycar:
            print("IndyCar league not found\!")
            return
        
        indycar_id = indycar.id
        print(f"Found IndyCar league with ID: {indycar_id}")
        
        # Get all data associated with IndyCar
        data = {
            "league": obj_to_dict(indycar),
            "teams": [],
            "divisions": [],
            "broadcast_rights": [],
            "games": []
        }
        
        # Get teams in IndyCar
        teams_query = select(Team).where(Team.league_id == indycar_id)
        result = await session.execute(teams_query)
        teams = result.scalars().all()
        data["teams"] = [obj_to_dict(team) for team in teams]
        print(f"Found {len(data['teams'])} teams in IndyCar")
        
        # Get divisions/conferences
        div_query = select(DivisionConference).where(DivisionConference.league_id == indycar_id)
        result = await session.execute(div_query)
        divisions = result.scalars().all()
        data["divisions"] = [obj_to_dict(div) for div in divisions]
        print(f"Found {len(data['divisions'])} divisions/conferences in IndyCar")
        
        # Get broadcast rights
        broadcast_query = select(BroadcastRights).where(
            and_(
                BroadcastRights.entity_type == 'league',
                BroadcastRights.entity_id == indycar_id
            )
        )
        result = await session.execute(broadcast_query)
        broadcasts = result.scalars().all()
        broadcast_data = []
        
        for broadcast in broadcasts:
            broadcast_dict = obj_to_dict(broadcast)
            
            # Also look up the broadcast company name
            if broadcast.broadcast_company_id:
                company_query = select(Brand).where(Brand.id == broadcast.broadcast_company_id)
                company_result = await session.execute(company_query)
                company = company_result.scalar_one_or_none()
                if company:
                    broadcast_dict["broadcast_company_name"] = company.name
            
            broadcast_data.append(broadcast_dict)
            
        data["broadcast_rights"] = broadcast_data
        print(f"Found {len(data['broadcast_rights'])} broadcast rights for IndyCar")
        
        # Get games
        games_query = select(Game).where(Game.league_id == indycar_id)
        result = await session.execute(games_query)
        games = result.scalars().all()
        data["games"] = [obj_to_dict(game) for game in games]
        print(f"Found {len(data['games'])} games for IndyCar")
        
        # Print the full data structure
        print("\nFULL INDYCAR DATA:")
        print(json.dumps(data, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(get_indycar_data())
