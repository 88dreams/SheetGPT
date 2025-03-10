#!/usr/bin/env python
"""
Scheduled Database Backup Script

This script is designed to be run as a cron job to perform scheduled
database backups and maintenance:

1. Creates a database backup
2. Rotates old backups (keeps the 7 most recent by default)
3. Archives inactive conversations
4. Optionally purges very old archived conversations

Usage:
   python scheduled_backup.py [--max-backups COUNT] [--purge-days DAYS]
   
Example:
   # Keep 10 backups and purge archived conversations older than 90 days
   python scheduled_backup.py --max-backups 10 --purge-days 90
   
Crontab example (daily at 2 AM):
   0 2 * * * cd /path/to/sheetgpt && python src/scripts/scheduled_backup.py >> logs/backup.log 2>&1
"""

import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.utils.database import get_db_session
from src.services.database_management import DatabaseManagementService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs", "backup.log"))
    ]
)
logger = logging.getLogger("scheduled_backup")

async def run_backup(max_backups=7, purge_days=None, no_activity_days=30):
    """
    Run the scheduled backup process:
    1. Create a backup
    2. Rotate old backups
    3. Archive inactive conversations
    4. Optionally purge old archived conversations
    """
    logger.info("=== Starting scheduled backup process ===")
    
    async with get_db_session() as db:
        service = DatabaseManagementService(db)
        
        # 1. Create backup
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"scheduled_backup_{timestamp}.sql"
            backup_path = await service.backup_database(backup_name=backup_name)
            file_size = os.path.getsize(backup_path) / (1024 * 1024)
            logger.info(f"Created backup: {backup_path} ({file_size:.2f} MB)")
        except Exception as e:
            logger.error(f"Failed to create backup: {str(e)}")
            return
            
        # 2. Rotate old backups
        try:
            deleted_count = await service.rotate_backups(max_backups=max_backups)
            logger.info(f"Rotated backups: {deleted_count} old backups deleted")
        except Exception as e:
            logger.error(f"Failed to rotate backups: {str(e)}")
            
        # 3. Archive inactive conversations
        try:
            archived_count = await service.bulk_archive_conversations(
                no_activity_days=no_activity_days,
                exclude_with_data=True  # Don't archive conversations with structured data
            )
            logger.info(f"Archived {archived_count} inactive conversations")
        except Exception as e:
            logger.error(f"Failed to archive conversations: {str(e)}")
            
        # 4. Purge old archived conversations if requested
        if purge_days and purge_days > 0:
            try:
                purged_count = await service.permanently_delete_archived_conversations(
                    older_than_days=purge_days
                )
                logger.info(f"Purged {purged_count} old archived conversations")
            except Exception as e:
                logger.error(f"Failed to purge old archived conversations: {str(e)}")
                
        # 5. Log database statistics
        try:
            stats = await service.get_database_statistics()
            logger.info(f"Database statistics:")
            logger.info(f"- Users: {stats['user_count']}")
            logger.info(f"- Conversations: {stats['conversation_count']['total']} total, {stats['conversation_count']['active']} active, {stats['conversation_count']['archived']} archived")
            logger.info(f"- Messages: {stats['message_count']}")
            logger.info(f"- Structured data: {stats['structured_data_count']}")
            logger.info(f"- Storage: {stats['estimated_storage_mb']:.2f} MB")
        except Exception as e:
            logger.error(f"Failed to get database statistics: {str(e)}")
            
    logger.info("=== Scheduled backup process completed ===")


def main():
    parser = argparse.ArgumentParser(description="Run scheduled database backup and maintenance")
    parser.add_argument("--max-backups", type=int, default=7, help="Maximum number of backups to keep (default: 7)")
    parser.add_argument("--purge-days", type=int, help="Purge archived conversations older than X days (default: none)")
    parser.add_argument("--no-activity-days", type=int, default=30, help="Archive conversations with no activity for X days (default: 30)")
    
    args = parser.parse_args()
    
    # Create logs directory if it doesn't exist
    logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
    os.makedirs(logs_dir, exist_ok=True)
    
    # Run the backup process
    asyncio.run(run_backup(
        max_backups=args.max_backups,
        purge_days=args.purge_days,
        no_activity_days=args.no_activity_days
    ))


if __name__ == "__main__":
    main()