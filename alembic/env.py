import asyncio
from logging.config import fileConfig
import os
import sys
import ssl
from typing import Optional

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config, create_async_engine

from alembic import context

# Add the project root directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the SQLAlchemy declarative Base and models
from src.utils.database import Base
# from src.models.models import User, Conversation, Message, StructuredData, DataColumn, DataChangeHistory # Old import
from src.models import models # Ensures all models in models.py are loaded
from src.models.sports_models import * # Ensures all models in sports_models.py are loaded
from src.utils.config import get_settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Get settings from our application config
settings = get_settings()

# Build a database URL compatible with asyncpg (sslmode not accepted)
database_url = settings.DATABASE_URL
connect_args = {}

if database_url.startswith("postgresql+asyncpg") and "sslmode=require" in database_url:
    # Strip the parameter and provide SSL context explicitly
    database_url = database_url.replace("?sslmode=require", "").replace("&sslmode=require", "")

    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args = {"ssl": ssl_context}

print(f"Using Alembic database URL: {database_url}")

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

def include_object(object, name, type_, reflected, compare_to):
    """
    Exclude specific tables from Alembic's comparison.
    """
    if type_ == "table" and name == "system_metadata":
        return False
    return True

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Create the engine using settings from our application config
    connectable = create_async_engine(
        database_url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        include_object=include_object
    )

    with context.begin_transaction():
        context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online()) 