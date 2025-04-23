#!/bin/bash
# Script to download database from Digital Ocean and restore it locally

echo "==== Download and Restore Database from Digital Ocean ===="

# Variables
LOCAL_DB_NAME="sheetgpt"
LOCAL_DB_USER="postgres"
LOCAL_DB_PASSWORD="postgres"
REMOTE_DB_NAME="sheetgpt"  # Database name on Digital Ocean
BACKUP_FILE="do_sheetgpt_backup.sql"
DO_APP_NAME="sheetgpt"  # Your Digital Ocean app name

# Check if doctl is configured
if ! doctl auth list &>/dev/null; then
  echo "❌ ERROR: doctl not configured. Please run 'doctl auth init' first."
  exit 1
fi

# Get the database connection information from Digital Ocean
echo "Getting database connection info from Digital Ocean..."
DB_CONNECTION=$(doctl databases list --format ID,Name,Engine,Status,Region | grep -i postgres | grep sheetgpt)

if [ -z "$DB_CONNECTION" ]; then
  echo "❌ ERROR: Could not find PostgreSQL database for SheetGPT on Digital Ocean."
  echo "Please check your Digital Ocean account or database name."
  exit 1
fi

DB_ID=$(echo "$DB_CONNECTION" | awk '{print $1}')
echo "Found database with ID: $DB_ID"

# Get connection string for the database
echo "Getting connection details..."
CONNECTION_STRING=$(doctl databases connection "$DB_ID" --format URI | grep -v URI)

if [ -z "$CONNECTION_STRING" ]; then
  echo "❌ ERROR: Could not get connection string for database."
  exit 1
fi

echo "Full connection string: $CONNECTION_STRING"

# Extract username, password and host from the connection string
# Format: postgresql://username:password@host:port/database?sslmode=require
# We can use grep, sed and cut to extract the parts
DB_USER=$(echo "$CONNECTION_STRING" | sed -n 's/postgresql:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo "$CONNECTION_STRING" | sed -n 's/postgresql:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$CONNECTION_STRING" | sed -n 's/postgresql:\/\/[^@]*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$CONNECTION_STRING" | sed -n 's/postgresql:\/\/[^:]*:[^@]*@[^:]*:\([^?]*\)\/.*/\1/p')
DB_NAME=$(echo "$CONNECTION_STRING" | sed -n 's/.*\/\([^?]*\)?.*/\1/p')

echo "Extracted connection details for database:"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "User: $DB_USER"
echo "Database from connection string: $DB_NAME"
echo "Using database name: $REMOTE_DB_NAME"

# We'll keep using the specified REMOTE_DB_NAME instead of the one from the connection string

# Download the database using pg_dump
echo "Downloading database from Digital Ocean..."
echo "This might take a few minutes depending on the database size..."

export PGSSLMODE=require
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
  -d "$REMOTE_DB_NAME" --no-owner --no-acl -F p -f "$BACKUP_FILE"

if [ $? -ne 0 ]; then
  echo "❌ ERROR: Failed to download database from Digital Ocean."
  exit 1
fi

echo "✅ Successfully downloaded database to $BACKUP_FILE"
echo "Size of backup file: $(du -h "$BACKUP_FILE" | cut -f1)"

# Now restore the database locally
echo "Now restoring database to local Docker container..."

# Check if the containers are running
if ! docker-compose ps | grep -q "sheetgpt-db"; then
  echo "ERROR: Docker containers are not running"
  echo "Please start the containers with: docker-compose up -d"
  exit 1
fi

# Fix the compatibility issue by removing the transaction_timeout parameter
echo "Fixing compatibility issues in the backup file..."
sed -i '' 's/SET transaction_timeout = 0;//g' "$BACKUP_FILE"

# Copy the backup file to the database container
echo "Copying backup file to the database container..."
docker cp "$BACKUP_FILE" sheetgpt-db-1:/tmp/do_sheetgpt_backup.sql

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to copy backup file to database container"
  exit 1
fi

# Terminate all existing connections to the database
echo "Terminating all connections to the database..."
docker-compose exec db psql -U $LOCAL_DB_USER -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$LOCAL_DB_NAME'
AND pid <> pg_backend_pid();" postgres

# Drop and recreate database
echo "Dropping existing database if it exists..."
docker-compose exec db psql -U $LOCAL_DB_USER -c "DROP DATABASE IF EXISTS $LOCAL_DB_NAME;"

echo "Creating fresh database..."
docker-compose exec db psql -U $LOCAL_DB_USER -c "CREATE DATABASE $LOCAL_DB_NAME;"

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to create database"
  exit 1
fi

# Restore from backup
echo "Restoring database from Digital Ocean backup file..."
docker-compose exec db psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -f /tmp/do_sheetgpt_backup.sql

# Check if restoration was successful by counting tables
echo "Verifying restoration..."
TABLE_COUNT=$(docker-compose exec db psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
TABLE_COUNT=$(echo $TABLE_COUNT | xargs) # Trim whitespace

if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "✅ SUCCESS: Database restored successfully with $TABLE_COUNT tables"
  
  # List tables
  echo "Tables in database:"
  docker-compose exec db psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -c "\dt"
  
  # Check specifically for the conversations table
  echo "Checking for conversations table..."
  CONVERSATIONS_EXIST=$(docker-compose exec db psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='conversations'")
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