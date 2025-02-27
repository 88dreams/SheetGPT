#!/usr/bin/env python3
"""
Script to set a user as an admin.

Usage:
    python -m src.scripts.set_admin <email>
"""

import asyncio
import sys
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import User
from src.utils.database import get_db_session

async def set_admin(email: str) -> None:
    """Set a user as an admin."""
    async with get_db_session() as session:
        session: AsyncSession
        
        # Update the user
        query = update(User).where(User.email == email).values(is_admin=True)
        result = await session.execute(query)
        
        if result.rowcount == 0:
            print(f"User with email {email} not found.")
            return
        
        await session.commit()
        print(f"User {email} has been set as an admin.")

def main() -> None:
    """Main function."""
    if len(sys.argv) != 2:
        print(f"Usage: python -m src.scripts.set_admin <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    asyncio.run(set_admin(email))

if __name__ == "__main__":
    main() 