from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union, Tuple
from uuid import UUID
import logging
import os
import asyncio
import json
from pathlib import Path
import subprocess
from sqlalchemy import select, update, func, desc, and_, or_, not_, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.models import Conversation, Message, StructuredData, DataChangeHistory, User
from src.utils.database import get_db_session
from src.utils.config import get_settings

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
        # Create backup directory if it doesn't exist
        os.makedirs(self.backup_dir, exist_ok=True)

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
        query = select(Conversation).where(
            and_(
                Conversation.meta_data.contains({"archived": True}),
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
        query = select(Conversation).where(
            Conversation.meta_data.contains({"archived": True})
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
        archived_query = select(
            func.count()
        ).select_from(Conversation).where(
            Conversation.meta_data.contains({"archived": True})
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