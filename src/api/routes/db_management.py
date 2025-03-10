from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import ApiSuccess
from src.services.database_management import DatabaseManagementService
from src.utils.database import get_db
from src.utils.security import get_current_user_id, get_current_admin_user

router = APIRouter()

@router.post("/conversations/{conversation_id}/archive", response_model=ApiSuccess)
async def archive_conversation(
    conversation_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> ApiSuccess:
    """Archive a conversation instead of deleting it permanently."""
    service = DatabaseManagementService(db)
    
    try:
        # Archive the conversation
        await service.mark_conversation_archived(conversation_id)
        return ApiSuccess(success=True, message="Conversation archived successfully")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to archive conversation: {str(e)}"
        )

@router.post("/conversations/{conversation_id}/restore", response_model=ApiSuccess)
async def restore_archived_conversation(
    conversation_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> ApiSuccess:
    """Restore a previously archived conversation."""
    service = DatabaseManagementService(db)
    
    try:
        # Restore the conversation
        await service.restore_archived_conversation(conversation_id)
        return ApiSuccess(success=True, message="Conversation restored successfully")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restore conversation: {str(e)}"
        )

@router.get("/stats", response_model=dict)
async def get_database_statistics(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Get database statistics (admin only)."""
    service = DatabaseManagementService(db)
    
    try:
        # Get statistics
        stats = await service.get_database_statistics()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get database statistics: {str(e)}"
        )

@router.post("/backups", response_model=ApiSuccess)
async def create_database_backup(
    background_tasks: BackgroundTasks,
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> ApiSuccess:
    """Create a database backup (admin only)."""
    service = DatabaseManagementService(db)
    
    # Run backup in background to avoid timeout
    async def run_backup():
        try:
            await service.backup_database()
        except Exception as e:
            # Log the error (can't raise HTTP exception in background task)
            print(f"ERROR in background backup: {str(e)}")
    
    # Schedule the backup
    background_tasks.add_task(run_backup)
    
    return ApiSuccess(
        success=True, 
        message="Database backup scheduled. Check logs for completion status."
    )

@router.get("/backups", response_model=List[dict])
async def list_database_backups(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> List[dict]:
    """List available database backups (admin only)."""
    service = DatabaseManagementService(db)
    
    try:
        # List backups
        backups = service.list_backups()
        return backups
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list backups: {str(e)}"
        )