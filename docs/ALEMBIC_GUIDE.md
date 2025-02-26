# Alembic Database Migration Guide

## Overview

This guide provides detailed instructions for using Alembic with the SheetGPT project, particularly when working with the sports database models that have circular dependencies.

## Problem Statement

The sports database models in `src/models/sports_models.py` have circular dependencies that cause issues when running standard Alembic commands:

1. The `Team` class references the `Game` class through `home_games` and `away_games` relationships
2. The `Game` class references the `Team` class through `home_team` and `away_team` relationships
3. Several models use `entity_id` fields that cause SQLAlchemy type evaluation issues

These circular dependencies cause errors like:

```
TypeError: Boolean value of this clause is not defined
```

## Solution

We've created a set of tools to handle these issues:

1. **Alembic Wrapper Script**: `src/scripts/alembic_wrapper.py` - Bypasses circular dependencies
2. **Database Version Checker**: `src/scripts/check_db_version.py` - Checks the current database state
3. **Version Fixer**: `src/scripts/fix_alembic_version.py` - Fixes mismatched revision IDs

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

If you encounter errors about missing revisions, you may need to fix the Alembic version in the database:

```bash
# Check the current database version
python src/scripts/check_db_version.py

# Fix the version if needed
python src/scripts/fix_alembic_version.py
```

### Database Connection Issues

If you're having trouble connecting to the database, check:

1. The database URL in your settings
2. That the PostgreSQL server is running
3. That the network connection to the database is working (especially important for Docker setups)

You can verify the connection with:

```bash
# Check database connection and tables
python src/scripts/check_db_version.py
```

### Creating New Models

When creating new models:

1. Avoid circular dependencies when possible
2. Use string references for foreign keys when circular dependencies are unavoidable:

```python
# Instead of this (which creates circular imports):
home_team_id: Mapped[UUID] = mapped_column(ForeignKey("teams.id"))

# Use this (string reference):
home_team_id: Mapped[UUID] = mapped_column(ForeignKey("teams.id", use_alter=True))
```

3. For relationships with circular dependencies, use string references:

```python
# Instead of this:
home_team: Mapped["Team"] = relationship(back_populates="home_games")

# Use this:
home_team: Mapped["Team"] = relationship("Team", back_populates="home_games")
```

4. Test migrations with the wrapper script before committing changes

## Best Practices

1. Always use the wrapper script for Alembic operations
2. Keep the Alembic migration history clean and linear
3. Document any manual changes to the database schema
4. Test migrations in a development environment before applying to production
5. When adding new models with circular dependencies, consider using SQLAlchemy Core for direct table creation
6. Use string references for foreign keys when circular dependencies are unavoidable
7. Keep the `alembic_version` table in sync with your migration scripts

## Technical Implementation

The wrapper script works by:

1. Mocking the sports models during Alembic operations:
```python
class MockSportsModels:
    def __getattr__(self, name):
        return None

sys.modules['src.models.sports_models'] = MockSportsModels()
```

2. Handling the database URL conversion for local development:
```python
if 'db:5432' in database_url:
    database_url = database_url.replace('db:5432', 'localhost:5432')
```

3. Providing a simple interface for common Alembic commands through a command-line interface

## Future Improvements

1. Refactor the sports models to reduce circular dependencies
2. Implement proper string references for foreign keys
3. Add support for more complex migration scenarios
4. Create a Docker-specific migration script for container environments 