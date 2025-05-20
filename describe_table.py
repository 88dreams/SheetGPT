import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import inspect as sql_inspect, MetaData # Renamed inspect to sql_inspect

async def describe_contacts_table():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        try:
            from src.utils.config import get_settings
            settings = get_settings()
            db_url = settings.DATABASE_URL
            print("DATABASE_URL not in env, fetched from get_settings()")
        except ImportError:
            print("Failed to import get_settings from src.utils.config")
            return # exit(1) removed for cleaner flow
        except Exception as e:
            print(f"Error fetching DATABASE_URL via get_settings: {e}")
            return

    if not db_url:
        print("DATABASE_URL could not be determined.")
        return

    print(f"Describing 'contacts' table using DB URL: {db_url}")
    engine = create_async_engine(db_url)
    
    try:
        async with engine.connect() as conn:
            metadata = MetaData()
            # Use run_sync for the reflection part with the connection
            await conn.run_sync(metadata.reflect, only=['contacts'])
            
            if 'contacts' in metadata.tables:
                contacts_table = metadata.tables['contacts']
                print("Columns in 'contacts' table:")
                for column in contacts_table.columns:
                    print(f"- {column.name}: {column.type}")
            else:
                print("Table 'contacts' not found.")
                
    except Exception as e:
        print(f"Error during table inspection: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    import sys
    from pathlib import Path
    # Assuming script is in /workspace (project_root) when created by edit_file
    # and executed from /app (project_root in container)
    sys.path.append(str(Path(__file__).parent.parent)) 
    asyncio.run(describe_contacts_table()) 