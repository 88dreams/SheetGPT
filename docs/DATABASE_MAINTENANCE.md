# Database Maintenance Guide

This guide covers recommended database maintenance procedures for SheetGPT. Regular maintenance helps ensure optimal performance, prevent data integrity issues, and eliminate duplicate data.

## Table of Contents

1. [Maintenance Tasks Overview](#maintenance-tasks-overview)
2. [Database Cleanup](#database-cleanup)
3. [Database Optimization](#database-optimization)
4. [Scheduled Maintenance](#scheduled-maintenance)
5. [Backup and Restore](#backup-and-restore)
6. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)

## Maintenance Tasks Overview

The SheetGPT database requires regular maintenance to:
- Eliminate duplicate records
- Repair invalid entity relationships
- Standardize entity names
- Add missing constraints
- Reclaim storage space
- Rebuild indexes
- Update database statistics

These tasks help ensure data integrity, optimal query performance, and efficient storage usage.

## Database Cleanup

The `db_cleanup.py` script provides comprehensive database cleanup operations:

```bash
# Recommended: Run in dry-run mode first to see what would be changed
python src/scripts/db_cleanup.py --dry-run

# When you're ready to make actual changes
python src/scripts/db_cleanup.py
```

### What `db_cleanup.py` Does

1. **Deduplicates Entity Tables**
   - Leagues
   - Teams
   - Stadiums
   - Divisions/Conferences
   - Brands
   - Players
   
2. **Deduplicates Relationship Tables**
   - Broadcast Rights
   - Production Services
   - Brand Relationships
   - Game Broadcasts

3. **Repairs Entity Relationships**
   - Teams missing Division/Conference assignments
   - Broadcast Rights missing territory information
   
4. **Standardizes Entity Names**
   - Removes redundant suffixes
   - Standardizes abbreviation formats
   - Eliminates extra spaces
   
5. **Adds Missing Constraints**
   - Unique constraints to prevent future duplicates
   - Case-insensitive constraints where appropriate
   - Handles NULL values in unique constraints

6. **Performs Integrity Checks**
   - Orphaned team references
   - Invalid broadcast entity references
   - Invalid date ranges

### Running the Cleanup

Always follow these steps when running database cleanup:

1. **Backup your database first**
   ```bash
   python src/scripts/db_management.py backup
   ```

2. **Run in dry-run mode**
   ```bash
   python src/scripts/db_cleanup.py --dry-run
   ```
   
3. **Review the output carefully**
   - Check which duplicates would be removed
   - Verify which constraints would be added
   - Note any potential issues

4. **Run with actual changes**
   ```bash
   python src/scripts/db_cleanup.py
   ```

5. **Verify the results**
   - Check the summary report
   - Verify entity counts in the database
   - Test application functionality

## Database Optimization

The `db_vacuum.py` script performs database optimization tasks:

```bash
# Run full optimization (VACUUM ANALYZE + REINDEX)
python src/scripts/db_vacuum.py

# Run without reindexing (useful for large databases)
python src/scripts/db_vacuum.py --no-reindex
```

### What `db_vacuum.py` Does

1. **Reports Database Size and Table Statistics**
   - Shows table sizes
   - Reports row counts and dead tuple percentages
   - Identifies table bloat

2. **Runs VACUUM ANALYZE**
   - Reclaims storage space from dead tuples
   - Updates statistics for query planning
   - Improves query performance

3. **Optionally Rebuilds Indexes (REINDEX)**
   - Removes bloat from indexes
   - Optimizes index structure
   - Reports space savings

4. **Reports Autovacuum Settings**
   - Shows current PostgreSQL autovacuum configuration
   - Displays table-specific autovacuum settings

5. **Provides Summary Report**
   - Space reclaimed
   - Before/after database size
   - Most bloated tables
   - Operation duration

### When to Run Optimization

- After large bulk operations
- When queries become slow
- After deleting substantial amounts of data
- When the database size has grown significantly
- When table bloat exceeds 20%
- Monthly as part of regular maintenance

## Scheduled Maintenance

We recommend setting up scheduled maintenance tasks:

### Weekly Tasks

- Run database backup
  ```bash
  python src/scripts/db_management.py backup
  ```

- Run database statistics
  ```bash
  python src/scripts/db_management.py stats
  ```

### Monthly Tasks

- Run database cleanup
  ```bash
  python src/scripts/db_cleanup.py
  ```

- Run database optimization
  ```bash
  python src/scripts/db_vacuum.py
  ```

- Archive old conversations
  ```bash
  python src/scripts/db_management.py archive --older-than=90d
  ```

- Rotate old backups
  ```bash
  python src/scripts/db_management.py rotate-backups --keep=10
  ```

### Automation

You can automate these tasks using cron jobs or system schedulers:

```bash
# Example crontab entries
# Weekly backup on Sunday at 2:00 AM
0 2 * * 0 cd /path/to/sheetgpt && /usr/bin/python src/scripts/db_management.py backup

# Monthly cleanup on 1st day of month at 3:00 AM
0 3 1 * * cd /path/to/sheetgpt && /usr/bin/python src/scripts/db_cleanup.py

# Monthly optimization on 2nd day of month at 3:00 AM
0 3 2 * * cd /path/to/sheetgpt && /usr/bin/python src/scripts/db_vacuum.py
```

## Backup and Restore

Always maintain proper database backups:

### Creating Backups

```bash
# Create named backup
python src/scripts/db_management.py backup --name=pre_cleanup

# Create automatic timestamped backup
python src/scripts/db_management.py backup
```

### Listing Backups

```bash
python src/scripts/db_management.py list-backups
```

### Restoring from Backup

```bash
python src/scripts/db_management.py restore --backup-path=/path/to/backup.sql
```

## Monitoring and Troubleshooting

Regularly monitor database health:

### Database Statistics

```bash
python src/scripts/db_management.py stats
```

### Common Issues and Solutions

**Problem**: High number of duplicate records
**Solution**: Run `db_cleanup.py` and check for missing unique constraints

**Problem**: Slow queries despite optimization
**Solution**: Check for proper indexing on frequently queried fields

**Problem**: VACUUM fails to reclaim space
**Solution**: Try `VACUUM FULL` (note: this requires exclusive locks) or check for long-running transactions

**Problem**: Autovacuum not running effectively
**Solution**: Adjust PostgreSQL autovacuum settings or set table-specific thresholds

**Problem**: Integrity issues after cleanup
**Solution**: Restore from backup and run with `--dry-run` to investigate the issue

For more complex issues, consult the PostgreSQL logs and documentation.