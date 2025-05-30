from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
import csv
import os
import sys
from pathlib import Path
from datetime import datetime
from io import StringIO
from pydantic import BaseModel, Field
import re # For parsing the markdown

from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.common import ApiSuccess
from src.services.anthropic_service import AnthropicService
from src.services.query_service import QueryService
from src.services.ai_query_processor import AnthropicAIProcessor
from src.utils.database import get_db
from src.utils.security import get_current_user_id, get_current_admin_user
from src.services.database_admin_service import DatabaseAdminService
from src.services.statistics_service import StatisticsService
from src.services.export_service import ExportService

# Set up logging
logger = logging.getLogger("db_management")

router = APIRouter()

# Create a shared AnthropicService instance
anthropic_service = AnthropicService()

# --- Pydantic Models for Schema Summary ---
class SchemaColumn(BaseModel):
    name: str
    dataType: Optional[str] = None # Example: VARCHAR, UUID, TIMESTAMP
    description: Optional[str] = None
    isFilterable: bool = False # Placeholder, logic to determine this can be added
    isRelationalId: bool = False # Placeholder
    relatedTable: Optional[str] = None # Placeholder

class SchemaTable(BaseModel):
    name: str
    description: Optional[str] = None
    columns: List[SchemaColumn] = []
    # relationships: Optional[List[str]] = None # Could add parsed relationships later

class SchemaSummaryResponse(BaseModel):
    tables: List[SchemaTable]

# --- Helper to Parse the Markdown Schema --- 
# (This will be a simplified parser for now)
_SCHEMA_MD_FILE_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "database_schema_for_ai.md"

def parse_schema_markdown_for_summary(md_content: str) -> SchemaSummaryResponse:
    tables_data: List[SchemaTable] = []
    current_table_name: Optional[str] = None
    current_table_description: Optional[str] = None
    current_columns: List[SchemaColumn] = []

    # Regex to find table names more reliably
    table_regex = re.compile(r"^\*\*Table: `([^`]+)`\*\*$", re.MULTILINE)
    # Regex for column lines, trying to capture name and optionally type
    column_regex = re.compile(r"^\s*\*\s*`([^`]+)`\s*\(([^)]+)\):\s*(.*)$") # name (TYPE, PK/FK): Description
    column_simple_regex = re.compile(r"^\s*\*\s*`([^`]+)`.*$") # Basic column name capture
    description_regex = re.compile(r"^\* Description:\s*(.*)$")

    lines = md_content.splitlines()
    for i, line in enumerate(lines):
        table_match = table_regex.match(line)
        if table_match:
            if current_table_name: # Save previous table
                tables_data.append(SchemaTable(name=current_table_name, description=current_table_description, columns=current_columns))
            
            current_table_name = table_match.group(1)
            current_table_description = None # Reset for new table
            current_columns = []
            # Check next lines for description
            if i + 1 < len(lines):
                desc_match = description_regex.match(lines[i+1])
                if desc_match:
                    current_table_description = desc_match.group(1).strip()
            continue

        if current_table_name: # Only process lines if we are inside a table block
            if line.strip().lower() == "* columns:": # Column section started
                continue
            
            col_match = column_regex.match(line)
            if col_match:
                col_name = col_match.group(1)
                col_type_details = col_match.group(2)
                col_desc = col_match.group(3).strip()
                # Extract primary type from details like "UUID, PK" or "VARCHAR, NULLABLE"
                col_type = col_type_details.split(',')[0].strip()
                current_columns.append(SchemaColumn(name=col_name, dataType=col_type, description=col_desc))
            else:
                simple_col_match = column_simple_regex.match(line)
                if simple_col_match and line.strip().lower() != "* columns:": # ensure it's a column line not the header
                    # Fallback for simpler column lines if detailed regex fails
                    # This might happen if the format in MD isn't perfectly consistent
                    col_name = simple_col_match.group(1)
                    # Try to find description on the same line after potential type info
                    desc_part = line.split(':', 1)[-1].strip() if ':' in line else None
                    current_columns.append(SchemaColumn(name=col_name, description=desc_part or None))
    
    if current_table_name: # Save the last table
        tables_data.append(SchemaTable(name=current_table_name, description=current_table_description, columns=current_columns))

    return SchemaSummaryResponse(tables=tables_data)

# --- Endpoint --- 
@router.get("/schema-summary", response_model=SchemaSummaryResponse)
async def get_schema_summary_route() -> SchemaSummaryResponse:
    """Returns a structured summary of the database schema, parsed from the AI context file."""
    if not _SCHEMA_MD_FILE_PATH.exists():
        logger.error(f"Schema MD file not found at {_SCHEMA_MD_FILE_PATH} for summary endpoint.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schema description file not found.")
    try:
        with open(_SCHEMA_MD_FILE_PATH, 'r', encoding='utf-8') as f:
            md_content = f.read()
        
        schema_summary = parse_schema_markdown_for_summary(md_content)
        if not schema_summary.tables:
            logger.warning(f"Schema MD file at {_SCHEMA_MD_FILE_PATH} was parsed but yielded no tables.")
            # Optionally raise an error or return empty if this is unexpected

        return schema_summary
    except Exception as e:
        logger.error(f"Failed to read or parse schema MD file for summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process schema information.")

@router.get("/stats", response_model=dict)
async def get_database_statistics_route(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    stats_service = StatisticsService(db)
    try:
        stats = await stats_service.get_database_statistics()
        return stats
    except Exception as e:
        logger.error(f"Error getting database statistics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get database statistics: {str(e)}")

@router.post("/backups", response_model=Dict[str, Any])
async def create_database_backup_route(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    admin_service = DatabaseAdminService(db)
    try:
        backup_path = await admin_service.backup_database()
        backup_filename = os.path.basename(backup_path)
        backup_id = backup_filename.replace("backup_", "").replace(".sql", "")
        return {
            "success": True,
            "message": "Database backup created successfully",
            "backup_id": backup_id,
            "filename": backup_filename
        }
    except Exception as e:
        logger.error(f"Error creating backup: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create backup: {str(e)}")

@router.get("/backups", response_model=List[dict])
async def list_database_backups_route(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> List[dict]:
    admin_service = DatabaseAdminService(db)
    try:
        backups = admin_service.list_backups()
        return backups
    except Exception as e:
        logger.error(f"Error listing backups: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to list backups: {str(e)}")

@router.get("/backups/{backup_id}/download", response_class=Response)
async def download_database_backup_route(
    backup_id: str,
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Response:
    admin_service = DatabaseAdminService(db)
    try:
        backups = admin_service.list_backups()
        backup_info = None
        for b_info in backups:
            if b_info["filename"].startswith(f"backup_{backup_id}"):
                backup_info = b_info
                break
        
        if not backup_info:
             # Check /tmp directly as a fallback, consistent with DatabaseAdminService logic
            backup_path_str = f"/tmp/sheetgpt_backups/backup_{backup_id}.sql"
            if os.path.exists(backup_path_str):
                backup_file_path = Path(backup_path_str)
                stats = backup_file_path.stat()
                backup_info = {
                    "filename": backup_file_path.name,
                    "path": str(backup_file_path),
                    "created_at": datetime.fromtimestamp(stats.st_ctime).isoformat(),
                    "size_bytes": stats.st_size
                }
            else:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Backup with ID {backup_id} not found")

        backup_file_path_to_read = backup_info["path"]
        if not os.path.exists(backup_file_path_to_read):
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Backup file path {backup_file_path_to_read} not found.")

        with open(backup_file_path_to_read, "rb") as file:
            backup_content = file.read()
        
        return Response(
            content=backup_content,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={backup_info['filename']}",
                "Content-Length": str(backup_info["size_bytes"])
            }
        )
    except HTTPException: # Re-raise HTTP exceptions directly
        raise
    except Exception as e:
        logger.error(f"Error downloading backup {backup_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to download backup: {str(e)}")

@router.post("/migrations/apply", response_model=Dict[str, Any])
async def apply_database_migrations_route(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Apply database migrations using Alembic (upgrade head)."""
    admin_service = DatabaseAdminService(db)
    try:
        result = await admin_service.run_migrations()
        return result
    except Exception as e:
        logger.error(f"Error applying migrations via API: {str(e)}", exc_info=True)
        # The service layer already logs details and updates maintenance status for failure.
        # Here, we just translate to an HTTP response.
        error_detail = f"Failed to apply migrations: {str(e)}"
        # Check if it's an exception from the service with a more specific message
        if hasattr(e, 'message') and isinstance(e.message, str):
            error_detail = e.message 
        elif hasattr(e, 'detail') and isinstance(e.detail, str): # For HTTPExceptions re-raised
            error_detail = e.detail

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=error_detail
        )

@router.get("/maintenance/status", response_model=Dict[str, Any])
async def get_maintenance_status_route(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    admin_service = DatabaseAdminService(db)
    try:
        status_data = await admin_service.get_maintenance_status()
        return status_data
    except Exception as e:
        logger.error(f"Error getting maintenance status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get maintenance status: {str(e)}")

@router.get("/cleanup/dry-run", response_model=Dict[str, Any])
async def run_cleanup_dry_run_route(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    admin_service = DatabaseAdminService(db)
    try:
        results = await admin_service.run_cleanup_dry_run()
        return results
    except Exception as e:
        logger.error(f"Error running cleanup dry run: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to run cleanup dry run: {str(e)}")

@router.post("/cleanup", response_model=Dict[str, Any])
async def run_cleanup_route(
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    admin_service = DatabaseAdminService(db)
    try:
        results = await admin_service.run_cleanup()
        return results
    except Exception as e:
        logger.error(f"Error running cleanup: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to run cleanup: {str(e)}")

@router.post("/vacuum", response_model=Dict[str, Any])
async def run_vacuum_route(
    skip_reindex: bool = False,
    _: UUID = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    admin_service = DatabaseAdminService(db)
    try:
        results = await admin_service.run_vacuum(skip_reindex=skip_reindex)
        return results
    except Exception as e:
        logger.error(f"Error running vacuum: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to run vacuum: {str(e)}")

@router.post("/export", response_model=Dict[str, Any])
async def export_data_route(
    export_data: Dict[str, Any],
    current_user_id: UUID = Depends(get_current_user_id),
    # db: AsyncSession = Depends(get_db) # db session might not be needed if export service handles everything
) -> Dict[str, Any]:
    """Export provided data directly to CSV (file) or Google Sheets."""
    
    # Instantiate ExportService (potentially requires GoogleSheetsService dependency later)
    export_service = ExportService()
    
    try:
        data = export_data.get("data", [])
        format = export_data.get("format", "csv")
        title = export_data.get("title", "Exported Data")
        
        if not data:
            raise ValueError("No data provided for export")

        if format == "csv":
            # Generate a filename prefix
            filename_prefix = title.replace(' ', '_').lower()
            # Call the service to create a temporary file
            temp_file_path = await export_service.export_data_to_csv_file(data, filename_prefix)
            
            # Construct a relative URL or identifier for the frontend to use for download
            # This part depends on how files are served. A simple approach is just returning the filename.
            # A better approach might involve a separate /download/{filename} endpoint.
            # For now, let's return the filename, assuming a download mechanism exists or will be built.
            csv_filename = os.path.basename(temp_file_path)
            # The frontend would then likely call a dedicated download endpoint with this filename.
            return {
                "success": True,
                "format": "csv",
                "filename": csv_filename, # Provide filename for client-side download trigger
                "message": f"CSV file {csv_filename} is ready for download."
                # "url": f"/api/v1/downloads/{csv_filename}" # Example if a download route exists
            }
        elif format == "sheets":
            sheet_info = await export_service.export_data_to_sheets(data, title)
            # Assuming export_data_to_sheets returns required info like url and id when implemented
            return {
                "success": True,
                "format": "sheets",
                "url": sheet_info.get("spreadsheetUrl"), # Using original key name based on guess
                "id": sheet_info.get("spreadsheet_id"),
                "title": sheet_info.get("title")
            }
        else:
            raise ValueError(f"Unsupported export format: {format}")
            
    except NotImplementedError as e:
         logger.error(f"Export failed for format {format}: {str(e)}", exc_info=True)
         raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error during export: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Export failed: {str(e)}")

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
    logger.info(f"[DB_MGMT_ROUTE] Received query_data: {query_data}")
    # Instantiate the new services
    ai_processor = AnthropicAIProcessor(anthropic_service)
    query_service = QueryService(db, ai_processor)
    
    try:
        is_natural_language = query_data.get("natural_language", False)
        query_text = query_data.get("query", "")
        translate_only = query_data.get("translate_only", False)

        if not query_text:
            raise ValueError("Query text is required")
            
        generated_sql: Optional[str] = None
        results: List[Dict[str, Any]] = []

        if is_natural_language:
            if translate_only:
                generated_sql = await query_service.translate_natural_language_to_sql(query_text)
                # results remain empty as per original logic
            else:
                results, generated_sql = await query_service.execute_natural_language_query(query_text)
        else: # Direct SQL
            is_valid, validated_sql, error_msg = await query_service.validate_sql_query(query_text)
            
            if not is_valid:
                return {
                    "success": False,
                    "error": "SQL validation failed",
                    "validation_error": error_msg,
                    "suggested_sql": validated_sql # This is the (potentially) corrected SQL by AI
                }
            results = await query_service.execute_safe_query(validated_sql)
            # If SQL was changed by validation, show it as generated_sql
            if validated_sql != query_text:
                generated_sql = validated_sql
            
        export_format = query_data.get("export_format")
        response_data: Dict[str, Any] = {"success": True, "results": results}
        if generated_sql:
            response_data["generated_sql"] = generated_sql

        if export_format:
            # NOTE: The export_query_results_to_sheets method was not migrated to QueryService yet in the plan.
            # For now, assume CSV export. Sheets export will need to be addressed when refactoring export logic.
            # The original DatabaseManagementService.export_query_results_to_sheets directly called a Google Sheets service.
            # This part will need careful handling when we create an ExportService or similar.
            if export_format == "csv":
                csv_content = await query_service.export_query_results_to_csv(results)
                # The original API returned a URL to a temporarily stored CSV, 
                # which QueryService.export_query_results_to_csv does not do (it returns content).
                # For now, we will adapt the response. This highlights a need to refine export later.
                response_data["export"] = {
                    "format": "csv",
                    "data": csv_content # Frontend will need to handle this data directly or API provides a download URL
                }
                # If frontend expects a URL, we might need a temporary file storage or adjust frontend.
                # The old code: csv_url = await service.export_query_results_to_csv(results) and then /api/v1{csv_url}
                # This implies service.export_query_results_to_csv stored a file and returned a path.
                # The new query_service.export_query_results_to_csv directly returns content.
                # This will be a breaking change for the frontend if it expects a URL for CSV.
                # For now, I will log a warning and return data. This should be revisited.
                logger.warning("CSV export in /query now returns direct data, not a URL. Frontend might need adjustment.")

            elif export_format == "sheets":
                # This part is problematic as export_query_results_to_sheets is not in QueryService
                # and involved Google Sheets specific logic from the original DatabaseManagementService.
                # For now, this path will be non-functional until ExportService is created.
                logger.error("Google Sheets export via /query endpoint is temporarily non-functional pending ExportService refactor.")
                # To prevent a crash, but signal issue:
                response_data["export"] = {
                    "format": "sheets",
                    "error": "Sheets export functionality is under refactoring."
                }
            else:
                raise ValueError(f"Unsupported export format: {export_format}")
        
        return response_data

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error executing query via /query endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute query: {str(e)}"
        )