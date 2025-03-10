#!/usr/bin/env python
"""
Database Management CLI Tool

This script provides command-line utilities for managing the SheetGPT database:
- Archiving old conversations
- Cleaning up archived conversations
- Backing up the database
- Restoring from backups
- Viewing database statistics
"""

import asyncio
import argparse
import sys
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.utils.database import get_db_session
from src.services.database_management import DatabaseManagementService


async def archive_conversations(args):
    """Archive conversations based on specified criteria."""
    async with get_db_session() as db:
        service = DatabaseManagementService(db)
        
        # Convert user_id string to UUID if provided
        user_id = UUID(args.user_id) if args.user_id else None
        
        # Archive conversations
        count = await service.bulk_archive_conversations(
            user_id=user_id,
            older_than_days=args.older_than_days,
            no_activity_days=args.no_activity_days,
            exclude_with_data=not args.include_with_data
        )
        
        print(f"Archived {count} conversations.")


async def cleanup_archived(args):
    """Delete archived conversations that are older than specified days."""
    async with get_db_session() as db:
        service = DatabaseManagementService(db)
        
        # Convert user_id string to UUID if provided
        user_id = UUID(args.user_id) if args.user_id else None
        
        # Delete old archived conversations
        count = await service.permanently_delete_archived_conversations(
            older_than_days=args.days,
            user_id=user_id
        )
        
        print(f"Deleted {count} archived conversations.")


async def list_archived(args):
    """List archived conversations."""
    async with get_db_session() as db:
        service = DatabaseManagementService(db)
        
        # Convert user_id string to UUID if provided
        user_id = UUID(args.user_id) if args.user_id else None
        
        # Get archived conversations
        conversations = await service.get_archived_conversations(
            user_id=user_id,
            skip=args.skip,
            limit=args.limit
        )
        
        # Display conversations
        if not conversations:
            print("No archived conversations found.")
            return
            
        print(f"Found {len(conversations)} archived conversations:")
        for i, conv in enumerate(conversations, 1):
            archived_at = conv.meta_data.get("archived_at", "unknown")
            print(f"{i}. ID: {conv.id} | Title: {conv.title} | Archived: {archived_at}")


async def backup_database(args):
    """Backup the database to a file."""
    async with get_db_session() as db:
        service = DatabaseManagementService(db)
        
        try:
            backup_path = await service.backup_database(backup_name=args.name)
            print(f"Database backup created: {backup_path}")
            print(f"Size: {os.path.getsize(backup_path) / (1024 * 1024):.2f} MB")
        except Exception as e:
            print(f"Error creating backup: {str(e)}")
            sys.exit(1)


async def list_backups(args):
    """List all available database backups."""
    async with get_db_session() as db:
        service = DatabaseManagementService(db)
        
        backups = service.list_backups()
        
        if not backups:
            print("No backups found.")
            return
            
        print(f"Found {len(backups)} database backups:")
        for i, backup in enumerate(backups, 1):
            print(f"{i}. {backup['filename']} ({backup['size_mb']} MB)")
            print(f"   Created: {backup['created_at']}")
            print(f"   Path: {backup['path']}")
            print()


async def restore_database(args):
    """Restore the database from a backup file."""
    # Confirm restoration
    if not args.force:
        response = input("WARNING: This will overwrite the current database. Are you sure? (yes/no): ")
        if response.lower() not in ["yes", "y"]:
            print("Restore canceled.")
            return
    
    async with get_db_session() as db:
        service = DatabaseManagementService(db)
        
        try:
            success = await service.restore_database(args.backup_path)
            if success:
                print(f"Database successfully restored from: {args.backup_path}")
            else:
                print("Restore operation completed with warnings.")
        except Exception as e:
            print(f"Error restoring database: {str(e)}")
            sys.exit(1)


async def rotate_backups(args):
    """Rotate database backups, keeping only the most recent ones."""
    async with get_db_session() as db:
        service = DatabaseManagementService(db)
        
        count = await service.rotate_backups(max_backups=args.keep)
        print(f"Deleted {count} old backups.")


async def show_statistics(args):
    """Show database statistics."""
    async with get_db_session() as db:
        service = DatabaseManagementService(db)
        
        stats = await service.get_database_statistics()
        
        print("\n=== SheetGPT Database Statistics ===")
        print(f"Timestamp: {stats['timestamp']}")
        print("\nUsers:")
        print(f"  Total: {stats['user_count']}")
        
        print("\nConversations:")
        print(f"  Total: {stats['conversation_count']['total']}")
        print(f"  Active: {stats['conversation_count']['active']}")
        print(f"  Archived: {stats['conversation_count']['archived']}")
        
        print("\nMessages:")
        print(f"  Total: {stats['message_count']}")
        print(f"  Average per conversation: {stats['avg_messages_per_conversation']}")
        
        print("\nStructured Data:")
        print(f"  Total entries: {stats['structured_data_count']}")
        
        print("\nStorage:")
        print(f"  Estimated size: {stats['estimated_storage_mb']} MB")
        
        print("\nRecent Activity:")
        for period, count in stats["recent_activity"].items():
            print(f"  {period.replace('_', ' ')}: {count} conversations")


def main():
    parser = argparse.ArgumentParser(description="SheetGPT Database Management Tool")
    subparsers = parser.add_subparsers(help="Commands", dest="command")
    
    # Archive conversations command
    archive_parser = subparsers.add_parser("archive", help="Archive old conversations")
    archive_parser.add_argument("--user-id", help="Only archive conversations for this user ID")
    archive_parser.add_argument("--older-than-days", type=int, help="Archive conversations older than X days")
    archive_parser.add_argument("--no-activity-days", type=int, help="Archive conversations with no activity for X days")
    archive_parser.add_argument("--include-with-data", action="store_true", help="Include conversations with structured data")
    archive_parser.set_defaults(func=archive_conversations)
    
    # Cleanup archived conversations command
    cleanup_parser = subparsers.add_parser("cleanup", help="Delete old archived conversations")
    cleanup_parser.add_argument("days", type=int, help="Delete archived conversations older than X days")
    cleanup_parser.add_argument("--user-id", help="Only delete archived conversations for this user ID")
    cleanup_parser.set_defaults(func=cleanup_archived)
    
    # List archived conversations command
    list_archived_parser = subparsers.add_parser("list-archived", help="List archived conversations")
    list_archived_parser.add_argument("--user-id", help="Only list archived conversations for this user ID")
    list_archived_parser.add_argument("--skip", type=int, default=0, help="Skip the first N results")
    list_archived_parser.add_argument("--limit", type=int, default=100, help="Limit to N results")
    list_archived_parser.set_defaults(func=list_archived)
    
    # Database backup command
    backup_parser = subparsers.add_parser("backup", help="Create a database backup")
    backup_parser.add_argument("--name", help="Name for the backup file (default: timestamp-based)")
    backup_parser.set_defaults(func=backup_database)
    
    # List backups command
    list_backups_parser = subparsers.add_parser("list-backups", help="List available database backups")
    list_backups_parser.set_defaults(func=list_backups)
    
    # Restore database command
    restore_parser = subparsers.add_parser("restore", help="Restore database from backup")
    restore_parser.add_argument("backup_path", help="Path to the backup file to restore")
    restore_parser.add_argument("--force", action="store_true", help="Skip confirmation prompt")
    restore_parser.set_defaults(func=restore_database)
    
    # Rotate backups command
    rotate_parser = subparsers.add_parser("rotate-backups", help="Delete old backups, keeping only the most recent ones")
    rotate_parser.add_argument("--keep", type=int, default=10, help="Number of backups to keep (default: 10)")
    rotate_parser.set_defaults(func=rotate_backups)
    
    # Statistics command
    stats_parser = subparsers.add_parser("stats", help="Show database statistics")
    stats_parser.set_defaults(func=show_statistics)
    
    # Parse arguments
    args = parser.parse_args()
    
    # Show help if no command specified
    if not hasattr(args, "func"):
        parser.print_help()
        sys.exit(1)
    
    # Run the selected command
    asyncio.run(args.func(args))


if __name__ == "__main__":
    main()