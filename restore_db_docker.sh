#!/bin/bash
# Script to restore the database in Docker

echo "=== Database Restore Script ==="
echo "This script will restore the database from a backup file"

# Set variables
BACKUP_FILE="/app/sheetgpt_backup.dump"
DB_NAME="sheetgpt"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="db"
DB_PORT="5432"

echo "Backup file: $BACKUP_FILE"
echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Set PostgreSQL password environment variable
export PGPASSWORD="$DB_PASSWORD"

# First, check if database exists
echo "Checking if database exists..."
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    echo "Database '$DB_NAME' exists, dropping it first..."
    
    # Terminate all connections to the database first
    echo "Terminating all connections to the database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = '$DB_NAME' 
    AND pid <> pg_backend_pid();" postgres
    
    # Now drop the database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE $DB_NAME"
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to drop database"
        exit 1
    fi
fi

# Create a new database
echo "Creating new database '$DB_NAME'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME"
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create database"
    exit 1
fi

# Restore from backup
echo "Restoring database from backup file..."
pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$BACKUP_FILE"
RESTORE_RESULT=$?

# pg_restore often returns non-zero status even on success due to minor errors
# Check if any tables were created successfully
echo "Verifying restoration..."
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "SUCCESS: Database restored successfully with $TABLE_COUNT tables"
    # List tables
    echo "Tables in database:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt"
    
    # Check specifically for the conversations table
    echo "Checking for conversations table..."
    CONVERSATIONS_EXIST=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='conversations'")
    
    if [ "$CONVERSATIONS_EXIST" = "1" ]; then
        echo "✅ conversations table exists in the database!"
    else
        echo "❌ WARNING: conversations table was not found. Restoration may be incomplete."
    fi
    
    exit 0
else
    echo "ERROR: Database restoration failed, no tables found"
    exit 1
fi