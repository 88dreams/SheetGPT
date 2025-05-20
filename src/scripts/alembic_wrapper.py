#!/usr/bin/env python
import os
import sys
import argparse
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Create mock sports models to prevent circular dependency issues
# class MockSportsModels:
# def __getattr__(self, name):
# return None

# Temporarily modify sys.modules to prevent sports_models from being imported
# sys.modules['src.models.sports_models'] = MockSportsModels()

# Import alembic components
from alembic.config import Config
from alembic import command
from src.utils.config import get_settings

def run_alembic_command(cmd, **kwargs):
    """Run an Alembic command with the correct database URL."""
    # Get database URL from settings
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    # For Docker environment, use the database URL as is
    print(f"Using database URL: {database_url}")
    
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
        elif cmd == 'merge':
            message = kwargs.get('message', '')
            revisions = kwargs.get('revisions', None)
            command.merge(alembic_cfg, message=message, revisions=revisions)
        elif cmd == 'stamp':
            revision = kwargs.get('revision', 'head')
            sql = kwargs.get('sql', False)
            tag = kwargs.get('tag', None)
            command.stamp(alembic_cfg, revision, sql=sql, tag=tag)
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
    parser.add_argument('command', help='Alembic command to run (current, history, heads, upgrade, downgrade, revision, merge, stamp)')
    parser.add_argument('--revision', help='Revision identifier for upgrade/downgrade/stamp commands')
    parser.add_argument('--message', help='Message for revision or merge command')
    parser.add_argument('--autogenerate', action='store_true', help='Autogenerate migrations')
    parser.add_argument('--revisions', nargs='+', help='Revisions to merge (for merge command)')
    parser.add_argument('--sql', action='store_true', help='Don\'t emit SQL to database (for stamp command)')
    parser.add_argument('--tag', help='Arbitrary tag name (for stamp command)')
    
    args = parser.parse_args()
    
    kwargs = {}
    if args.revision:
        kwargs['revision'] = args.revision
    if args.message:
        kwargs['message'] = args.message
    if args.autogenerate:
        kwargs['autogenerate'] = True
    if args.revisions:
        kwargs['revisions'] = args.revisions
    if args.sql:
        kwargs['sql'] = True
    if args.tag:
        kwargs['tag'] = args.tag
        
    run_alembic_command(args.command, **kwargs) 