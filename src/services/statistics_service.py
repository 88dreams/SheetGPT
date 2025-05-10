import logging
from typing import Dict, Any
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

class StatisticsService:
    """
    Service for gathering and providing database statistics.
    """
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_database_statistics(self) -> Dict[str, Any]:
        """Get statistics about the database."""
        
        # Helper to check table existence
        async def table_exists(table_name: str) -> bool:
            query = text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = :name)")
            result = await self.db.execute(query, {"name": table_name})
            return result.scalar_one()

        # Helper to check column existence
        async def column_exists(table_name: str, column_name: str) -> bool:
            if not await table_exists(table_name):
                return False
            query = text("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = :table AND column_name = :col
                )
            """)
            result = await self.db.execute(query, {"table": table_name, "col": column_name})
            return result.scalar_one()

        user_count = 0
        if await table_exists('users'):
            if await column_exists('users', 'deleted_at'):
                user_query = text("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL")
            else:
                user_query = text("SELECT COUNT(*) FROM users")
            user_count_result = await self.db.execute(user_query)
            user_count = user_count_result.scalar_one()

        conversation_count = {"total": 0, "archived": 0, "active": 0}
        if await table_exists('conversations'):
            has_is_archived = await column_exists('conversations', 'is_archived')
            has_deleted_at = await column_exists('conversations', 'deleted_at')
            
            select_clauses = ["COUNT(*) as total"]
            where_clause = "WHERE 1=1"

            if has_is_archived:
                select_clauses.append("SUM(CASE WHEN is_archived = true THEN 1 ELSE 0 END) as archived")
                select_clauses.append("SUM(CASE WHEN is_archived = false THEN 1 ELSE 0 END) as active")
            else:
                select_clauses.append("0 as archived") # Default if column doesn't exist
                select_clauses.append("COUNT(*) as active") # All are active if no archive column
            
            if has_deleted_at:
                where_clause += " AND deleted_at IS NULL"
                
            conv_query_str = f"SELECT {', '.join(select_clauses)} FROM conversations {where_clause}"
            conv_result = await self.db.execute(text(conv_query_str))
            conv_row = conv_result.fetchone()
            if conv_row:
                conversation_count = {"total": conv_row[0] or 0, "archived": conv_row[1] or 0, "active": conv_row[2] or 0}

        message_count = 0
        if await table_exists('messages'):
            if await column_exists('messages', 'deleted_at'):
                msg_query = text("SELECT COUNT(*) FROM messages WHERE deleted_at IS NULL")
            else:
                msg_query = text("SELECT COUNT(*) FROM messages")
            message_count_result = await self.db.execute(msg_query)
            message_count = message_count_result.scalar_one()

        avg_messages = 0
        if conversation_count["total"] > 0:
            avg_messages = round(message_count / conversation_count["total"], 1)

        structured_data_count = 0
        if await table_exists('structured_data'):
            if await column_exists('structured_data', 'deleted_at'):
                structured_query = text("SELECT COUNT(*) FROM structured_data WHERE deleted_at IS NULL")
            else:
                structured_query = text("SELECT COUNT(*) FROM structured_data")
            structured_result = await self.db.execute(structured_query)
            structured_data_count = structured_result.scalar_one()
        
        estimated_storage_mb = 0
        try:
            size_query = text("SELECT pg_database_size(current_database()) / (1024 * 1024.0) as size_mb")
            size_result = await self.db.execute(size_query)
            estimated_storage_mb = round(size_result.scalar_one() or 0, 2)
        except Exception as e:
            logger.warning(f"Could not determine database size: {e}")

        recent_activity = {"last_day": 0, "last_7_days": 0, "last_30_days": 0}
        if await column_exists('conversations', 'created_at'): # Depends on conversations table & created_at
            where_clause_activity = "WHERE 1=1"
            if await column_exists('conversations', 'deleted_at'):
                 where_clause_activity += " AND deleted_at IS NULL"

            activity_query_str = f"""
                SELECT 
                    SUM(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END) as last_day,
                    SUM(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as last_7_days,
                    SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as last_30_days
                FROM conversations {where_clause_activity}
            """
            activity_result = await self.db.execute(text(activity_query_str))
            activity_row = activity_result.fetchone()
            if activity_row:
                recent_activity = {"last_day": activity_row[0] or 0, "last_7_days": activity_row[1] or 0, "last_30_days": activity_row[2] or 0}

        return {
            "user_count": user_count,
            "conversation_count": conversation_count,
            "message_count": message_count,
            "avg_messages_per_conversation": avg_messages,
            "structured_data_count": structured_data_count,
            "estimated_storage_mb": estimated_storage_mb,
            "recent_activity": recent_activity
        } 