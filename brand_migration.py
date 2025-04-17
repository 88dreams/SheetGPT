#!/usr/bin/env python3
"""
Brand Migration Script for SheetGPT

This script performs a safe migration from separate broadcast_companies and 
production_companies tables to a unified brands table in PostgreSQL.

Usage:
    python brand_migration.py --host <host> --port <port> --dbname <dbname> --user <user> [--password <password>]

If password is not provided, it will be prompted securely.
"""

import argparse
import getpass
import sys
import time
from typing import Tuple, Dict, Any, List

import psycopg2
from psycopg2.extensions import connection
from psycopg2.extras import DictCursor


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Migrate to unified brands table')
    parser.add_argument('--host', required=True, help='Database host')
    parser.add_argument('--port', type=int, default=5432, help='Database port')
    parser.add_argument('--dbname', required=True, help='Database name')
    parser.add_argument('--user', required=True, help='Database user')
    parser.add_argument('--password', help='Database password (will prompt if not provided)')
    parser.add_argument('--dry-run', action='store_true', help='Perform dry run without changes')
    parser.add_argument('--skip-steps', type=str, help='Comma-separated list of steps to skip')
    parser.add_argument('--start-at-step', type=int, default=1, help='Start at specific step')
    
    return parser.parse_args()


def get_connection(args: argparse.Namespace) -> connection:
    """Create a database connection."""
    password = args.password
    if not password:
        password = getpass.getpass('Database password: ')
    
    try:
        conn = psycopg2.connect(
            host=args.host,
            port=args.port,
            dbname=args.dbname,
            user=args.user,
            password=password
        )
        conn.autocommit = False  # We'll manage transactions manually
        print("Connected to the database successfully!")
        return conn
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        sys.exit(1)


def execute_query(conn: connection, query: str, params: Tuple = None, 
                  fetch: bool = False, dry_run: bool = False) -> Any:
    """Execute a SQL query and optionally return results."""
    if dry_run and not query.lower().startswith(('select', 'show')):
        print(f"DRY RUN - Would execute: {query}")
        if params:
            print(f"With parameters: {params}")
        return None
    
    cursor = conn.cursor(cursor_factory=DictCursor)
    try:
        cursor.execute(query, params)
        if fetch:
            return cursor.fetchall()
        return cursor.rowcount
    except Exception as e:
        print(f"Error executing query: {e}")
        print(f"Query was: {query}")
        if params:
            print(f"Parameters: {params}")
        conn.rollback()
        raise
    finally:
        cursor.close()


def execute_step(conn: connection, dry_run: bool, step_num: int, description: str, 
                queries: List[Dict[str, Any]], skip_steps: List[int] = None) -> bool:
    """Execute a migration step with proper transaction handling."""
    if skip_steps and step_num in skip_steps:
        print(f"Skipping Step {step_num}: {description}")
        return True
    
    print(f"\n{'DRY RUN - ' if dry_run else ''}Step {step_num}: {description}")
    print("-" * 80)
    
    try:
        for query_dict in queries:
            query = query_dict["query"]
            params = query_dict.get("params")
            fetch = query_dict.get("fetch", False)
            description = query_dict.get("description", "Executing query")
            
            print(f"  {description}...")
            result = execute_query(conn, query, params, fetch, dry_run)
            
            if fetch:
                if isinstance(result, list) and len(result) > 0:
                    if len(result[0]) == 1:  # Single column result
                        print(f"  Result: {result[0][0]}")
                    else:
                        print(f"  Result: {result}")
                else:
                    print(f"  Result: {result}")
            elif result is not None:
                print(f"  Affected rows: {result}")
        
        if not dry_run:
            conn.commit()
            print(f"Step {step_num} completed successfully.")
        return True
    except Exception as e:
        print(f"Error in Step {step_num}: {e}")
        conn.rollback()
        return False


def migration_steps() -> List[Dict[str, Any]]:
    """Define all migration steps."""
    return [
        {
            "step_num": 1,
            "description": "Verify if there are any broadcasters that need to be migrated",
            "queries": [
                {
                    "description": "Count broadcasters that haven't been migrated to brands yet",
                    "query": """
                    SELECT COUNT(*)
                    FROM broadcast_companies bc
                    LEFT JOIN brands b ON bc.id = b.id
                    WHERE b.id IS NULL;
                    """,
                    "fetch": True
                }
            ]
        },
        {
            "step_num": 2,
            "description": "Migrate remaining broadcasters to brands table",
            "queries": [
                {
                    "description": "Insert broadcasters into brands table if they don't exist yet",
                    "query": """
                    INSERT INTO brands (id, name, industry, company_type, country, created_at, updated_at)
                    SELECT bc.id, bc.name, 'Media', 'Broadcaster', bc.country, bc.created_at, bc.updated_at
                    FROM broadcast_companies bc
                    LEFT JOIN brands b ON bc.id = b.id
                    WHERE b.id IS NULL;
                    """
                }
            ]
        },
        {
            "step_num": 3,
            "description": "Verify if there are any production companies that need to be migrated",
            "queries": [
                {
                    "description": "Count production companies that haven't been migrated to brands yet",
                    "query": """
                    SELECT COUNT(*)
                    FROM production_companies pc
                    LEFT JOIN brands b ON pc.id = b.id
                    WHERE b.id IS NULL;
                    """,
                    "fetch": True
                }
            ]
        },
        {
            "step_num": 4,
            "description": "Migrate remaining production companies to brands table",
            "queries": [
                {
                    "description": "Insert production companies into brands table if they don't exist yet",
                    "query": """
                    INSERT INTO brands (id, name, industry, company_type, created_at, updated_at)
                    SELECT pc.id, pc.name, 'Production', 'Production Company', pc.created_at, pc.updated_at
                    FROM production_companies pc
                    LEFT JOIN brands b ON pc.id = b.id
                    WHERE b.id IS NULL;
                    """
                }
            ]
        },
        {
            "step_num": 5,
            "description": "Update existing brands that are broadcasters but don't have company_type set",
            "queries": [
                {
                    "description": "Update brands that should be broadcasters but don't have company_type set",
                    "query": """
                    UPDATE brands
                    SET company_type = 'Broadcaster'
                    WHERE id IN (SELECT id FROM broadcast_companies)
                    AND (company_type IS NULL OR company_type = '');
                    """
                }
            ]
        },
        {
            "step_num": 6,
            "description": "Update existing brands that are production companies but don't have company_type set",
            "queries": [
                {
                    "description": "Update brands that should be production companies but don't have company_type set",
                    "query": """
                    UPDATE brands
                    SET company_type = 'Production Company'
                    WHERE id IN (SELECT id FROM production_companies)
                    AND (company_type IS NULL OR company_type = '');
                    """
                }
            ]
        },
        {
            "step_num": 7,
            "description": "Update foreign key constraints for broadcast_rights",
            "queries": [
                {
                    "description": "Create a temporary table to store broadcast_rights references",
                    "query": """
                    CREATE TEMP TABLE temp_broadcast_rights_refs AS
                    SELECT id, broadcast_company_id
                    FROM broadcast_rights
                    WHERE broadcast_company_id IS NOT NULL;
                    """
                },
                {
                    "description": "Drop the existing constraint",
                    "query": """
                    ALTER TABLE broadcast_rights
                    DROP CONSTRAINT IF EXISTS broadcast_rights_broadcast_company_id_fkey;
                    """
                },
                {
                    "description": "Add the new constraint to the brands table",
                    "query": """
                    ALTER TABLE broadcast_rights
                    ADD CONSTRAINT broadcast_rights_broadcast_company_id_fkey
                    FOREIGN KEY (broadcast_company_id) REFERENCES brands(id);
                    """
                }
            ]
        },
        {
            "step_num": 8,
            "description": "Update foreign key constraints for game_broadcasts (broadcast companies)",
            "queries": [
                {
                    "description": "Create a temporary table to store game_broadcasts references",
                    "query": """
                    CREATE TEMP TABLE temp_game_broadcasts_bc_refs AS
                    SELECT id, broadcast_company_id
                    FROM game_broadcasts
                    WHERE broadcast_company_id IS NOT NULL;
                    """
                },
                {
                    "description": "Drop the existing constraint",
                    "query": """
                    ALTER TABLE game_broadcasts
                    DROP CONSTRAINT IF EXISTS game_broadcasts_broadcast_company_id_fkey;
                    """
                },
                {
                    "description": "Add the new constraint to the brands table",
                    "query": """
                    ALTER TABLE game_broadcasts
                    ADD CONSTRAINT game_broadcasts_broadcast_company_id_fkey
                    FOREIGN KEY (broadcast_company_id) REFERENCES brands(id);
                    """
                }
            ]
        },
        {
            "step_num": 9,
            "description": "Update foreign key constraints for game_broadcasts (production companies)",
            "queries": [
                {
                    "description": "Add a new column for the new brand relationship",
                    "query": """
                    ALTER TABLE game_broadcasts ADD COLUMN IF NOT EXISTS production_brand_id UUID;
                    """
                },
                {
                    "description": "Update the new column with the existing production_company_id values",
                    "query": """
                    UPDATE game_broadcasts
                    SET production_brand_id = production_company_id
                    WHERE production_company_id IS NOT NULL;
                    """
                },
                {
                    "description": "Drop the existing constraint",
                    "query": """
                    ALTER TABLE game_broadcasts
                    DROP CONSTRAINT IF EXISTS game_broadcasts_production_company_id_fkey;
                    """
                },
                {
                    "description": "Add the new constraint to the brands table",
                    "query": """
                    ALTER TABLE game_broadcasts
                    ADD CONSTRAINT game_broadcasts_production_brand_id_fkey
                    FOREIGN KEY (production_brand_id) REFERENCES brands(id);
                    """
                }
            ]
        },
        {
            "step_num": 10,
            "description": "Update foreign key constraints for stadiums",
            "queries": [
                {
                    "description": "Create a temporary table to store stadiums references",
                    "query": """
                    CREATE TEMP TABLE temp_stadiums_refs AS
                    SELECT id, host_broadcaster_id
                    FROM stadiums
                    WHERE host_broadcaster_id IS NOT NULL;
                    """
                },
                {
                    "description": "Drop the existing constraint",
                    "query": """
                    ALTER TABLE stadiums
                    DROP CONSTRAINT IF EXISTS stadiums_host_broadcaster_id_fkey;
                    """
                },
                {
                    "description": "Add the new constraint to the brands table",
                    "query": """
                    ALTER TABLE stadiums
                    ADD CONSTRAINT stadiums_host_broadcaster_id_fkey
                    FOREIGN KEY (host_broadcaster_id) REFERENCES brands(id);
                    """
                }
            ]
        },
        {
            "step_num": 11,
            "description": "Verify the migration was successful",
            "queries": [
                {
                    "description": "Count brands with Broadcaster company_type",
                    "query": """
                    SELECT COUNT(*) FROM brands WHERE company_type = 'Broadcaster';
                    """,
                    "fetch": True
                },
                {
                    "description": "Count brands with Production Company company_type",
                    "query": """
                    SELECT COUNT(*) FROM brands WHERE company_type = 'Production Company';
                    """,
                    "fetch": True
                },
                {
                    "description": "Check for orphaned broadcast rights",
                    "query": """
                    SELECT COUNT(*)
                    FROM broadcast_rights br
                    LEFT JOIN brands b ON br.broadcast_company_id = b.id
                    WHERE br.broadcast_company_id IS NOT NULL AND b.id IS NULL;
                    """,
                    "fetch": True
                },
                {
                    "description": "Check for orphaned game broadcasts (broadcast companies)",
                    "query": """
                    SELECT COUNT(*)
                    FROM game_broadcasts gb
                    LEFT JOIN brands b ON gb.broadcast_company_id = b.id
                    WHERE gb.broadcast_company_id IS NOT NULL AND b.id IS NULL;
                    """,
                    "fetch": True
                },
                {
                    "description": "Check for orphaned game broadcasts (production companies)",
                    "query": """
                    SELECT COUNT(*)
                    FROM game_broadcasts gb
                    LEFT JOIN brands b ON gb.production_brand_id = b.id
                    WHERE gb.production_brand_id IS NOT NULL AND b.id IS NULL;
                    """,
                    "fetch": True
                },
                {
                    "description": "Check for orphaned stadiums",
                    "query": """
                    SELECT COUNT(*)
                    FROM stadiums s
                    LEFT JOIN brands b ON s.host_broadcaster_id = b.id
                    WHERE s.host_broadcaster_id IS NOT NULL AND b.id IS NULL;
                    """,
                    "fetch": True
                }
            ]
        },
        {
            "step_num": 12,
            "description": "Drop the legacy tables (only after verifying the migration worked)",
            "queries": [
                {
                    "description": "Drop broadcast_companies table",
                    "query": """
                    DROP TABLE IF EXISTS broadcast_companies;
                    """
                },
                {
                    "description": "Drop production_companies table",
                    "query": """
                    DROP TABLE IF EXISTS production_companies;
                    """
                }
            ]
        }
    ]


def run_migration(conn: connection, args: argparse.Namespace) -> None:
    """Run the full migration process."""
    dry_run = args.dry_run
    start_step = args.start_at_step
    
    if dry_run:
        print("\n*** DRY RUN MODE - No changes will be made ***\n")
    
    skip_steps = []
    if args.skip_steps:
        try:
            skip_steps = [int(s.strip()) for s in args.skip_steps.split(',')]
            print(f"Skipping steps: {skip_steps}")
        except ValueError:
            print(f"Invalid --skip-steps format: {args.skip_steps}. Expected comma-separated integers.")
            sys.exit(1)
    
    steps = migration_steps()
    steps = [step for step in steps if step["step_num"] >= start_step]
    
    print("\nBrand Migration Process")
    print("======================")
    print(f"Database: {args.dbname} on {args.host}:{args.port}")
    print(f"Starting at step: {start_step}")
    if skip_steps:
        print(f"Skipping steps: {skip_steps}")
    print("\nMigration Steps:")
    for step in steps:
        print(f"  {step['step_num']}. {step['description']}")
    
    if not dry_run:
        print("\nWARNING: This will modify your database. Make sure you have a backup!")
        response = input("Do you want to continue? (yes/no): ")
        if response.lower() not in ('yes', 'y'):
            print("Migration canceled.")
            sys.exit(0)
    
    print("\nStarting migration process...")
    time.sleep(1)  # Small pause to let the user read the message
    
    for step in steps:
        success = execute_step(
            conn=conn,
            dry_run=dry_run,
            step_num=step["step_num"],
            description=step["description"],
            queries=step["queries"],
            skip_steps=skip_steps
        )
        
        if not success:
            print(f"\nMigration failed at step {step['step_num']}. Rolling back changes.")
            conn.rollback()
            sys.exit(1)
        
        # Pause briefly between steps
        time.sleep(0.5)
    
    print("\nMigration completed successfully!")
    
    if dry_run:
        print("\nThis was a dry run. No changes were made to the database.")
        print("Run without --dry-run to apply the changes.")


def main():
    """Main entry point for the script."""
    args = parse_args()
    conn = get_connection(args)
    
    try:
        run_migration(conn, args)
    except KeyboardInterrupt:
        print("\nMigration interrupted. Rolling back any pending changes.")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()