#!/usr/bin/env python3
"""
Database initialization script.
This script creates all database tables and a test user.
"""

import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession

# Add the current directory to the path so we can import from src
sys.path.append(".")

from src.models.base import TimestampedBase
from src.models.models import User
from src.utils.database import engine, AsyncSessionLocal, Base
from src.utils.security import get_password_hash

async def init_db():
    """Initialize the database with tables and a test user."""
    print("Creating database tables...")
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("Tables created successfully.")
    
    # Create a test user
    async with AsyncSessionLocal() as session:
        session: AsyncSession
        
        # Check if test user already exists
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.email == "test@example.com"))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("Test user already exists.")
        else:
            print("Creating test user...")
            test_user = User(
                email="test@example.com",
                hashed_password=get_password_hash("password123"),
                is_active=True,
                is_superuser=False,
                is_admin=False
            )
            session.add(test_user)
            await session.commit()
            print("Test user created successfully.")
            print("Email: test@example.com")
            print("Password: password123")

if __name__ == "__main__":
    asyncio.run(init_db()) 