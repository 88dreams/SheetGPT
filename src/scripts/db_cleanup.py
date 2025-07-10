#!/usr/bin/env python
"""
Database Cleanup and Maintenance Tool

This script provides a comprehensive set of utilities for database maintenance:
- Identifying and removing duplicate records across various entity types
- Repairing missing or invalid entity relationships
- Standardizing entity names
- Adding constraints to prevent future duplicates
- Running database integrity checks
- Generating maintenance reports
"""

import asyncio
import argparse
import sys
import os
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional, Set
from uuid import UUID

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db_session

class DatabaseCleanupService:
    """Service for database cleanup and maintenance operations."""
    
    def __init__(self, db: AsyncSession, dry_run: bool = False):
        """
        Initialize the database cleanup service.
        
        Args:
            db: SQLAlchemy async session
            dry_run: If True, don't actually make changes, just report what would be done
        """
        self.db = db
        self.dry_run = dry_run
        self.stats = {
            "duplicates_found": {},
            "duplicates_removed": {},
            "relationships_repaired": {},
            "constraints_added": [],
            "errors": []
        }
    
    async def run_full_cleanup(self):
        """Run a complete cleanup process on all entity types."""
        print("\n=== Running Full Database Cleanup ===")
        print(f"Dry run mode: {self.dry_run}")
        
        # Always mark success as true by default, will be set to false if errors occur
        self.stats["success"] = True
        
        # Backup reminder
        print("\n⚠️  IMPORTANT: Ensure you have a recent backup before proceeding!")
        # When being called from an API, we assume automation and skip the prompt
        # by setting AUTOMATED_CLEANUP=1 in the environment or API context
        if not self.dry_run and not os.environ.get("AUTOMATED_CLEANUP") and not hasattr(self, 'api_call'):
            confirm = input("Do you want to continue with actual changes? (yes/no): ")
            if confirm.lower() not in ["yes", "y"]:
                print("Aborting cleanup.")
                # Return stats with skipped status for API to detect
                self.stats["skipped"] = True
                self.stats["success"] = False
                return self._convert_stats_to_serializable()
        
        start_time = time.time()
        
        # Step 1: Fix entity duplicates
        await self.fix_entity_duplicates()
        
        # Step 2: Fix relationship duplicates
        await self.fix_relationship_duplicates()
        
        # Step 3: Repair missing relationships
        await self.repair_missing_relationships()
        
        # Step 4: Standardize entity names
        await self.standardize_entity_names()
        
        # Step 5: Add/verify constraints
        await self.add_missing_constraints()
        
        # Step 6: Run database integrity checks
        await self.run_integrity_checks()
        
        # Generate and print summary report
        duration = time.time() - start_time
        self._print_summary_report(duration)
        
        # If there were errors, mark success as false
        if self.stats["errors"]:
            self.stats["success"] = False
            print(f"\n⚠️  Completed with {len(self.stats['errors'])} errors")
        else:
            print("\n✅ Completed successfully with no errors")
        
        # Make sure all stats are properly serializable
        return self._convert_stats_to_serializable()
        
    def _convert_stats_to_serializable(self) -> Dict[str, Any]:
        """Convert any non-serializable objects in stats to serializable types."""
        
        # Helper function to convert a single object
        def make_serializable(obj: Any) -> Any:
            if hasattr(obj, "_asdict"):  # For SQLAlchemy Row objects
                return {k: make_serializable(v) for k, v in obj._asdict().items()}
            elif hasattr(obj, "__dict__"):  # For custom objects
                return {k: make_serializable(v) for k, v in obj.__dict__.items() 
                        if not k.startswith("_")}
            elif isinstance(obj, (list, tuple)):
                return [make_serializable(item) for item in obj]
            elif isinstance(obj, dict):
                return {str(k): make_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, (datetime, UUID)):
                return str(obj)
            else:
                return obj
        
        # Convert all stats to serializable objects
        serializable_stats = make_serializable(self.stats)

        if isinstance(serializable_stats, dict):
            return serializable_stats
        
        # If serialization results in a non-dict, wrap it in a dict for consistency
        return {"error": "Failed to serialize stats to a dictionary.", "value": serializable_stats}
    
    async def fix_entity_duplicates(self):
        """Fix duplicates in core entity tables."""
        print("\n--- Fixing Duplicates in Entity Tables ---")
        
        # Define the entity tables and their unique fields
        entity_tables = [
            {
                "name": "leagues", 
                "display_name": "Leagues",
                "unique_fields": ["name"],
                "priority_field": "created_at"
            },
            {
                "name": "teams", 
                "display_name": "Teams",
                "unique_fields": ["name", "league_id"],
                "priority_field": "created_at"
            },
            {
                "name": "stadiums", 
                "display_name": "Stadiums",
                "unique_fields": ["name"],
                "priority_field": "created_at"
            },
            {
                "name": "divisions_conferences", 
                "display_name": "Divisions/Conferences",
                "unique_fields": ["name", "league_id"],
                "priority_field": "created_at"
            },
            {
                "name": "brands", 
                "display_name": "Brands",
                "unique_fields": ["name"],
                "priority_field": "created_at"
            },
            {
                "name": "players", 
                "display_name": "Players",
                "unique_fields": ["name", "team_id"],
                "priority_field": "created_at"
            }
        ]
        
        for entity in entity_tables:
            table_name = entity["name"]
            display_name = entity["display_name"]
            unique_fields = entity["unique_fields"]
            priority_field = entity.get("priority_field", "created_at")
            
            print(f"\nChecking for duplicates in {display_name}...")
            
            # Build the group by fields list
            group_by_fields = ", ".join(unique_fields)
            
            # Build the query for finding duplicates
            query = f"""
                SELECT {group_by_fields}, array_agg(id ORDER BY {priority_field}) as ids,
                       COUNT(*) as duplicate_count
                FROM {table_name}
                WHERE deleted_at IS NULL
                GROUP BY {group_by_fields}
                HAVING COUNT(*) > 1
            """
            
            # Find duplicates
            result = await self.db.execute(text(query))
            duplicates = result.fetchall()
            
            if not duplicates:
                print(f"✓ No duplicates found in {display_name}")
                continue
                
            duplicate_count = len(duplicates)
            total_dupes = sum(row[-1] for row in duplicates) - duplicate_count
            print(f"⚠️  Found {duplicate_count} groups with duplicates in {display_name} (total: {total_dupes} duplicate records)")
            
            # Store statistics
            self.stats["duplicates_found"][table_name] = total_dupes
            self.stats["duplicates_removed"][table_name] = 0
            
            if self.dry_run:
                # Just show some examples in dry run mode
                sample = duplicates[:3]
                print(f"  Sample of duplicates (showing up to 3 groups):")
                for dup in sample:
                    # Last two items are the id array and count
                    keys = dup[:-2]
                    ids = dup[-2]
                    print(f"  - Keys: {', '.join(f'{val}' for val in keys)}")
                    print(f"    IDs: {ids[0]} (keep), {', '.join(str(id) for id in ids[1:])} (remove)")
                    
                if len(duplicates) > 3:
                    print(f"  ... and {len(duplicates) - 3} more groups")
                
                continue
            
            # Process and fix duplicates
            fixed_count = 0
            for dup in duplicates:
                # Get the IDs to keep and delete
                ids = dup[-2]  # The second-to-last item is the array of IDs
                keep_id = ids[0]  # Keep the first ID (ordered by priority field)
                delete_ids = ids[1:]  # Delete the rest
                
                try:
                    # Update any dependencies to point to the ID we're keeping
                    await self._update_dependencies(table_name, keep_id, delete_ids)
                    
                    # Delete the duplicate records
                    for delete_id in delete_ids:
                        await self.db.execute(
                            text(f"DELETE FROM {table_name} WHERE id = :id"),
                            {"id": delete_id}
                        )
                    
                    fixed_count += len(delete_ids)
                except Exception as e:
                    error_msg = f"Error fixing duplicates in {table_name}: {str(e)}"
                    print(f"  ❌ {error_msg}")
                    self.stats["errors"].append(error_msg)
                    continue
            
            await self.db.commit()
            self.stats["duplicates_removed"][table_name] = fixed_count
            print(f"✓ Fixed {fixed_count} duplicate records in {display_name}")
    
    async def fix_relationship_duplicates(self):
        """Fix duplicates in relationship tables."""
        print("\n--- Fixing Duplicates in Relationship Tables ---")
        
        # Define the relationship tables and their unique fields
        relationship_tables = [
            {
                "name": "broadcast_rights", 
                "display_name": "Broadcast Rights",
                "unique_fields": ["entity_type", "entity_id", "broadcast_company_id", "COALESCE(division_conference_id, '00000000-0000-0000-0000-000000000000')"],
                "priority_field": "created_at"
            },
            {
                "name": "production_services", 
                "display_name": "Production Services",
                "unique_fields": ["entity_type", "entity_id", "production_company_id"],
                "priority_field": "created_at"
            },
            {
                "name": "brand_relationships", 
                "display_name": "Brand Relationships",
                "unique_fields": ["brand_id", "entity_type", "entity_id"],
                "priority_field": "created_at"
            },
            {
                "name": "game_broadcasts", 
                "display_name": "Game Broadcasts",
                "unique_fields": ["game_id", "broadcast_company_id"],
                "priority_field": "created_at"
            }
        ]
        
        for relation in relationship_tables:
            table_name = relation["name"]
            display_name = relation["display_name"]
            unique_fields = relation["unique_fields"]
            priority_field = relation.get("priority_field", "created_at")
            
            print(f"\nChecking for duplicates in {display_name}...")
            
            # Build the group by fields list
            group_by_fields = ", ".join(unique_fields)
            
            # Build the query for finding duplicates
            query = f"""
                SELECT {group_by_fields}, array_agg(id ORDER BY {priority_field}) as ids,
                       COUNT(*) as duplicate_count
                FROM {table_name}
                WHERE deleted_at IS NULL
                GROUP BY {group_by_fields}
                HAVING COUNT(*) > 1
            """
            
            # Find duplicates
            result = await self.db.execute(text(query))
            duplicates = result.fetchall()
            
            if not duplicates:
                print(f"✓ No duplicates found in {display_name}")
                continue
                
            duplicate_count = len(duplicates)
            total_dupes = sum(row[-1] for row in duplicates) - duplicate_count
            print(f"⚠️  Found {duplicate_count} groups with duplicates in {display_name} (total: {total_dupes} duplicate records)")
            
            # Store statistics
            self.stats["duplicates_found"][table_name] = total_dupes
            self.stats["duplicates_removed"][table_name] = 0
            
            if self.dry_run:
                # Just show some examples in dry run mode
                sample = duplicates[:3]
                print(f"  Sample of duplicates (showing up to 3 groups):")
                for dup in sample:
                    # Last two items are the id array and count
                    keys = dup[:-2]
                    ids = dup[-2]
                    print(f"  - Keys: {', '.join(f'{val}' for val in keys)}")
                    print(f"    IDs: {ids[0]} (keep), {', '.join(str(id) for id in ids[1:])} (remove)")
                    
                if len(duplicates) > 3:
                    print(f"  ... and {len(duplicates) - 3} more groups")
                
                continue
            
            # Process and fix duplicates
            fixed_count = 0
            for dup in duplicates:
                # Get the IDs to keep and delete
                ids = dup[-2]  # The second-to-last item is the array of IDs
                keep_id = ids[0]  # Keep the first ID (ordered by priority field)
                delete_ids = ids[1:]  # Delete the rest
                
                try:
                    # For relationships, we usually don't need to update dependencies
                    # Just delete the duplicates
                    for delete_id in delete_ids:
                        await self.db.execute(
                            text(f"DELETE FROM {table_name} WHERE id = :id"),
                            {"id": delete_id}
                        )
                    
                    fixed_count += len(delete_ids)
                except Exception as e:
                    error_msg = f"Error fixing duplicates in {table_name}: {str(e)}"
                    print(f"  ❌ {error_msg}")
                    self.stats["errors"].append(error_msg)
                    continue
            
            await self.db.commit()
            self.stats["duplicates_removed"][table_name] = fixed_count
            print(f"✓ Fixed {fixed_count} duplicate records in {display_name}")
    
    async def repair_missing_relationships(self):
        """Repair missing or invalid entity relationships."""
        print("\n--- Repairing Missing Entity Relationships ---")
        
        # Define relationship repairs to perform
        relationship_repairs = [
            {
                "name": "teams_missing_division",
                "display_name": "Teams Missing Division/Conference",
                "query": """
                    SELECT t.id, t.name, t.league_id, l.name as league_name
                    FROM teams t
                    JOIN leagues l ON t.league_id = l.id
                    LEFT JOIN divisions_conferences dc ON t.division_conference_id = dc.id
                    WHERE t.division_conference_id IS NULL
                    AND t.deleted_at IS NULL
                """
            },
            {
                "name": "broadcasts_missing_territory",
                "display_name": "Broadcast Rights Missing Territory",
                "query": """
                    SELECT id, entity_type, entity_id, broadcast_company_id
                    FROM broadcast_rights
                    WHERE territory IS NULL
                    AND deleted_at IS NULL
                """
            }
        ]
        
        for repair in relationship_repairs:
            repair_name = repair["name"]
            display_name = repair["display_name"]
            query = repair["query"]
            
            print(f"\nChecking for {display_name}...")
            
            # Find records needing repair
            result = await self.db.execute(text(query))
            records = result.fetchall()
            
            if not records:
                print(f"✓ No {display_name} found")
                continue
                
            record_count = len(records)
            print(f"⚠️  Found {record_count} {display_name}")
            
            # Store statistics
            self.stats["relationships_repaired"][repair_name] = 0
            
            if self.dry_run:
                # Just show some examples in dry run mode
                sample = records[:3]
                print(f"  Sample of records needing repair (showing up to 3):")
                for rec in sample:
                    if repair_name == "teams_missing_division":
                        print(f"  - Team: {rec.name} (League: {rec.league_name})")
                    elif repair_name == "broadcasts_missing_territory":
                        print(f"  - Broadcast Rights: {rec.id} (Entity Type: {rec.entity_type})")
                    
                if len(records) > 3:
                    print(f"  ... and {len(records) - 3} more records")
                
                continue
            
            # Process repairs based on the specific issue
            fixed_count = 0
            
            if repair_name == "teams_missing_division":
                # For each team without a division, try to assign the most appropriate one
                for team in records:
                    try:
                        # Find a suitable division/conference in the same league
                        div_result = await self.db.execute(text("""
                            SELECT id, name
                            FROM divisions_conferences
                            WHERE league_id = :league_id
                            AND deleted_at IS NULL
                            LIMIT 1
                        """), {"league_id": team.league_id})
                        
                        division = div_result.fetchone()
                        if division:
                            # Update the team with the found division
                            await self.db.execute(text("""
                                UPDATE teams
                                SET division_conference_id = :division_id
                                WHERE id = :team_id
                            """), {"division_id": division.id, "team_id": team.id})
                            
                            print(f"  ✓ Assigned team '{team.name}' to division '{division.name}'")
                            fixed_count += 1
                    except Exception as e:
                        error_msg = f"Error repairing team '{team.name}': {str(e)}"
                        print(f"  ❌ {error_msg}")
                        self.stats["errors"].append(error_msg)
                
            elif repair_name == "broadcasts_missing_territory":
                # Set default territory for broadcast rights missing it
                try:
                    result = await self.db.execute(text("""
                        UPDATE broadcast_rights
                        SET territory = 'National'
                        WHERE territory IS NULL
                        AND deleted_at IS NULL
                        RETURNING id
                    """))
                    
                    updated_ids = result.fetchall()
                    fixed_count = len(updated_ids)
                    print(f"  ✓ Set default territory 'National' for {fixed_count} broadcast rights")
                except Exception as e:
                    error_msg = f"Error setting default territories: {str(e)}"
                    print(f"  ❌ {error_msg}")
                    self.stats["errors"].append(error_msg)
            
            await self.db.commit()
            self.stats["relationships_repaired"][repair_name] = fixed_count
            print(f"✓ Repaired {fixed_count} of {record_count} {display_name}")
    
    async def standardize_entity_names(self):
        """Standardize entity names to maintain consistency."""
        print("\n--- Standardizing Entity Names ---")
        
        # Define name standardization rules
        name_standardizations = [
            {
                "name": "leagues_name_standardization",
                "display_name": "League Names",
                "table": "leagues",
                "rules": [
                    {"pattern": " League$", "replacement": ""},
                    {"pattern": "(^|\\s)NCAA(\\s|$)", "replacement": "\\1NCAA\\2"},
                    {"pattern": "(^|\\s)NFL(\\s|$)", "replacement": "\\1NFL\\2"}
                ]
            },
            {
                "name": "brands_name_standardization",
                "display_name": "Brand Names",
                "table": "brands",
                "rules": [
                    {"pattern": " \\(Brand\\)$", "replacement": ""},
                    {"pattern": "\\s+", "replacement": " "}  # Remove extra spaces
                ]
            }
        ]
        
        for standard in name_standardizations:
            table_name = standard["table"]
            display_name = standard["display_name"]
            rules = standard["rules"]
            
            print(f"\nStandardizing {display_name}...")
            
            # Process each standardization rule
            for i, rule in enumerate(rules):
                pattern = rule["pattern"]
                replacement = rule["replacement"]
                
                # Find records matching the pattern
                query = f"""
                    SELECT id, name
                    FROM {table_name}
                    WHERE name ~ :pattern
                    AND deleted_at IS NULL
                """
                
                result = await self.db.execute(text(query), {"pattern": pattern})
                records = result.fetchall()
                
                if not records:
                    print(f"  ✓ No {display_name} need standardization for rule {i+1}: {pattern} → {replacement}")
                    continue
                    
                record_count = len(records)
                print(f"  ⚠️  Found {record_count} {display_name} to standardize for rule {i+1}: {pattern} → {replacement}")
                
                if self.dry_run:
                    # Just show some examples in dry run mode
                    sample = records[:3]
                    print(f"    Sample of names to standardize (showing up to 3):")
                    for rec in sample:
                        new_name = self._apply_regex(rec.name, pattern, replacement)
                        print(f"    - '{rec.name}' → '{new_name}'")
                        
                    if len(records) > 3:
                        print(f"    ... and {len(records) - 3} more records")
                    
                    continue
                
                # Update records with standardized names
                fixed_count = 0
                for rec in records:
                    try:
                        new_name = self._apply_regex(rec.name, pattern, replacement)
                        
                        # Check if the new name would create a duplicate
                        check_result = await self.db.execute(text(f"""
                            SELECT id FROM {table_name}
                            WHERE name = :new_name
                            AND id != :id
                            AND deleted_at IS NULL
                        """), {"new_name": new_name, "id": rec.id})
                        
                        existing = check_result.fetchone()
                        if existing:
                            print(f"    ⚠️  Skipping '{rec.name}' → '{new_name}' as it would create a duplicate")
                            continue
                        
                        # Update the name
                        await self.db.execute(text(f"""
                            UPDATE {table_name}
                            SET name = :new_name
                            WHERE id = :id
                        """), {"new_name": new_name, "id": rec.id})
                        
                        print(f"    ✓ Updated '{rec.name}' → '{new_name}'")
                        fixed_count += 1
                    except Exception as e:
                        error_msg = f"Error standardizing name '{rec.name}': {str(e)}"
                        print(f"    ❌ {error_msg}")
                        self.stats["errors"].append(error_msg)
                
                await self.db.commit()
                
                # Update stats (accumulate counts for all rules)
                key = f"{table_name}_name_standardization"
                if key not in self.stats["relationships_repaired"]:
                    self.stats["relationships_repaired"][key] = 0
                self.stats["relationships_repaired"][key] += fixed_count
                
                print(f"  ✓ Standardized {fixed_count} of {record_count} {display_name} for rule {i+1}")
    
    async def add_missing_constraints(self):
        """Add constraints to prevent future duplicates."""
        print("\n--- Adding Missing Constraints ---")
        
        # Define constraints to add - limit to essential ones to reduce errors
        constraints = [
            {
                "table": "leagues",
                "name": "uq_leagues_name",
                "definition": "UNIQUE (LOWER(name)) WHERE deleted_at IS NULL"
            },
            {
                "table": "teams",
                "name": "uq_teams_name_league",
                "definition": "UNIQUE (LOWER(name), league_id) WHERE deleted_at IS NULL"
            },
            {
                "table": "brands",
                "name": "uq_brands_name",
                "definition": "UNIQUE (LOWER(name)) WHERE deleted_at IS NULL"
            }
            # Removed other constraints to simplify and reduce errors
        ]
        
        added_constraints = []
        skipped_constraints = []
        
        for constraint in constraints:
            table = constraint["table"]
            name = constraint["name"]
            definition = constraint["definition"]
            
            print(f"\nChecking for constraint {name} on {table}...")
            
            # Use a new transaction for each constraint to prevent cascading failures
            try:
                # Check if constraint already exists
                check_result = await self.db.execute(text("""
                    SELECT 1
                    FROM pg_constraint c
                    JOIN pg_class t ON c.conrelid = t.oid
                    JOIN pg_namespace n ON t.relnamespace = n.oid
                    WHERE n.nspname = 'public'
                    AND t.relname = :table
                    AND c.conname = :name
                """), {"table": table, "name": name})
                
                exists = check_result.fetchone() is not None
                
                if exists:
                    print(f"✓ Constraint {name} already exists on {table}")
                    skipped_constraints.append(name)
                    continue
                
                if self.dry_run:
                    print(f"✓ Would add constraint {name} on {table}: {definition}")
                    added_constraints.append(name)
                    continue
                
                # Make sure we have a clean transaction
                await self.db.commit()
                
                # Add the constraint
                await self.db.execute(text(f"""
                    ALTER TABLE {table}
                    ADD CONSTRAINT {name}
                    {definition}
                """))
                
                await self.db.commit()
                print(f"✓ Added constraint {name} on {table}")
                added_constraints.append(name)
                
            except Exception as e:
                error_msg = f"Error with constraint {name} on {table}: {str(e)}"
                print(f"❌ {error_msg}")
                self.stats["errors"].append(error_msg)
                
                # Make sure to rollback on error
                try:
                    await self.db.rollback()
                except Exception:
                    pass
        
        # Update stats
        self.stats["constraints_added"] = added_constraints
        
        # Even if there were constraint errors, the rest of cleanup can still be successful
        # Don't mark the entire cleanup as failed just because of constraint issues
        print("Constraints step completed with some constraints added and some skipped.")
    
    async def run_integrity_checks(self):
        """Run integrity checks on the database."""
        print("\n--- Running Database Integrity Checks ---")
        
        # Define integrity checks to run
        integrity_checks = [
            {
                "name": "orphaned_teams",
                "display_name": "Teams with invalid league references",
                "query": """
                    SELECT t.id, t.name
                    FROM teams t
                    LEFT JOIN leagues l ON t.league_id = l.id
                    WHERE t.deleted_at IS NULL
                    AND (l.id IS NULL OR l.deleted_at IS NOT NULL)
                """
            },
            {
                "name": "orphaned_broadcasts",
                "display_name": "Broadcast rights with invalid entity references",
                "query": """
                    SELECT br.id, br.entity_type, br.entity_id
                    FROM broadcast_rights br
                    WHERE br.deleted_at IS NULL
                    AND (
                        (br.entity_type = 'league' AND NOT EXISTS (
                            SELECT 1 FROM leagues l WHERE l.id = br.entity_id AND l.deleted_at IS NULL
                        ))
                        OR
                        (br.entity_type = 'team' AND NOT EXISTS (
                            SELECT 1 FROM teams t WHERE t.id = br.entity_id AND t.deleted_at IS NULL
                        ))
                        OR
                        (br.division_conference_id IS NOT NULL AND NOT EXISTS (
                            SELECT 1 FROM divisions_conferences dc 
                            WHERE dc.id = br.division_conference_id AND dc.deleted_at IS NULL
                        ))
                    )
                """
            },
            {
                "name": "invalid_dates",
                "display_name": "Records with invalid date ranges",
                "query": """
                    SELECT 'broadcast_rights' as table_name, id, start_date, end_date
                    FROM broadcast_rights
                    WHERE deleted_at IS NULL
                    AND start_date > end_date
                    
                    UNION ALL
                    
                    SELECT 'production_services' as table_name, id, start_date, end_date
                    FROM production_services
                    WHERE deleted_at IS NULL
                    AND start_date > end_date
                    
                    UNION ALL
                    
                    SELECT 'brand_relationships' as table_name, id, start_date, end_date
                    FROM brand_relationships
                    WHERE deleted_at IS NULL
                    AND start_date > end_date
                """
            }
        ]
        
        integrity_issues = {}
        
        for check in integrity_checks:
            check_name = check["name"]
            display_name = check["display_name"]
            query = check["query"]
            
            print(f"\nChecking for {display_name}...")
            
            # Run the check
            result = await self.db.execute(text(query))
            issues = result.fetchall()
            
            if not issues:
                print(f"✓ No {display_name} found")
                continue
                
            issue_count = len(issues)
            print(f"⚠️  Found {issue_count} {display_name}")
            
            # Store issues for reporting
            integrity_issues[check_name] = {
                "count": issue_count,
                "sample": issues[:5] if issue_count > 0 else []
            }
            
            # Show examples
            sample = issues[:3]
            print(f"  Sample of issues (showing up to 3):")
            for issue in sample:
                if check_name == "orphaned_teams":
                    print(f"  - Team: {issue.name} (ID: {issue.id}) has invalid league reference")
                elif check_name == "orphaned_broadcasts":
                    print(f"  - Broadcast: {issue.id} references invalid {issue.entity_type} (ID: {issue.entity_id})")
                elif check_name == "invalid_dates":
                    print(f"  - {issue.table_name}: {issue.id} has start_date ({issue.start_date}) > end_date ({issue.end_date})")
                
            if len(issues) > 3:
                print(f"  ... and {len(issues) - 3} more issues")
        
        # Add integrity issues to stats
        self.stats["integrity_issues"] = integrity_issues
    
    async def _update_dependencies(self, table_name: str, keep_id: str, delete_ids: List[str]):
        """Update dependencies to point to the ID we're keeping."""
        # Get the foreign key dependencies for this table
        result = await self.db.execute(text("""
            SELECT
                tc.table_schema as dependent_schema, 
                tc.table_name as dependent_table,
                kcu.column_name as dependent_column
            FROM
                information_schema.table_constraints as tc
                join information_schema.key_column_usage as kcu
                    on tc.constraint_schema = kcu.constraint_schema
                    and tc.constraint_name = kcu.constraint_name
                join information_schema.constraint_column_usage as ccu
                    on ccu.constraint_schema = tc.constraint_schema
                    and ccu.constraint_name = tc.constraint_name
            WHERE
                tc.constraint_type = 'FOREIGN KEY'
                and tc.table_schema = 'public'
                and ccu.table_schema = 'public'
                and ccu.table_name = :table_name
                and ccu.column_name = 'id'
        """), {"table_name": table_name})
        
        dependencies = result.fetchall()
        
        for dep in dependencies:
            dependent_table = dep.dependent_table
            dependent_column = dep.dependent_column
            
            # Update each dependency to point to the ID we're keeping
            for delete_id in delete_ids:
                await self.db.execute(text(f"""
                    UPDATE {dependent_table}
                    SET {dependent_column} = :keep_id
                    WHERE {dependent_column} = :delete_id
                """), {"keep_id": keep_id, "delete_id": delete_id})
    
    def _apply_regex(self, input_string: str, pattern: str, replacement: str) -> str:
        """Apply a regex replace to a string."""
        import re
        return re.sub(pattern, replacement, input_string)
    
    def _print_summary_report(self, duration: float):
        """Print a summary report of the cleanup operations."""
        print("\n=== Database Cleanup Summary ===")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Duration: {duration:.2f} seconds")
        print(f"Dry run mode: {self.dry_run}")
        
        print("\nDuplicates Found:")
        for table, count in self.stats["duplicates_found"].items():
            print(f"  - {table}: {count}")
        
        if not self.dry_run:
            print("\nDuplicates Removed:")
            for table, count in self.stats["duplicates_removed"].items():
                print(f"  - {table}: {count}")
            
            print("\nRelationships Repaired:")
            for repair, count in self.stats["relationships_repaired"].items():
                print(f"  - {repair}: {count}")
            
            print("\nConstraints Added:")
            for constraint in self.stats["constraints_added"]:
                print(f"  - {constraint}")
        
        if "integrity_issues" in self.stats:
            print("\nIntegrity Issues:")
            for check, data in self.stats["integrity_issues"].items():
                print(f"  - {check}: {data['count']}")
        
        if self.stats["errors"]:
            print("\nErrors:")
            for error in self.stats["errors"]:
                print(f"  - {error}")
        
        print(f"\n{'Simulated' if self.dry_run else 'Completed'} cleanup operations.")


async def run_cleanup(args):
    """Run the cleanup process."""
    async with get_db_session() as db:
        service = DatabaseCleanupService(db, dry_run=args.dry_run)
        await service.run_full_cleanup()


def main():
    parser = argparse.ArgumentParser(description="Database Cleanup and Maintenance Tool")
    parser.add_argument("--dry-run", action="store_true", help="Don't make actual changes, just report what would be done")
    
    args = parser.parse_args()
    
    # Run the cleanup
    asyncio.run(run_cleanup(args))


if __name__ == "__main__":
    main()