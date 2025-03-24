#!/usr/bin/env python3
"""
Script to make division_conference_id field required on teams table.
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection string
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "sheetgpt")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

conn_string = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"

def make_division_required():
    """Make division_conference_id field required."""
    
    # Connect to the database
    print(f"Connecting to database: {DB_NAME} on {DB_HOST}")
    conn = psycopg2.connect(conn_string)
    
    try:
        with conn:
            with conn.cursor() as cur:
                # Check if any teams have null division_conference_id
                cur.execute("SELECT COUNT(*) FROM teams WHERE division_conference_id IS NULL")
                null_count = cur.fetchone()[0]
                
                if null_count > 0:
                    print(f"ERROR: {null_count} teams still have NULL division_conference_id. Please assign divisions first.")
                    return
                
                # Set the column to not null
                print("Setting division_conference_id column to NOT NULL")
                cur.execute("ALTER TABLE teams ALTER COLUMN division_conference_id SET NOT NULL")
                
                # Verify the change
                cur.execute("""
                    SELECT column_name, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = 'teams' AND column_name = 'division_conference_id'
                """)
                column_info = cur.fetchone()
                
                if column_info and column_info[1] == 'NO':
                    print("Column division_conference_id is now NOT NULL")
                else:
                    print("Failed to set column to NOT NULL")
    
    finally:
        conn.close()
        print("Database connection closed.")

def main():
    """Main function."""
    make_division_required()

if __name__ == "__main__":
    main()