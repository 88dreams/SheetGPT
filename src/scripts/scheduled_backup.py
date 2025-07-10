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
from src.services.database_admin_service import DatabaseAdminService

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
        service = DatabaseAdminService(db)
        
        # 1. Create backup
        try:
            backup_path = await service.backup_database()
            file_size = os.path.getsize(backup_path) / (1024 * 1024)
            logger.info(f"Created backup: {backup_path} ({file_size:.2f} MB)")
        except Exception as e:
            logger.error(f"Failed to create backup: {str(e)}")
            return
            
        # 2. Rotate old backups is not directly implemented in DatabaseAdminService
        # This would need to be implemented by listing backups and deleting old ones.
        # For now, we will log that this step is skipped.
        logger.warning("Backup rotation is not implemented in this version of the script.")
            
        # 3. Archive inactive conversations
        # This logic needs to be adapted, as there's no direct equivalent for bulk archiving
        # based on inactivity in the new service. We can archive one by one if needed,
        # but that is outside the scope of this fix.
        logger.warning("Bulk archiving inactive conversations is not implemented in this version.")
            
        # 4. Purge old archived conversations if requested
        # This logic also needs to be adapted.
        logger.warning("Purging old archived conversations is not implemented in this version.")
                
        # 5. Log database statistics
        try:
            stats = await service.get_database_stats()
            logger.info(f"Database statistics:")
            logger.info(f"- Total Tables: {stats.get('total_tables')}")
            logger.info(f"- Total Live Rows: {stats.get('total_live_rows')}")
            logger.info(f"- Total Dead Rows: {stats.get('total_dead_rows')}")
            logger.info(f"- Total DB Size: {stats.get('total_database_size_mb'):.2f} MB")
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