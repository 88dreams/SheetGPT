from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
import csv
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import ApiSuccess
from src.services.database_management import DatabaseManagementService
from src.utils.database import get_db
from src.utils.security import get_current_user_id, get_current_admin_user

# Set up logging
logger = logging.getLogger("db_management")

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
    service = DatabaseManagementService(db)
    
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
    service = DatabaseManagementService(db)
    
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