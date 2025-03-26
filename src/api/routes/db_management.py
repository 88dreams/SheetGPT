from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
import csv
import os
import sys
from pathlib import Path
from datetime import datetime
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import ApiSuccess
from src.services.database_management import DatabaseManagementService
from src.services.anthropic_service import AnthropicService
from src.utils.database import get_db
from src.utils.security import get_current_user_id, get_current_admin_user

# Set up logging
logger = logging.getLogger("db_management")

router = APIRouter()

# Create a shared AnthropicService instance
anthropic_service = AnthropicService()

@router.post("/conversations/{conversation_id}/archive", response_model=ApiSuccess)
async def archive_conversation(
    conversation_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> ApiSuccess:
    """Archive a conversation instead of deleting it permanently."""
    service = DatabaseManagementService(db, anthropic_service)
    
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
    service = DatabaseManagementService(db, anthropic_service)
    
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
    service = DatabaseManagementService(db, anthropic_service)
    
    try:
        # Get statistics
        stats = await service.get_database_statistics()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get database statistics: {str(e)}"
        )

@router.post("/backups", response_model=Dict[str, Any])
async def create_database_backup(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create a database backup (admin only)."""
    service = DatabaseManagementService(db, anthropic_service)
    
    try:
        # Create backup immediately (not in background)
        backup_path = await service.backup_database()
        
        # Extract filename from path
        backup_filename = os.path.basename(backup_path)
        backup_id = backup_filename.replace("backup_", "").replace(".sql", "")
        
        return {
            "success": True,
            "message": "Database backup created successfully",
            "backup_id": backup_id,
            "filename": backup_filename
        }
    except Exception as e:
        logger.error(f"Error creating backup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create backup: {str(e)}"
        )

@router.get("/backups", response_model=List[dict])
async def list_database_backups(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> List[dict]:
    """List available database backups (admin only)."""
    service = DatabaseManagementService(db, anthropic_service)
    
    try:
        # List backups
        backups = service.list_backups()
        return backups
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list backups: {str(e)}"
        )

@router.get("/backups/{backup_id}/download", response_class=Response)
async def download_database_backup(
    backup_id: str,
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Response:
    """Download a specific database backup (admin only)."""
    service = DatabaseManagementService(db, anthropic_service)
    
    try:
        # List all backups
        backups = service.list_backups()
        
        # Find the specified backup
        backup = None
        for b in backups:
            if b["filename"].startswith(f"backup_{backup_id}"):
                backup = b
                break
                
        # If not found in the regular backups, check the temp directory directly
        if not backup:
            backup_path = f"/tmp/sheetgpt_backups/backup_{backup_id}.sql"
            if os.path.exists(backup_path):
                backup_file = Path(backup_path)
                stats = backup_file.stat()
                backup = {
                    "filename": backup_file.name,
                    "path": str(backup_file),
                    "created_at": datetime.fromtimestamp(stats.st_ctime).isoformat(),
                    "size_bytes": stats.st_size,
                    "size_mb": round(stats.st_size / (1024 * 1024), 2)
                }
                
        if not backup:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backup with ID {backup_id} not found"
            )
            
        # Read the backup file
        backup_path = backup["path"]
        
        try:
            with open(backup_path, "rb") as file:
                backup_content = file.read()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to read backup file: {str(e)}"
            )
            
        # Return the file content
        return Response(
            content=backup_content,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={backup['filename']}",
                "Content-Length": str(backup["size_bytes"])
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download backup: {str(e)}"
        )

@router.get("/maintenance/status", response_model=Dict[str, Any])
async def get_maintenance_status(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get the current status of database maintenance operations (admin only)."""
    service = DatabaseManagementService(db, anthropic_service)
    
    try:
        # Get maintenance status
        status = await service.get_maintenance_status()
        return status
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get maintenance status: {str(e)}"
        )

@router.get("/cleanup/dry-run", response_model=Dict[str, Any])
async def run_cleanup_dry_run(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Run database cleanup in dry-run mode (analysis only, no changes) (admin only)."""
    service = DatabaseManagementService(db, anthropic_service)
    
    try:
        # Run cleanup dry run
        results = await service.run_cleanup_dry_run()
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run cleanup dry run: {str(e)}"
        )

@router.post("/cleanup", response_model=Dict[str, Any])
async def run_cleanup(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Run database cleanup to fix duplicates and repair relationships (admin only)."""
    service = DatabaseManagementService(db, anthropic_service)
    
    try:
        # Run cleanup
        results = await service.run_cleanup()
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run cleanup: {str(e)}"
        )

@router.post("/vacuum", response_model=Dict[str, Any])
async def run_vacuum(
    skip_reindex: bool = False,
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Run database optimization (VACUUM ANALYZE and optionally REINDEX) (admin only)."""
    service = DatabaseManagementService(db, anthropic_service)
    
    try:
        # Run vacuum
        results = await service.run_vacuum(skip_reindex=skip_reindex)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run vacuum: {str(e)}"
        )
@router.post("/download-csv", response_class=Response)
async def download_csv(
    export_data: Dict[str, Any],
    current_user_id: UUID = Depends(get_current_user_id)
) -> Response:
    """Generate a CSV file directly from data and return it for download.
    
    This endpoint:
    - Takes data directly in the request
    - Converts it to CSV format
    - Returns the CSV as a file download
    """
    try:
        # Get required parameters
        data = export_data.get("data", [])
        
        # Add detailed logging
        logger.info(f"CSV download request received")
        logger.info(f"Data type: {type(data)}, length: {len(data) if isinstance(data, list) else 'not a list'}")
        
        if not data:
            raise ValueError("No data provided for CSV download")
        
        if not isinstance(data, list):
            raise ValueError("Data must be a list of objects")
        
        # Generate CSV content
        headers = list(data[0].keys())
        
        # Use StringIO to build CSV in memory
        csv_output = StringIO()
        writer = csv.DictWriter(csv_output, fieldnames=headers)
        writer.writeheader()
        for row in data:
            writer.writerow(row)
        
        # Get the CSV content
        csv_content = csv_output.getvalue()
        
        # Return CSV as a downloadable file
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=query_results.csv",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
        
    except Exception as e:
        logger.error(f"Error in CSV download: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV generation failed: {str(e)}"
        )

@router.post("/export", response_model=Dict[str, Any])
async def export_data(
    export_data: Dict[str, Any],
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Export data directly to CSV or Google Sheets without executing a query.
    
    This endpoint supports:
    - Exporting data to CSV
    - Exporting data to Google Sheets
    - Custom title for exported data
    """
    service = DatabaseManagementService(db, anthropic_service)
    
    try:
        # Get required parameters
        data = export_data.get("data", [])
        format = export_data.get("format", "csv")
        title = export_data.get("title", "Exported Data")
        
        # Add detailed logging
        logger.info(f"Export request received: format={format}, title={title}")
        logger.info(f"Data type: {type(data)}, length: {len(data) if isinstance(data, list) else 'not a list'}")
        if isinstance(data, list) and len(data) > 0:
            sample = data[0]
            logger.info(f"First row sample keys: {list(sample.keys()) if isinstance(sample, dict) else 'not a dict'}")
        
        if not data:
            raise ValueError("No data provided for export")
        
        # Perform export based on format
        if format == "csv":
            relative_url = await service.export_query_results_to_csv(data)
            # Use a proper absolute URL for the frontend
            url = f"/api/v1{relative_url}"
            return {
                "success": True,
                "format": "csv",
                "url": url
            }
        elif format == "sheets":
            sheet_info = await service.export_query_results_to_sheets(data, title)
            return {
                "success": True,
                "format": "sheets",
                "url": sheet_info["url"],
                "title": sheet_info["title"]
            }
        else:
            raise ValueError(f"Unsupported export format: {format}")
            
    except Exception as e:
        logger.error(f"Error in export: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Export failed: {str(e)}"
        )
        
@router.post("/query", response_model=Dict[str, Any])
async def execute_database_query(
    query_data: Dict[str, Any],
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Execute a database query and return the results.
    
    This endpoint supports:
    - Direct SQL execution (with safety checks)
    - Natural language to SQL conversion
    - CSV and Google Sheets export of results
    """
    service = DatabaseManagementService(db, anthropic_service)
    
    try:
        # Determine query type (SQL or natural language)
        is_natural_language = query_data.get("natural_language", False)
        query_text = query_data.get("query", "")
        
        if not query_text:
            raise ValueError("Query text is required")
            
        # Execute the query
        generated_sql = None
        translate_only = query_data.get("translate_only", False)
        
        if is_natural_language:
            if translate_only:
                # Only convert natural language to SQL without executing
                generated_sql = await service.translate_natural_language_to_sql(query_text)
                results = []  # Empty results since we're not executing
            else:
                # Convert natural language to SQL using AI and execute
                results, generated_sql = await service.execute_natural_language_query(query_text)
        else:
            # Execute direct SQL with safety checks
            results = await service.execute_safe_query(query_text)
            
        # Check if export is requested
        export_format = query_data.get("export_format")
        if export_format:
            if export_format == "csv":
                # Return CSV export info
                csv_url = await service.export_query_results_to_csv(results)
                response = {
                    "success": True,
                    "results": results,
                    "export": {
                        "format": "csv",
                        "url": csv_url
                    }
                }
                
                # Include generated SQL if natural language was used
                if generated_sql:
                    response["generated_sql"] = generated_sql
                    
                return response
            elif export_format == "sheets":
                # Return Google Sheets export info
                sheet_info = await service.export_query_results_to_sheets(
                    results, 
                    query_data.get("sheet_title", "Query Results")
                )
                response = {
                    "success": True,
                    "results": results,
                    "export": {
                        "format": "sheets",
                        "url": sheet_info.get("spreadsheetUrl"),
                        "id": sheet_info.get("spreadsheet_id")
                    }
                }
                
                # Include generated SQL if natural language was used
                if generated_sql:
                    response["generated_sql"] = generated_sql
                    
                return response
                
        # Return the results and generated SQL if available
        response = {
            "success": True,
            "results": results
        }
        
        # Include generated SQL if natural language was used
        if generated_sql:
            response["generated_sql"] = generated_sql
            
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute query: {str(e)}"
        )