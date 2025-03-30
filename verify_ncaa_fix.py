#!/usr/bin/env python
"""
Verify NCAA Name Fix

This script verifies that the NCAA name fix was applied correctly.
"""

import asyncio
import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db_session

async def verify_ncaa_fix():
    """Verify that the NCAA name fix was applied correctly."""
    print("\n=== Verifying NCAA Name Fix ===")
    
    async with get_db_session() as db:
        # Check for any remaining records with $1NCAA$2
        query1 = """
            SELECT COUNT(*) as count FROM leagues 
            WHERE name LIKE '%$1NCAA$2%' 
            AND deleted_at IS NULL
        """
        
        result1 = await db.execute(text(query1))
        count1 = result1.scalar()
        
        print(f"Remaining records with $1NCAA$2: {count1}")
        
        # Check NCAA records to ensure they were fixed properly
        query2 = """
            SELECT id, name FROM leagues 
            WHERE name LIKE '%NCAA%' 
            AND deleted_at IS NULL
        """
        
        result2 = await db.execute(text(query2))
        records = result2.fetchall()
        
        print(f"\nTotal NCAA records found: {len(records)}")
        print("Sample of fixed NCAA records:")
        
        for i, record in enumerate(records[:5]):  # Show up to 5 records
            print(f"  - {record.name}")
            
        if len(records) > 5:
            print(f"  ... and {len(records) - 5} more")
        
        print("\n=== Verification Complete ===")
        
        return {
            "remaining_bad_records": count1,
            "total_ncaa_records": len(records)
        }

if __name__ == "__main__":
    asyncio.run(verify_ncaa_fix())