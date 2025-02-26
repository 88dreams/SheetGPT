#!/usr/bin/env python
import os
import sys
import argparse
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Create mock sports models to prevent circular dependency issues
class MockSportsModels:
    def __getattr__(self, name):
        return None

# Temporarily modify sys.modules to prevent sports_models from being imported
sys.modules['src.models.sports_models'] = MockSportsModels()

# Import alembic components
from alembic.config import Config
from alembic import command
from src.utils.config import get_settings

def run_alembic_command(cmd, **kwargs):
    """Run an Alembic command with the correct database URL."""
    # Get database URL from settings
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    # Override with local database URL for direct execution
    if 'db:5432' in database_url:
        database_url = database_url.replace('db:5432', 'localhost:5432')
        print(f"Using local database URL: {database_url}")
    
    # Set environment variable for database URL
    os.environ['DATABASE_URL'] = database_url
    
    # Create Alembic config
    alembic_cfg = Config('alembic.ini')
    
    try:
        # Run the requested command
        print(f"Running Alembic command: {cmd}")
        
        if cmd == 'current':
            command.current(alembic_cfg, **kwargs)
        elif cmd == 'history':
            command.history(alembic_cfg, **kwargs)
        elif cmd == 'heads':
            command.heads(alembic_cfg, **kwargs)
        elif cmd == 'upgrade':
            revision = kwargs.get('revision', 'head')
            command.upgrade(alembic_cfg, revision)
        elif cmd == 'downgrade':
            revision = kwargs.get('revision', '-1')
            command.downgrade(alembic_cfg, revision)
        elif cmd == 'revision':
            message = kwargs.get('message', '')
            autogenerate = kwargs.get('autogenerate', False)
            command.revision(alembic_cfg, message=message, autogenerate=autogenerate)
        else:
            print(f"Unknown command: {cmd}")
            return
            
        print(f"Successfully ran Alembic command: {cmd}")
    except Exception as e:
        print(f"Error running Alembic command: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Alembic wrapper script')
    parser.add_argument('command', help='Alembic command to run (current, history, heads, upgrade, downgrade, revision)')
    parser.add_argument('--revision', help='Revision identifier for upgrade/downgrade commands')
    parser.add_argument('--message', help='Message for revision command')
    parser.add_argument('--autogenerate', action='store_true', help='Autogenerate migrations')
    
    args = parser.parse_args()
    
    kwargs = {}
    if args.revision:
        kwargs['revision'] = args.revision
    if args.message:
        kwargs['message'] = args.message
    if args.autogenerate:
        kwargs['autogenerate'] = True
        
    run_alembic_command(args.command, **kwargs) 