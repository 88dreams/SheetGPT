#!/usr/bin/env python3
"""
Script to create sports database tables.
"""

import asyncio
from src.models.sports_models import (
    League, Stadium, Team, Player, Game, BroadcastCompany, BroadcastRights,
    ProductionCompany, ProductionService, Brand, BrandRelationship,
    TeamRecord, TeamOwnership, LeagueExecutive, GameBroadcast
)
from src.utils.database import Base, engine

async def create_tables():
    """Create all sports database tables."""
    print("Creating sports database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Sports database tables created successfully.")

def main():
    """Main function."""
    asyncio.run(create_tables())

if __name__ == "__main__":
    main() 