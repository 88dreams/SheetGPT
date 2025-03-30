#!/usr/bin/env python
"""
Backup NCAA Records Before Fixing

This script creates a backup of the league records that need fixing.
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db_session

async def backup_ncaa_records():
    """Create a backup of NCAA records that need fixing."""
    print("\n=== Backing up NCAA records ===")
    
    backup_time = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"ncaa_records_backup_{backup_time}.json"
    
    async with get_db_session() as db:
        # Find affected records
        query = """
            SELECT id, name, sport, country, nickname, created_at, updated_at
            FROM leagues
            WHERE name LIKE '%$1NCAA$2%'
            AND deleted_at IS NULL
        """
        
        result = await db.execute(text(query))
        records = result.fetchall()
        
        if not records:
            print("No records to back up")
            return
        
        print(f"Found {len(records)} records to back up")
        
        # Convert records to serializable format
        backup_data = []
        for record in records:
            record_dict = {
                "id": str(record.id),
                "name": record.name,
                "sport": record.sport,
                "country": record.country,
                "nickname": record.nickname,
                "created_at": record.created_at.isoformat() if record.created_at else None,
                "updated_at": record.updated_at.isoformat() if record.updated_at else None
            }
            backup_data.append(record_dict)
            print(f"Backing up: ID={record.id}, Name={record.name}")
        
        # Save to file
        with open(backup_file, "w") as f:
            json.dump(backup_data, f, indent=2)
        
        print(f"\nBackup saved to {backup_file}")
        print(f"Total records backed up: {len(backup_data)}")

if __name__ == "__main__":
    asyncio.run(backup_ncaa_records())