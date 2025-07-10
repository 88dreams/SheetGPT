from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import os
import sqlalchemy
from src.utils.auth import get_current_user
from src.utils.database import get_db, get_db_session

router = APIRouter(tags=["admin"])

@router.post("/clean-database")
async def clean_database(current_user: dict = Depends(get_current_user)):
    """
    Clean the database by executing SQL statements directly.
    This will delete all data except user accounts.
    
    Uses separate database sessions for each operation to avoid transaction conflicts.
    """
    # Check if user has admin privileges
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to perform this action"
        )
    
    # List of tables to clean
    tables = [
        "data_cells",
        "data_columns",
        "data_change_history",
        "messages",
        "structured_data",
        "conversations"
    ]
    
    # Sports tables to clean if they exist
    sports_tables = [
        "players", 
        "teams", 
        "games", 
        "stadiums", 
        "broadcasts", 
        "productions", 
        "brands", 
        "leagues"
    ]
    
    # Results tracking
    results = {}
    success = True
    
    # Process each table with a fresh database session
    for table in tables:
        try:
            async with get_db_session() as session:
                # Delete all records from the table
                await session.execute(sqlalchemy.text(f"DELETE FROM {table};"))
                await session.commit()
                results[table] = "Success"
        except Exception as e:
            success = False
            results[table] = f"Error: {str(e)}"
            print(f"Error cleaning {table}: {str(e)}")
    
    # Process sports tables if they exist
    for table in sports_tables:
        try:
            # First check if table exists with a fresh session
            async with get_db_session() as session:
                check_query = f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '{table}'
                );
                """
                result = await session.execute(sqlalchemy.text(check_query))
                exists = result.scalar_one_or_none()
                
                # If table exists, delete records with a fresh session
                if exists:
                    async with get_db_session() as delete_session:
                        await delete_session.execute(sqlalchemy.text(f"DELETE FROM {table};"))
                        await delete_session.commit()
                        results[table] = "Success"
        except Exception as e:
            success = False
            results[table] = f"Error: {str(e)}"
            print(f"Error cleaning {table}: {str(e)}")
    
    # Get counts for verification with fresh sessions
    counts = {}
    
    # Get user count with a fresh session
    try:
        async with get_db_session() as session:
            user_count_result = await session.execute(sqlalchemy.text("SELECT COUNT(*) FROM users;"))
            counts["users"] = user_count_result.scalar_one_or_none()
    except Exception as e:
        counts["users"] = f"Error: {str(e)}"
    
    # Get counts for other tables
    for table in tables + [table for table in sports_tables if results.get(table) == "Success"]:
        try:
            async with get_db_session() as session:
                count_result = await session.execute(sqlalchemy.text(f"SELECT COUNT(*) FROM {table};"))
                counts[table] = count_result.scalar_one_or_none()
        except Exception as e:
            counts[table] = f"Error: {str(e)}"
    
    # Build detailed response
    details = "Database cleaning results:\n\n"
    details += "Table cleaning results:\n"
    for table, result in results.items():
        details += f"- {table}: {result}\n"
    
    details += "\nVerification (record counts):\n"
    for table, count in counts.items():
        details += f"- {table}: {count}\n"
    
    if success:
        return {"message": "Database cleaned successfully", "details": details}
    else:
        return {"message": "Database cleaned with some errors", "details": details}