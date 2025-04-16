#!/usr/bin/env python3
"""
Script to fix both sport and country fields for the IndyCar league record.
"""

import asyncio
import os
import sys
import traceback
import asyncpg
import ssl

# Print diagnostic information
print("Starting IndyCar country and sport fix script...")
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

async def fix_indycar_fields():
    """Fix both sport and country fields for IndyCar league."""
    try:
        # Create SSL context that doesn't verify certificates
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        print("Connecting to database...")
        conn = await asyncpg.connect(ASYNCPG_URL, ssl=ssl_context)
        print("Connection successful!")
        
        # Find IndyCar league
        print("\nLooking for IndyCar league...")
        indycar = await conn.fetchrow("""
        SELECT id, name, sport, country 
        FROM leagues 
        WHERE name = 'IndyCar'
        """)
        
        if not indycar:
            print("IndyCar league not found in the database!")
            return
            
        print(f"Found IndyCar league ID: {indycar['id']}")
        print(f"Current Sport: {indycar['sport']}")
        print(f"Current Country: {indycar['country']}")
        
        # Check if fixes are needed
        needs_sport_fix = indycar['sport'] != 'Motorsport'
        needs_country_fix = indycar['country'] != 'USA'
        
        if not needs_sport_fix and not needs_country_fix:
            print("Both sport and country fields already have correct values. No updates needed.")
            return
            
        # Apply fixes
        if needs_sport_fix and needs_country_fix:
            print("Both sport and country fields need to be fixed.")
            await conn.execute("""
            UPDATE leagues 
            SET sport = 'Motorsport', country = 'USA' 
            WHERE id = $1
            """, indycar['id'])
            print("Updated sport to 'Motorsport' and country to 'USA'")
        elif needs_sport_fix:
            print("Only sport field needs to be fixed.")
            await conn.execute("""
            UPDATE leagues 
            SET sport = 'Motorsport' 
            WHERE id = $1
            """, indycar['id'])
            print("Updated sport to 'Motorsport'")
        elif needs_country_fix:
            print("Only country field needs to be fixed.")
            await conn.execute("""
            UPDATE leagues 
            SET country = 'USA' 
            WHERE id = $1
            """, indycar['id'])
            print("Updated country to 'USA'")
        
        # Verify the fixes
        print("\nVerifying fixes...")
        updated_indycar = await conn.fetchrow("""
        SELECT id, name, sport, country 
        FROM leagues 
        WHERE name = 'IndyCar'
        """)
        
        if updated_indycar:
            print(f"Current Sport: {updated_indycar['sport']}")
            print(f"Current Country: {updated_indycar['country']}")
            
            if updated_indycar['sport'] == 'Motorsport' and updated_indycar['country'] == 'USA':
                print("SUCCESS: Both sport and country fields now have correct values!")
            else:
                print("WARNING: One or both fields still have incorrect values.")
        else:
            print("ERROR: Could not verify fixes - IndyCar league not found after update!")
        
        # Close connection
        await conn.close()
        
    except Exception as e:
        print(f"Error occurred: {e}")
        print(traceback.format_exc())

async def main():
    print("Starting IndyCar field fixes...")
    await fix_indycar_fields()
    print("\nOperation completed!")

if __name__ == "__main__":
    asyncio.run(main())