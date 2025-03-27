# Alembic Database Migration Guide

## Overview

This document provides guidance on using Alembic for database migrations in the SheetGPT project, particularly when working with the sports database models that have circular dependencies.

## Problem

The sports database models in `src/models/sports_models.py` have circular dependencies that cause issues when running standard Alembic commands. This is because:

1. The `Team` class references the `Game` class through `home_games` and `away_games` relationships
2. The `Game` class references the `Team` class through `home_team` and `away_team` relationships
3. Several models use `entity_id` fields that cause SQLAlchemy type evaluation issues

## Solution

We've created a wrapper script (`alembic_wrapper.py`) that bypasses these issues by:

1. Mocking the sports models during Alembic operations
2. Handling the database URL conversion for local development
3. Providing a simple interface for common Alembic commands

## Using the Wrapper Script

### Basic Commands

```bash
# Check current revision
python src/scripts/alembic_wrapper.py current

# View migration history
python src/scripts/alembic_wrapper.py history

# Check available heads
python src/scripts/alembic_wrapper.py heads

# Upgrade to the latest revision
python src/scripts/alembic_wrapper.py upgrade

# Upgrade to a specific revision
python src/scripts/alembic_wrapper.py upgrade --revision f626a8bff0f1

# Downgrade one revision
python src/scripts/alembic_wrapper.py downgrade

# Create a new revision (without autogenerate)
python src/scripts/alembic_wrapper.py revision --message "Add new feature"

# Create a new revision with autogenerate
python src/scripts/alembic_wrapper.py revision --message "Add new feature" --autogenerate
```

### Docker Environment

When running in a Docker environment, the wrapper script automatically handles the database URL conversion, replacing `db:5432` with `localhost:5432` for local development.

## Troubleshooting

### Mismatched Revision IDs

If you encounter errors about missing revisions, you may need to fix the Alembic version in the database. Use the `fix_alembic_version.py` script:

```bash
python src/scripts/fix_alembic_version.py
```

### Database Connection Issues

If you're having trouble connecting to the database, check:

1. The database URL in your settings
2. That the PostgreSQL server is running
3. That the network connection to the database is working (especially important for Docker setups)

### Creating New Models

When creating new models:

1. Avoid circular dependencies when possible
2. Use string references for foreign keys when circular dependencies are unavoidable
3. Test migrations with the wrapper script before committing changes

## Best Practices

1. Always use the wrapper script for Alembic operations
2. Keep the Alembic migration history clean and linear
3. Document any manual changes to the database schema
4. Test migrations in a development environment before applying to production 