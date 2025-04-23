#!/bin/bash
# Script to download and restore the database from Digital Ocean

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "Error: doctl is not installed or not in PATH"
    echo "Please install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if doctl is authenticated
if ! doctl auth list &>/dev/null; then
    echo "Error: doctl is not authenticated"
    echo "Please run 'doctl auth init' and follow the instructions"
    exit 1
fi

# Run the download script
echo "Running download_from_do.sh..."
./download_from_do.sh

# If that fails for any reason, try to restore from local backup
if [ $? -ne 0 ]; then
    echo "Download from Digital Ocean failed"
    
    # Check if we have a local backup
    if [ -f "sheetgpt_backup.dump" ]; then
        echo "Found local backup file, attempting to restore..."
        
        # Run the restore script
        ./run_restore.sh
        
        if [ $? -eq 0 ]; then
            echo "✅ Database restored successfully from local backup"
        else
            echo "❌ Failed to restore from local backup"
            exit 1
        fi
    else
        echo "❌ No local backup file found (sheetgpt_backup.dump)"
        echo "Please run: docker exec sheetgpt-db-1 pg_dump -U postgres -d sheetgpt > sheetgpt_backup.dump"
        exit 1
    fi
else
    echo "✅ Database restored successfully from Digital Ocean"
fi

# Check tables to confirm restore was successful
TABLE_COUNT=$(docker exec sheetgpt-db-1 psql -U postgres -d sheetgpt -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
TABLE_COUNT=$(echo $TABLE_COUNT | xargs) # Trim whitespace

echo "Database contains $TABLE_COUNT tables"
if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "✅ Database is ready to use"
else
    echo "❌ Database appears to be empty"
    exit 1
fi

exit 0