#!/bin/bash
# This script runs the database restoration directly using the PostgreSQL container

echo "==== SheetGPT Database Restoration ===="
echo "This script will restore the database from backup using the db container"

# Check if the containers are running
if ! docker-compose ps | grep -q "sheetgpt-db"; then
  echo "ERROR: Docker containers are not running"
  echo "Please start the containers with: docker-compose up -d"
  exit 1
fi

# Variables
DB_NAME="sheetgpt"
DB_USER="postgres"
DB_PASSWORD="postgres"
BACKUP_FILE="/Users/lucas/Personal/P_CODE/SheetGPT/data/backups/sheetgpt_backup.dump"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Using backup file: $BACKUP_FILE"
echo "Target database: $DB_NAME"

# Copy the backup file to the database container
echo "Copying backup file to the database container..."
docker cp "$BACKUP_FILE" sheetgpt-db-1:/tmp/sheetgpt_backup.dump

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to copy backup file to database container"
  exit 1
fi

# Terminate all existing connections to the database
echo "Terminating all connections to the database..."
docker-compose exec db psql -U $DB_USER -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
AND pid <> pg_backend_pid();" postgres

# Drop and recreate database
echo "Dropping existing database if it exists..."
docker-compose exec db psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "Creating fresh database..."
docker-compose exec db psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to create database"
  exit 1
fi

# Restore from backup
echo "Restoring database from backup file (using psql for text dumps)..."
docker-compose exec db psql -U $DB_USER -d $DB_NAME -f /tmp/sheetgpt_backup.dump

# Check if restoration was successful by counting tables
echo "Verifying restoration..."
TABLE_COUNT=$(docker-compose exec db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
TABLE_COUNT=$(echo $TABLE_COUNT | xargs) # Trim whitespace

if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "✅ SUCCESS: Database restored successfully with $TABLE_COUNT tables"
  
  # List tables
  echo "Tables in database:"
  docker-compose exec db psql -U $DB_USER -d $DB_NAME -c "\dt"
  
  # Check specifically for the conversations table
  echo "Checking for conversations table..."
  CONVERSATIONS_EXIST=$(docker-compose exec db psql -U $DB_USER -d $DB_NAME -t -c "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='conversations'")
  CONVERSATIONS_EXIST=$(echo $CONVERSATIONS_EXIST | xargs) # Trim whitespace
  
  if [ "$CONVERSATIONS_EXIST" = "1" ]; then
    echo "✅ conversations table exists in the database!"
    echo "You should now be able to login and see your conversations."
  else
    echo "❌ WARNING: conversations table was not found. Restoration may be incomplete."
  fi
  
  exit 0
else
  echo "❌ ERROR: Database restoration failed, no tables found"
  exit 1
fi