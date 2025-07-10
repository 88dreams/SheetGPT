#!/usr/bin/env python
"""
Database VACUUM and Maintenance Script

This script performs database optimization and maintenance:
- VACUUM ANALYZE to reclaim storage and update statistics
- REINDEX to rebuild indexes
- Database size statistics reporting
- Autovacuum configuration checking
"""

import asyncio
import argparse
import sys
import os
import time
from datetime import datetime
from typing import Dict, Any, List
from uuid import UUID

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db_session

class DatabaseVacuumService:
    """Service for database VACUUM and maintenance operations."""
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the database vacuum service.
        
        Args:
            db: SQLAlchemy async session
        """
        self.db = db
        self.stats = {
            "tables": {},
            "indexes": {},
            "total_size_before": 0,
            "total_size_after": 0,
            "vacuum_time": 0,
            "reindex_time": 0,
            "errors": []
        }
    
    async def run_full_vacuum(self, include_reindex: bool = True):
        """Run a complete VACUUM and optional REINDEX process."""
        print("\n=== Running Database VACUUM and Maintenance ===")
        
        # Get database size before vacuum
        before_size = await self._get_database_size()
        if before_size:
            self.stats["total_size_before"] = before_size.get("total_size", 0)
            print(f"Database size before maintenance: {before_size.get('size_pretty', 'N/A')}")
        else:
            self.stats["total_size_before"] = 0
            print("Could not determine database size before maintenance.")
        
        # Run table maintenance operations
        await self._print_table_stats()
        await self._check_bloat()
        
        # Run VACUUM
        vacuum_start = time.time()
        await self._vacuum_analyze()
        vacuum_duration = time.time() - vacuum_start
        self.stats["vacuum_time"] = vacuum_duration
        
        # Run REINDEX if requested
        if include_reindex:
            reindex_start = time.time()
            await self._reindex_database()
            reindex_duration = time.time() - reindex_start
            self.stats["reindex_time"] = reindex_duration
        
        # Get database size after vacuum
        after_size = await self._get_database_size()
        if after_size:
            self.stats["total_size_after"] = after_size.get("total_size", 0)
            print(f"Database size after maintenance: {after_size.get('size_pretty', 'N/A')}")
        else:
            self.stats["total_size_after"] = self.stats["total_size_before"] # Assume no change if size can't be fetched
            print("Could not determine database size after maintenance.")
        
        # Calculate space saved
        bytes_saved = self.stats["total_size_before"] - self.stats["total_size_after"]
        mb_saved = bytes_saved / (1024 * 1024)
        percent_saved = (bytes_saved / self.stats["total_size_before"]) * 100 if self.stats["total_size_before"] > 0 else 0
        print(f"Space reclaimed: {mb_saved:.2f} MB ({percent_saved:.1f}%)")
        
        # Report on autovacuum settings
        await self._check_autovacuum_settings()
        
        # Print summary report
        self._print_summary_report(include_reindex)
        
        # Make sure all stats are properly serializable
        return self._convert_stats_to_serializable()
        
    def _convert_stats_to_serializable(self):
        """Convert any non-serializable objects in stats to serializable types."""
        serializable_stats = {}
        
        # Helper function to convert a single object
        def make_serializable(obj):
            if hasattr(obj, "_asdict"):  # For SQLAlchemy Row objects
                return {k: make_serializable(v) for k, v in obj._asdict().items()}
            elif hasattr(obj, "__dict__"):  # For custom objects
                return {k: make_serializable(v) for k, v in obj.__dict__.items() 
                        if not k.startswith("_")}
            elif isinstance(obj, (list, tuple)):
                return [make_serializable(item) for item in obj]
            elif isinstance(obj, dict):
                return {k: make_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, (datetime, UUID)):
                return str(obj)
            else:
                return obj
        
        # Convert all stats to serializable objects
        serializable_stats = make_serializable(self.stats)
        
        return serializable_stats
    
    async def _get_database_size(self) -> Dict[str, Any]:
        """Get the total size of the database."""
        query = text("""
            SELECT 
                pg_database_size(current_database()) as total_size,
                pg_size_pretty(pg_database_size(current_database())) as size_pretty
        """)
        
        result = await self.db.execute(query)
        size_data = result.fetchone()
        
        return {
            "total_size": size_data.total_size if size_data else 0,
            "size_pretty": size_data.size_pretty if size_data else "N/A"
        }
    
    async def _print_table_stats(self):
        """Print statistics for each table in the database."""
        print("\n--- Table Statistics ---")
        
        # Get table statistics
        query = text("""
            SELECT
                relname as table_name,
                pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
                pg_size_pretty(pg_table_size(c.oid)) as table_size,
                pg_size_pretty(pg_indexes_size(c.oid)) as index_size,
                pg_total_relation_size(c.oid) as size_in_bytes,
                n_live_tup as row_count,
                n_dead_tup as dead_tuples,
                CASE WHEN n_live_tup > 0 
                     THEN round(100 * n_dead_tup / n_live_tup, 1)
                     ELSE 0 
                END as dead_tuple_pct
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_stat_user_tables t ON t.relname = c.relname
            WHERE c.relkind = 'r'
            AND n.nspname = 'public'
            ORDER BY pg_total_relation_size(c.oid) DESC;
        """)
        
        result = await self.db.execute(query)
        tables = result.fetchall()
        
        # Print table statistics
        print("Table Size Statistics (largest first):")
        for table in tables:
            print(f"  - {table.table_name}: {table.total_size} ({table.row_count} rows, {table.dead_tuple_pct}% dead)")
            
            # Store table stats
            self.stats["tables"][table.table_name] = {
                "total_size": table.size_in_bytes,
                "row_count": table.row_count,
                "dead_tuples": table.dead_tuples,
                "dead_tuple_pct": table.dead_tuple_pct
            }
        
        return tables
    
    async def _check_bloat(self):
        """Check for table bloat."""
        print("\n--- Table Bloat Check ---")
        
        # Query to check for bloated tables (tables with significant dead tuples)
        query = text("""
            SELECT
                relname as table_name,
                n_live_tup as row_count,
                n_dead_tup as dead_tuples,
                round(100 * n_dead_tup / GREATEST(n_live_tup, 1), 1) as dead_tuple_pct
            FROM pg_stat_user_tables
            WHERE n_dead_tup > 100  -- Only consider tables with at least 100 dead tuples
            AND round(100 * n_dead_tup / GREATEST(n_live_tup, 1), 1) > 10  -- More than 10% dead tuples
            ORDER BY dead_tuple_pct DESC;
        """)
        
        result = await self.db.execute(query)
        bloated_tables = result.fetchall()
        
        if not bloated_tables:
            print("✓ No significantly bloated tables found")
            return
        
        print("Tables with significant bloat (>10% dead tuples):")
        for table in bloated_tables:
            print(f"  - {table.table_name}: {table.dead_tuple_pct}% dead tuples ({table.dead_tuples} of {table.row_count} rows)")
    
    async def _vacuum_analyze(self):
        """Perform VACUUM ANALYZE on all tables."""
        print("\n--- Running VACUUM ANALYZE ---")
        
        try:
            # Full VACUUM ANALYZE
            print("Running full VACUUM ANALYZE (this may take a while)...")
            
            # We need to run this outside of a transaction, so we create a new connection
            # This is why we can't just use self.db
            await self.db.execute(text("VACUUM ANALYZE"))
            
            print("✓ VACUUM ANALYZE completed successfully")
        except Exception as e:
            error_msg = f"Error during VACUUM ANALYZE: {str(e)}"
            print(f"❌ {error_msg}")
            self.stats["errors"].append(error_msg)
            
            # Try individual table vacuum as a fallback
            print("Attempting VACUUM ANALYZE on individual tables...")
            
            query = text("""
                SELECT relname as table_name
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind = 'r'
                AND n.nspname = 'public';
            """)
            
            result = await self.db.execute(query)
            tables = result.fetchall()
            
            for table in tables:
                table_name = table.table_name
                try:
                    await self.db.execute(text(f"VACUUM ANALYZE {table_name}"))
                    print(f"  ✓ Vacuumed table: {table_name}")
                except Exception as e:
                    error_msg = f"Error vacuuming table {table_name}: {str(e)}"
                    print(f"  ❌ {error_msg}")
                    self.stats["errors"].append(error_msg)
    
    async def _reindex_database(self):
        """Reindex the database."""
        print("\n--- Running REINDEX ---")
        
        try:
            # Get index statistics before reindexing
            indexes_before = await self._get_index_stats()
            
            # Reindex the database
            print("Reindexing database (this may take a while and lock tables briefly)...")
            
            # We need to run this outside of a transaction, so we create a new connection
            # This is why we can't just use self.db
            await self.db.execute(text("REINDEX DATABASE current_database()"))
            
            # Get index statistics after reindexing
            indexes_after = await self._get_index_stats()
            
            # Store index statistics
            for idx_name, after_stats in indexes_after.items():
                if idx_name in indexes_before:
                    before_size = indexes_before[idx_name]["size_bytes"]
                    after_size = after_stats["size_bytes"]
                    size_diff = before_size - after_size
                    
                    self.stats["indexes"][idx_name] = {
                        "before_size": before_size,
                        "after_size": after_size,
                        "size_diff": size_diff,
                        "percent_change": (size_diff / before_size * 100) if before_size > 0 else 0
                    }
            
            print("✓ REINDEX completed successfully")
            
        except Exception as e:
            error_msg = f"Error during REINDEX: {str(e)}"
            print(f"❌ {error_msg}")
            self.stats["errors"].append(error_msg)
            
            # Try individual table reindex as a fallback
            print("Attempting REINDEX on individual tables...")
            
            query = text("""
                SELECT relname as table_name
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind = 'r'
                AND n.nspname = 'public';
            """)
            
            result = await self.db.execute(query)
            tables = result.fetchall()
            
            for table in tables:
                table_name = table.table_name
                try:
                    await self.db.execute(text(f"REINDEX TABLE {table_name}"))
                    print(f"  ✓ Reindexed table: {table_name}")
                except Exception as e:
                    error_msg = f"Error reindexing table {table_name}: {str(e)}"
                    print(f"  ❌ {error_msg}")
                    self.stats["errors"].append(error_msg)
    
    async def _get_index_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all indexes."""
        query = text("""
            SELECT
                i.relname as index_name,
                t.relname as table_name,
                pg_relation_size(i.oid) as size_bytes,
                pg_size_pretty(pg_relation_size(i.oid)) as size_pretty
            FROM pg_index x
            JOIN pg_class i ON i.oid = x.indexrelid
            JOIN pg_class t ON t.oid = x.indrelid
            JOIN pg_namespace n ON n.oid = i.relnamespace
            WHERE n.nspname = 'public';
        """)
        
        result = await self.db.execute(query)
        indexes = result.fetchall()
        
        index_stats = {}
        for idx in indexes:
            index_stats[idx.index_name] = {
                "table_name": idx.table_name,
                "size_bytes": idx.size_bytes,
                "size_pretty": idx.size_pretty
            }
        
        return index_stats
    
    async def _check_autovacuum_settings(self):
        """Check and report on autovacuum settings."""
        print("\n--- Autovacuum Settings ---")
        
        query = text("""
            SELECT name, setting, unit, short_desc
            FROM pg_settings
            WHERE name LIKE 'autovacuum%' OR name LIKE '%vacuum%'
            ORDER BY name;
        """)
        
        result = await self.db.execute(query)
        settings = result.fetchall()
        
        print("Current autovacuum settings:")
        for setting in settings:
            unit = f" {setting.unit}" if setting.unit else ""
            print(f"  - {setting.name}: {setting.setting}{unit}")
            
        # Get table-specific autovacuum settings
        query = text("""
            SELECT relname, reloptions
            FROM pg_class
            JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
            WHERE reloptions IS NOT NULL
            AND pg_namespace.nspname = 'public';
        """)
        
        result = await self.db.execute(query)
        table_settings = result.fetchall()
        
        if table_settings:
            print("\nTable-specific autovacuum settings:")
            for ts in table_settings:
                print(f"  - {ts.relname}: {ts.reloptions}")
    
    def _print_summary_report(self, include_reindex: bool):
        """Print a summary report of the maintenance operations."""
        print("\n=== Database Maintenance Summary ===")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Calculate storage metrics
        bytes_saved = self.stats["total_size_before"] - self.stats["total_size_after"]
        mb_saved = bytes_saved / (1024 * 1024)
        percent_saved = (bytes_saved / self.stats["total_size_before"]) * 100 if self.stats["total_size_before"] > 0 else 0
        
        print(f"Database Size Before: {self.stats['total_size_before'] / (1024 * 1024):.2f} MB")
        print(f"Database Size After: {self.stats['total_size_after'] / (1024 * 1024):.2f} MB")
        print(f"Space Reclaimed: {mb_saved:.2f} MB ({percent_saved:.1f}%)")
        
        print(f"\nVACUUM Time: {self.stats['vacuum_time']:.2f} seconds")
        if include_reindex:
            print(f"REINDEX Time: {self.stats['reindex_time']:.2f} seconds")
        
        # Most bloated tables before vacuum
        print("\nMost Bloated Tables Before Cleanup:")
        bloated_tables = sorted(
            [(name, stats) for name, stats in self.stats["tables"].items()],
            key=lambda x: x[1]["dead_tuple_pct"],
            reverse=True
        )
        
        for name, stats in bloated_tables[:5]:  # Show top 5
            if stats["dead_tuple_pct"] > 1:  # Only show if > 1% dead tuples
                print(f"  - {name}: {stats['dead_tuple_pct']}% dead tuples ({stats['dead_tuples']} of {stats['row_count']} rows)")
        
        if self.stats["errors"]:
            print("\nErrors:")
            for error in self.stats["errors"]:
                print(f"  - {error}")
        else:
            print("\n✓ No errors encountered during maintenance")


async def run_vacuum(args):
    """Run the VACUUM process."""
    async with get_db_session() as db:
        service = DatabaseVacuumService(db)
        await service.run_full_vacuum(include_reindex=not args.no_reindex)


def main():
    parser = argparse.ArgumentParser(description="Database VACUUM and Maintenance Tool")
    parser.add_argument("--no-reindex", action="store_true", help="Skip the REINDEX operation")
    
    args = parser.parse_args()
    
    # Run the vacuum
    asyncio.run(run_vacuum(args))


if __name__ == "__main__":
    main()