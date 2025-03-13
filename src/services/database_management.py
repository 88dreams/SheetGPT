from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union, Tuple
from uuid import UUID
import logging
import os
import asyncio
import json
import csv
from io import StringIO
from pathlib import Path
import subprocess
import re
from sqlalchemy import select, update, func, desc, and_, or_, not_, String, cast, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import JSONB

from src.models.models import Conversation, Message, StructuredData, DataChangeHistory, User
from src.utils.database import get_db_session
from src.utils.config import get_settings
from src.services.anthropic_service import AnthropicService
from src.services.export.sheets_service import GoogleSheetsService

settings = get_settings()
logger = logging.getLogger("database_management")

class DatabaseManagementService:
    """
    Service for managing database maintenance operations including:
    - Pruning/archiving old conversations
    - Backing up and restoring the database
    - Generating database statistics
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.backup_dir = Path(os.environ.get("DB_BACKUP_DIR", "data/backups"))
        self.export_dir = Path(os.environ.get("EXPORT_DIR", "data/exports"))
        # Create directories if they don't exist
        os.makedirs(self.backup_dir, exist_ok=True)
        os.makedirs(self.export_dir, exist_ok=True)
        
        # Initialize other services
        self.anthropic_service = AnthropicService()
        try:
            self.sheets_service = GoogleSheetsService()
        except Exception as e:
            logger.warning(f"Failed to initialize Google Sheets service: {str(e)}")
            self.sheets_service = None

    async def mark_conversation_archived(self, conversation_id: UUID) -> Conversation:
        """
        Mark a conversation as archived instead of deleting it.
        
        Archived conversations:
        - Won't appear in normal conversation lists
        - Can be restored later if needed
        - Remain in the database but are filtered out by default
        """
        conversation = await self.db.get(Conversation, conversation_id)
        if not conversation:
            raise ValueError(f"Conversation with ID {conversation_id} not found")
            
        # Update metadata to mark as archived
        meta_data = conversation.meta_data.copy() if conversation.meta_data else {}
        meta_data["archived"] = True
        meta_data["archived_at"] = datetime.utcnow().isoformat()
        conversation.meta_data = meta_data
        
        await self.db.commit()
        await self.db.refresh(conversation)
        return conversation
        
    async def restore_archived_conversation(self, conversation_id: UUID) -> Conversation:
        """Restore a previously archived conversation."""
        conversation = await self.db.get(Conversation, conversation_id)
        if not conversation:
            raise ValueError(f"Conversation with ID {conversation_id} not found")
            
        # Remove archived flag from metadata
        meta_data = conversation.meta_data.copy() if conversation.meta_data else {}
        if "archived" in meta_data:
            meta_data.pop("archived")
            meta_data.pop("archived_at", None)
            conversation.meta_data = meta_data
            
        await self.db.commit()
        await self.db.refresh(conversation)
        return conversation
    
    async def bulk_archive_conversations(
        self, 
        user_id: Optional[UUID] = None,
        older_than_days: Optional[int] = None, 
        no_activity_days: Optional[int] = None,
        exclude_with_data: bool = True
    ) -> int:
        """
        Archive multiple conversations based on criteria:
        - user_id: Only archive conversations for this user (if provided)
        - older_than_days: Archive conversations created more than X days ago
        - no_activity_days: Archive conversations with no activity for X days
        - exclude_with_data: Skip conversations that have structured data
        
        Returns the number of conversations archived
        """
        # Build the query for conversations to archive
        query = select(Conversation)
        
        # Add filters
        filters = []
        
        # User filter
        if user_id:
            filters.append(Conversation.user_id == user_id)
            
        # Age filter
        if older_than_days:
            cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)
            filters.append(Conversation.created_at < cutoff_date)
            
        # Activity filter
        if no_activity_days:
            activity_cutoff = datetime.utcnow() - timedelta(days=no_activity_days)
            filters.append(Conversation.updated_at < activity_cutoff)
            
        # Build query with filters
        if filters:
            query = query.where(and_(*filters))
            
        # Execute query to get candidate conversations
        result = await self.db.execute(query)
        conversations = result.scalars().all()
        
        # Process conversations that match criteria
        archived_count = 0
        for conversation in conversations:
            # Skip if already archived
            if conversation.meta_data and conversation.meta_data.get("archived"):
                continue
                
            # Check if conversation has structured data (if we need to exclude those)
            if exclude_with_data:
                # Query for related structured data
                data_query = select(StructuredData).where(
                    StructuredData.conversation_id == conversation.id
                )
                data_result = await self.db.execute(data_query)
                has_data = data_result.first() is not None
                
                # Skip if it has structured data
                if has_data:
                    continue
            
            # Archive the conversation
            meta_data = conversation.meta_data.copy() if conversation.meta_data else {}
            meta_data["archived"] = True
            meta_data["archived_at"] = datetime.utcnow().isoformat()
            conversation.meta_data = meta_data
            archived_count += 1
            
        # Commit changes if any conversations were archived
        if archived_count > 0:
            await self.db.commit()
            
        return archived_count
    
    async def permanently_delete_archived_conversations(
        self, 
        older_than_days: int,
        user_id: Optional[UUID] = None
    ) -> int:
        """
        Permanently delete archived conversations that have been archived
        for longer than the specified number of days.
        
        Returns the number of conversations deleted.
        """
        # Calculate cutoff date for archived conversations
        cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)
        
        # Build the query to find eligible conversations
        json_condition = cast('{"archived": true}', JSONB)
        query = select(Conversation).where(
            and_(
                cast(Conversation.meta_data, JSONB).op('@>')(json_condition),
                # This assumes archived_at is in ISO format in the metadata
                # We'll need to do a more complex check in the loop
            )
        )
        
        # Add user filter if specified
        if user_id:
            query = query.where(Conversation.user_id == user_id)
            
        # Execute query
        result = await self.db.execute(query)
        conversations = result.scalars().all()
        
        # Process each conversation
        deleted_count = 0
        for conversation in conversations:
            # Check if archived_at date is older than cutoff
            archived_at_str = conversation.meta_data.get("archived_at")
            if not archived_at_str:
                continue
                
            try:
                archived_at = datetime.fromisoformat(archived_at_str)
                if archived_at < cutoff_date:
                    # Delete this conversation
                    await self.db.delete(conversation)
                    deleted_count += 1
            except (ValueError, TypeError):
                # Skip if date format is invalid
                continue
                
        # Commit changes if any conversations were deleted
        if deleted_count > 0:
            await self.db.commit()
            
        return deleted_count
    
    async def get_archived_conversations(
        self, 
        user_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Conversation]:
        """
        Get a list of archived conversations with pagination.
        If user_id is provided, only return conversations for that user.
        """
        # Build the query
        json_condition = cast('{"archived": true}', JSONB)
        query = select(Conversation).where(
            cast(Conversation.meta_data, JSONB).op('@>')(json_condition)
        )
        
        # Add user filter if specified
        if user_id:
            query = query.where(Conversation.user_id == user_id)
            
        # Add sorting and pagination
        query = query.order_by(desc(Conversation.updated_at)).offset(skip).limit(limit)
        
        # Execute query
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_database_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the database including:
        - Total users
        - Total conversations (active and archived)
        - Total messages
        - Total structured data entries
        - Average messages per conversation
        - Storage usage estimates
        """
        # Get user count
        user_query = select(func.count()).select_from(User)
        user_result = await self.db.execute(user_query)
        user_count = user_result.scalar()
        
        # Get conversation counts
        convo_query = select(
            func.count().label("total")
        ).select_from(Conversation)
        convo_result = await self.db.execute(convo_query)
        convo_count = convo_result.scalar() or 0
        
        # Get archived conversation count separately
        # Using proper PostgreSQL JSON operator @> for JSON containment
        json_condition = cast('{"archived": true}', JSONB)
        archived_query = select(
            func.count()
        ).select_from(Conversation).where(
            cast(Conversation.meta_data, JSONB).op('@>')(json_condition)
        )
        archived_result = await self.db.execute(archived_query)
        archived_count = archived_result.scalar() or 0
        
        # Get message count
        msg_query = select(func.count()).select_from(Message)
        msg_result = await self.db.execute(msg_query)
        msg_count = msg_result.scalar()
        
        # Get structured data count
        data_query = select(func.count()).select_from(StructuredData)
        data_result = await self.db.execute(data_query)
        data_count = data_result.scalar()
        
        # Calculate average messages per conversation
        avg_msgs = msg_count / convo_count if convo_count > 0 else 0
        
        # Estimate storage (approximate)
        # This is a rough estimate based on typical sizes
        try:
            # Get message size
            msg_size_query = select(func.sum(func.length(Message.content))).select_from(Message)
            msg_size_result = await self.db.execute(msg_size_query)
            msg_size_bytes = msg_size_result.scalar() or 0
            
            # Structured data size - json cast may vary by database so handle exceptions
            try:
                data_size_query = select(func.sum(func.length(func.cast(StructuredData.data, String)))).select_from(StructuredData)
                data_size_result = await self.db.execute(data_size_query)
                data_size_bytes = data_size_result.scalar() or 0
            except:
                # Fallback to a simpler estimation
                data_count_query = select(func.count()).select_from(StructuredData)
                data_count_result = await self.db.execute(data_count_query)
                data_count = data_count_result.scalar() or 0
                data_size_bytes = data_count * 5000  # Rough estimate of 5KB per structured data entry
        except Exception as e:
            # If storage calculation fails, provide default values
            msg_size_bytes = 0
            data_size_bytes = 0
        
        # Total storage (rough estimate)
        total_size_mb = (msg_size_bytes + data_size_bytes) / (1024 * 1024)
        
        # Recent activity
        recent_days = 7
        recent_cutoff = datetime.utcnow() - timedelta(days=recent_days)
        recent_query = select(func.count()).select_from(Conversation).where(
            Conversation.updated_at >= recent_cutoff
        )
        recent_result = await self.db.execute(recent_query)
        recent_activity = recent_result.scalar()
        
        return {
            "user_count": user_count,
            "conversation_count": {
                "total": convo_count,
                "active": convo_count - archived_count,
                "archived": archived_count
            },
            "message_count": msg_count,
            "structured_data_count": data_count,
            "avg_messages_per_conversation": round(avg_msgs, 2),
            "estimated_storage_mb": round(total_size_mb, 2),
            "recent_activity": {
                f"last_{recent_days}_days": recent_activity
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def backup_database(self, backup_name: Optional[str] = None) -> str:
        """
        Backup the PostgreSQL database using pg_dump.
        
        Args:
            backup_name: Optional name for the backup file (default: timestamp-based)
            
        Returns:
            Path to the created backup file
        """
        # Generate backup filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = backup_name or f"sheetgpt_backup_{timestamp}"
        if not backup_name.endswith(".sql"):
            backup_name += ".sql"
            
        backup_path = self.backup_dir / backup_name
        
        # Parse database URL for connection parameters
        # URL format: postgresql+asyncpg://user:password@host:port/dbname
        db_url = settings.DATABASE_URL
        db_parts = db_url.replace("postgresql+asyncpg://", "").split("/")
        db_name = db_parts[-1]
        
        auth_parts = db_parts[0].split("@")
        user_pass = auth_parts[0].split(":")
        user = user_pass[0]
        password = user_pass[1] if len(user_pass) > 1 else ""
        
        host_port = auth_parts[1].split(":")
        host = host_port[0]
        port = host_port[1] if len(host_port) > 1 else "5432"
        
        # Set up environment with password
        env = os.environ.copy()
        env["PGPASSWORD"] = password
        
        # Build pg_dump command
        cmd = [
            "pg_dump",
            "-h", host,
            "-p", port,
            "-U", user,
            "-d", db_name,
            "-F", "p",  # Plain text format
            "-f", str(backup_path)
        ]
        
        # Execute pg_dump
        try:
            # If we're running in Docker, we need to execute this in a subprocess
            process = subprocess.run(
                cmd,
                env=env,
                check=True,
                capture_output=True,
                text=True
            )
            
            # Check if backup file was created
            if not os.path.exists(backup_path):
                raise ValueError(f"Backup failed - file {backup_path} not created")
                
            # Get file size for logging
            file_size = os.path.getsize(backup_path)
            logger.info(f"Database backup created: {backup_path} ({file_size/1024/1024:.2f} MB)")
            
            return str(backup_path)
            
        except subprocess.CalledProcessError as e:
            error_msg = f"Database backup failed: {e.stderr}"
            logger.error(error_msg)
            raise ValueError(error_msg)
            
    def list_backups(self) -> List[Dict[str, Any]]:
        """
        List all available database backups with metadata.
        
        Returns list of dictionaries containing:
            - filename
            - path
            - size_mb
            - created_at
        """
        backups = []
        
        # Ensure backup directory exists
        if not os.path.exists(self.backup_dir):
            return backups
            
        # List all SQL backup files
        for file in os.listdir(self.backup_dir):
            if file.endswith(".sql"):
                file_path = self.backup_dir / file
                stats = os.stat(file_path)
                
                backups.append({
                    "filename": file,
                    "path": str(file_path),
                    "size_mb": round(stats.st_size / (1024 * 1024), 2),
                    "created_at": datetime.fromtimestamp(stats.st_ctime).isoformat()
                })
                
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x["created_at"], reverse=True)
        return backups
        
    async def restore_database(self, backup_path: str) -> bool:
        """
        Restore the database from a backup file.
        
        WARNING: This will overwrite the current database.
        
        Args:
            backup_path: Path to the backup file
            
        Returns:
            True if successful, False otherwise
        """
        # Validate backup file exists
        if not os.path.exists(backup_path):
            raise ValueError(f"Backup file not found: {backup_path}")
            
        # Parse database URL for connection parameters
        db_url = settings.DATABASE_URL
        db_parts = db_url.replace("postgresql+asyncpg://", "").split("/")
        db_name = db_parts[-1]
        
        auth_parts = db_parts[0].split("@")
        user_pass = auth_parts[0].split(":")
        user = user_pass[0]
        password = user_pass[1] if len(user_pass) > 1 else ""
        
        host_port = auth_parts[1].split(":")
        host = host_port[0]
        port = host_port[1] if len(host_port) > 1 else "5432"
        
        # Set up environment with password
        env = os.environ.copy()
        env["PGPASSWORD"] = password
        
        # Build psql command
        cmd = [
            "psql",
            "-h", host,
            "-p", port,
            "-U", user,
            "-d", db_name,
            "-f", backup_path
        ]
        
        # Execute psql
        try:
            process = subprocess.run(
                cmd,
                env=env,
                check=True,
                capture_output=True,
                text=True
            )
            
            logger.info(f"Database restored successfully from: {backup_path}")
            return True
            
        except subprocess.CalledProcessError as e:
            error_msg = f"Database restore failed: {e.stderr}"
            logger.error(error_msg)
            raise ValueError(error_msg)
            
    async def rotate_backups(self, max_backups: int = 10) -> int:
        """
        Rotate database backups, keeping only the most recent ones.
        
        Args:
            max_backups: Maximum number of backups to keep
            
        Returns:
            Number of backups deleted
        """
        backups = self.list_backups()
        
        # If we have fewer backups than the max, no need to rotate
        if len(backups) <= max_backups:
            return 0
            
        # Get the backups to delete (oldest first)
        backups_to_delete = backups[max_backups:]
        deleted_count = 0
        
        # Delete each backup
        for backup in backups_to_delete:
            try:
                os.remove(backup["path"])
                deleted_count += 1
                logger.info(f"Deleted old backup: {backup['filename']}")
            except Exception as e:
                logger.error(f"Failed to delete backup {backup['path']}: {str(e)}")
                
        return deleted_count
        
    # ---------- Database Query Functions ----------
    
    async def execute_safe_query(self, query_str: str) -> List[Dict[str, Any]]:
        """
        Execute a SQL query with safety checks to prevent dangerous operations.
        Only allows SELECT statements by default for safety.
        
        Args:
            query_str: SQL query string to execute
            
        Returns:
            List of dictionaries representing rows of results
        """
        # Strip comments and normalize whitespace
        query_str = re.sub(r'--.*$', '', query_str, flags=re.MULTILINE)
        query_str = re.sub(r'/\*.*?\*/', '', query_str, flags=re.DOTALL)
        query_str = query_str.strip()
        
        # Basic safety check - only allow SELECT statements
        if not query_str.lower().startswith('select'):
            raise ValueError("Only SELECT queries are allowed for security reasons")
        
        # Check for problematic patterns
        danger_patterns = [
            r'\bDROP\b',
            r'\bDELETE\b',
            r'\bTRUNCATE\b',
            r'\bALTER\b',
            r'\bCREATE\b',
            r'\bINSERT\b',
            r'\bUPDATE\b',
            r'\bGRANT\b',
            r'\bREVOKE\b',
        ]
        
        for pattern in danger_patterns:
            if re.search(pattern, query_str, re.IGNORECASE):
                raise ValueError(f"Query contains prohibited operation: {pattern}")
                
        try:
            # Create a raw SQLAlchemy TextClause object to execute the query
            query = text(query_str)
            
            # Execute the query
            result = await self.db.execute(query)
            
            # Convert to list of dictionaries
            rows = []
            for row in result:
                # Handle Row objects by converting to dict
                if hasattr(row, '_asdict'):
                    # Named tuple-like results
                    rows.append(row._asdict())
                elif hasattr(row, 'keys'):
                    # Dict-like results
                    rows.append({key: row[key] for key in row.keys()})
                else:
                    # Raw tuple results - convert to dict with column indices
                    rows.append({f"col{i}": val for i, val in enumerate(row)})
            
            return rows
            
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            raise ValueError(f"Query execution failed: {str(e)}")
            
    async def translate_natural_language_to_sql(self, nl_query: str) -> str:
        """
        Convert a natural language query to SQL without executing it.
        
        Args:
            nl_query: Natural language query string
            
        Returns:
            Generated SQL query string
        """
        # Get the database schema information
        schema_info = await self._get_schema_info()
        
        # Build a prompt for Claude to convert natural language to SQL
        prompt = f"""You are an expert SQL developer. Convert the following natural language query to a PostgreSQL SQL query.

Database Schema:
{schema_info}

Natural Language Query:
{nl_query}

Rules:
1. Only generate a SELECT query - other operations are not allowed
2. Use proper SQL syntax for PostgreSQL
3. Return ONLY the final SQL query with no other text or explanation
4. Do not use DROP, DELETE, TRUNCATE, ALTER, CREATE, INSERT, UPDATE, GRANT, or REVOKE commands
5. Limit results to 100 rows unless otherwise specified

SQL Query:"""

        try:
            # Get the SQL query from Claude (no longer streaming)
            sql_query = await self.anthropic_service.generate_code(prompt)
                
            # Clean up the response - extract just the SQL if Claude wrapped it in markdown
            sql_query = re.sub(r'^```sql\s*', '', sql_query, flags=re.MULTILINE)
            sql_query = re.sub(r'\s*```$', '', sql_query, flags=re.MULTILINE)
            sql_query = sql_query.strip()
            
            # Log the generated SQL
            logger.info(f"Generated SQL from natural language (translate only): {sql_query}")
            
            return sql_query
            
        except Exception as e:
            logger.error(f"Error in natural language translation: {str(e)}")
            raise ValueError(f"Failed to translate natural language query: {str(e)}")
    
    async def execute_natural_language_query(self, nl_query: str) -> Tuple[List[Dict[str, Any]], str]:
        """
        Convert a natural language query to SQL and execute it.
        
        Args:
            nl_query: Natural language query string
            
        Returns:
            Tuple containing:
              - List of dictionaries representing rows of results
              - Generated SQL query string
        """
        try:
            # Generate the SQL query
            sql_query = await self.translate_natural_language_to_sql(nl_query)
            
            # Execute the generated SQL query
            results = await self.execute_safe_query(sql_query)
            
            # Return both the results and the generated SQL
            return results, sql_query
            
        except Exception as e:
            logger.error(f"Error in natural language query: {str(e)}")
            raise ValueError(f"Failed to process natural language query: {str(e)}")
            
    async def _get_schema_info(self) -> str:
        """
        Get information about the database schema for natural language to SQL conversion.
        
        Returns:
            String describing database tables and their columns
        """
        # Query PostgreSQL information schema to get table and column data
        schema_query = text("""
            SELECT 
                t.table_name, 
                c.column_name, 
                c.data_type,
                pg_catalog.obj_description(
                    (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass::oid, 
                    'pg_class'
                ) as table_description
            FROM 
                information_schema.tables t
            JOIN 
                information_schema.columns c 
                ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE 
                t.table_schema = 'public'
                AND t.table_type = 'BASE TABLE'
            ORDER BY 
                t.table_name, 
                c.ordinal_position
        """)
        
        # Execute the schema query
        result = await self.db.execute(schema_query)
        rows = result.fetchall()
        
        # Group by table
        tables = {}
        for row in rows:
            table_name = row[0]
            column_name = row[1]
            data_type = row[2]
            table_description = row[3] or ""
            
            if table_name not in tables:
                tables[table_name] = {
                    "columns": [],
                    "description": table_description
                }
                
            tables[table_name]["columns"].append(f"{column_name} ({data_type})")
            
        # Format schema info
        schema_info = []
        for table_name, table_data in tables.items():
            schema_info.append(f"Table: {table_name}")
            if table_data["description"]:
                schema_info.append(f"Description: {table_data['description']}")
            schema_info.append("Columns:")
            for column in table_data["columns"]:
                schema_info.append(f"  - {column}")
            schema_info.append("")
            
        return "\n".join(schema_info)
    
    async def export_query_results_to_csv(self, results: List[Dict[str, Any]]) -> str:
        """
        Export query results to a CSV file.
        
        Args:
            results: Query results as a list of dictionaries
            
        Returns:
            URL path to the generated CSV file
        """
        if not results:
            raise ValueError("No results to export")
            
        try:
            # Generate a unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"query_results_{timestamp}.csv"
            
            # Ensure the exports directory exists
            os.makedirs(self.export_dir, exist_ok=True)
            
            # Create the full file path
            file_path = self.export_dir / filename
            
            logger.info(f"Exporting CSV to: {file_path} (absolute path)")
            
            # Get column headers from first result
            headers = list(results[0].keys())
            logger.info(f"CSV headers: {headers}")
            
            # Write to CSV
            with open(file_path, 'w', newline='') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=headers)
                writer.writeheader()
                for row in results:
                    writer.writerow(row)
                    
            # Return the relative URL path
            url_path = f"/exports/{filename}"
            logger.info(f"CSV export complete, relative URL: {url_path}")
            return url_path
            
        except Exception as e:
            logger.error(f"Error exporting to CSV: {str(e)}")
            raise ValueError(f"Failed to export results to CSV: {str(e)}")
            
    async def export_query_results_to_sheets(
        self, 
        results: List[Dict[str, Any]], 
        title: str = "Query Results"
    ) -> Dict[str, Any]:
        """
        Export query results to Google Sheets.
        
        Args:
            results: Query results as a list of dictionaries
            title: Title for the Google Sheet
            
        Returns:
            Dictionary with spreadsheet info
        """
        if not results:
            raise ValueError("No results to export")
            
        if not self.sheets_service:
            logger.warning("Google Sheets service is not available, falling back to CSV export")
            # Fall back to CSV export
            csv_url = await self.export_query_results_to_csv(results)
            return {
                "url": f"/api/v1{csv_url}",
                "title": title,
                "fallback": "csv"
            }
            
        try:
            # Initialize the service from token
            token_path = os.environ.get("GOOGLE_TOKEN_PATH", "credentials/token.json")
            logger.info(f"Initializing Google Sheets service with token path: {token_path}")
            
            if not os.path.exists(token_path):
                logger.warning(f"Token file not found: {token_path}, falling back to CSV export")
                csv_url = await self.export_query_results_to_csv(results)
                return {
                    "url": f"/api/v1{csv_url}",
                    "title": title,
                    "fallback": "csv"
                }
                
            initialized = await self.sheets_service.initialize_from_token(token_path)
            
            if not initialized:
                logger.warning("Failed to initialize Google Sheets service, falling back to CSV export")
                csv_url = await self.export_query_results_to_csv(results)
                return {
                    "url": f"/api/v1{csv_url}",
                    "title": title,
                    "fallback": "csv"
                }
                
            # Convert results to row format for Sheets
            # First row is headers
            headers = list(results[0].keys())
            
            # Data rows
            data_rows = []
            for row in results:
                data_rows.append([row.get(header, "") for header in headers])
                
            # All rows (headers + data)
            all_rows = [headers] + data_rows
            
            # Create spreadsheet with data
            sheet_info = await self.sheets_service.create_spreadsheet_with_template(
                title=title,
                template_name="default",
                data=all_rows
            )
            
            return sheet_info
            
        except Exception as e:
            logger.error(f"Error exporting to Google Sheets: {str(e)}")
            raise ValueError(f"Failed to export results to Google Sheets: {str(e)}")