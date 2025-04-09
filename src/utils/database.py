from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from typing import AsyncGenerator
from contextlib import asynccontextmanager

from src.utils.config import get_settings

settings = get_settings()

# Create async engine with proper SSL configuration for asyncpg
import os
import ssl

# Extract database URL
db_url = settings.DATABASE_URL

# Configure SSL for asyncpg correctly
connect_args = {}
if 'sslmode' in db_url or 'ssl=true' in db_url:
    # For production with SSL, use SSL context instead of sslmode
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args = {"ssl": ssl_context}
    
    # Remove sslmode or ssl=true from the URL as it's not compatible with asyncpg
    db_url = db_url.replace('?sslmode=require', '')
    db_url = db_url.replace('&sslmode=require', '')
    db_url = db_url.replace('?ssl=true', '')
    db_url = db_url.replace('&ssl=true', '')

# Create async engine with proper configuration
engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,  # Enable connection pool "pre-ping" feature
    connect_args=connect_args
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

class Base(DeclarativeBase):
    """Base class for all database models."""
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

@asynccontextmanager
async def get_db_session():
    """
    Context manager for getting a database session.
    
    This is different from get_db() which is a dependency for FastAPI.
    This function returns a context manager that can be used with 'async with'.
    
    Example:
        async with get_db_session() as session:
            result = await session.execute(query)
    """
    session = AsyncSessionLocal()
    try:
        yield session
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()

# Export all models
__all__ = ["Base", "engine", "get_db", "get_db_session"] 