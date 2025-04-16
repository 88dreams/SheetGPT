#!/usr/bin/env python3
"""
Final script to fix the IndyCar league record in production.
Includes schema inspection to handle different database structures.
"""

import asyncio
import os
import sys
import traceback
import asyncpg
import ssl

# Print diagnostic information
print("Starting final script with schema inspection...")
print(f"Python version: {sys.version}")

# Get database URL from environment
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set.")
    sys.exit(1)

# Convert SQLAlchemy URL to asyncpg format
if DATABASE_URL.startswith('postgresql+asyncpg://'):
    ASYNCPG_URL = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
else:
    ASYNCPG_URL = DATABASE_URL

print(f"Database URL found and prepared for connection")

async def inspect_table_columns(conn, table_name):
    """Get column names for a specific table."""
    columns = await conn.fetch("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1
    """, table_name)
    
    return [col['column_name'] for col in columns]

async def fix_indycar():
    """Fix the IndyCar league record with schema inspection."""
    try:
        # Create SSL context that doesn't verify certificates
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        print("Connecting to database...")
        conn = await asyncpg.connect(ASYNCPG_URL, ssl=ssl_context)
        print("Connection successful!")
        
        # Find IndyCar league
        print("\n----- LEAGUE INFO -----")
        print("Looking for IndyCar league...")
        indycar = await conn.fetchrow("""
        SELECT id, name, sport, country 
        FROM leagues 
        WHERE name = 'IndyCar'
        """)
        
        if indycar:
            print(f"Found IndyCar league ID: {indycar['id']}")
            print(f"Current Sport: {indycar['sport']}")
            print(f"Current Country: {indycar['country']}")
            
            if indycar['sport'] != 'Motorsport':
                print(f"Updating sport field from '{indycar['sport']}' to 'Motorsport'...")
                await conn.execute("""
                UPDATE leagues 
                SET sport = 'Motorsport' 
                WHERE id = $1
                """, indycar['id'])
                print("Updated IndyCar sport to 'Motorsport'")
            else:
                print("Sport field already has the correct value ('Motorsport'), no update needed.")
        else:
            print("IndyCar league not found in the database!")
            return
        
        # Verify the fix
        print("\nVerifying update...")
        updated_indycar = await conn.fetchrow("""
        SELECT id, name, sport 
        FROM leagues 
        WHERE name = 'IndyCar'
        """)
        
        if updated_indycar:
            print(f"Verification: IndyCar league now has sport = '{updated_indycar['sport']}'")
        else:
            print("Verification failed: IndyCar league not found after update!")
            return
        
        # Inspect broadcast_rights table
        print("\n----- BROADCAST RIGHTS INFO -----")
        print("Inspecting broadcast_rights table structure...")
        broadcast_columns = await inspect_table_columns(conn, 'broadcast_rights')
        print(f"Found columns: {', '.join(broadcast_columns)}")
        
        # Check if there's a league column (could be league_id or other name)
        league_column = None
        for col in broadcast_columns:
            if 'league' in col:
                league_column = col
                print(f"Found league-related column: {league_column}")
                break
        
        if not league_column:
            print("No league-related column found in broadcast_rights table")
            # Try to find related tables
            related_tables = await conn.fetch("""
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public'
            """)
            print(f"Available tables: {', '.join(t['tablename'] for t in related_tables)}")
            return
        
        # Get broadcast rights using the correct column name
        print(f"\nChecking broadcast rights with {league_column} = '{updated_indycar['id']}'")
        rights_count_query = f"""
        SELECT COUNT(*) 
        FROM broadcast_rights 
        WHERE {league_column} = $1
        """
        
        rights_count = await conn.fetchval(rights_count_query, updated_indycar['id'])
        print(f"Found {rights_count} broadcast rights associated with IndyCar")
        
        # Show details of broadcast rights if any exist
        if rights_count > 0:
            print("\nBroadcast Rights Sample:")
            # Check if broadcast_company_id exists
            company_col = 'broadcast_company_id' if 'broadcast_company_id' in broadcast_columns else None
            territory_col = 'territory' if 'territory' in broadcast_columns else None
            
            if company_col and territory_col:
                query = f"""
                SELECT id, {territory_col}
                FROM broadcast_rights
                WHERE {league_column} = $1
                LIMIT 5
                """
                
                rights = await conn.fetch(query, updated_indycar['id'])
                for right in rights:
                    print(f"ID: {right['id']}, Territory: {right[territory_col]}")
                    
                # Try to get broadcast company names
                try:
                    # First check brands table structure
                    brands_columns = await inspect_table_columns(conn, 'brands')
                    print(f"\nBrands table columns: {', '.join(brands_columns)}")
                    
                    # Get broadcast company details
                    if 'name' in brands_columns:
                        companies_query = f"""
                        SELECT br.id, b.name as company_name
                        FROM broadcast_rights br
                        JOIN brands b ON br.{company_col} = b.id
                        WHERE br.{league_column} = $1
                        LIMIT 5
                        """
                        
                        companies = await conn.fetch(companies_query, updated_indycar['id'])
                        print("\nBroadcast Companies:")
                        for company in companies:
                            print(f"Right ID: {company['id']}, Company: {company['company_name']}")
                except Exception as e:
                    print(f"Error fetching company details: {e}")
            else:
                # Just show the raw data
                query = f"""
                SELECT *
                FROM broadcast_rights
                WHERE {league_column} = $1
                LIMIT 2
                """
                
                rights = await conn.fetch(query, updated_indycar['id'])
                for right in rights:
                    print(f"Record: {dict(right)}")
        
        # Close connection
        await conn.close()
        
    except Exception as e:
        print(f"Error occurred: {e}")
        print(traceback.format_exc())

async def main():
    print("Starting IndyCar production database fix with schema inspection...")
    await fix_indycar()
    print("\nOperation completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())