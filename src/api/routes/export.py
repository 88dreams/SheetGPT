from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Any, Optional
from uuid import UUID
from pydantic import BaseModel

from src.services.export.sheets_service import GoogleSheetsService
from src.services.export.template_service import SheetTemplate
from src.utils.database import get_db
from src.utils.security import get_current_user_id
from src.config.sheets_config import GoogleSheetsConfig
from src.services.data_management import DataManagementService

# Add these new model classes at the top
class SpreadsheetCreate(BaseModel):
    """Schema for creating a new spreadsheet."""
    title: str
    template_name: Optional[str] = "default"
    data: Optional[List[List[Any]]] = None
    data_id: Optional[UUID] = None

class SpreadsheetUpdate(BaseModel):
    """Schema for updating spreadsheet data."""
    range: str
    values: List[List[Any]]

class TemplateCreate(BaseModel):
    """Schema for creating a new template."""
    name: str
    header: Dict[str, Any]
    body: Dict[str, Any]
    alternateRow: Optional[Dict[str, Any]] = None

class TemplateApply(BaseModel):
    """Schema for applying a template to a spreadsheet."""
    template_name: str
    data_range: Optional[str] = None

router = APIRouter()
sheets_config = GoogleSheetsConfig()
sheets_service = GoogleSheetsService()
template_service = SheetTemplate()

@router.get("/auth/google")
async def google_auth(request: Request):
    """Start Google OAuth flow."""
    try:
        # Create the authorization URL
        auth_url = sheets_service.create_authorization_url(
            credentials_path=sheets_config.CREDENTIALS_PATH,
            redirect_uri=str(request.url_for('google_auth_callback'))
        )
        # Redirect to Google's authorization page
        return RedirectResponse(url=auth_url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create authorization URL: {str(e)}"
        )

@router.get("/auth/callback")
async def google_auth_callback(
    code: str,
    error: str = None,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """Handle Google OAuth callback."""
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authorization failed: {error}"
        )

    try:
        # Process the OAuth callback
        await sheets_service.process_oauth_callback(
            code=code,
            token_path=sheets_config.TOKEN_PATH
        )
        return {"status": "success", "message": "Google Sheets authorization successful"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process authorization: {str(e)}"
        )

@router.get("/auth/status")
async def check_auth_status() -> Dict[str, bool]:
    """Check if Google Sheets is authorized."""
    try:
        is_authorized = await sheets_service.initialize_from_token(
            token_path=sheets_config.TOKEN_PATH
        )
        return {"authenticated": is_authorized}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check authorization status: {str(e)}"
        )

@router.get("/preview/{data_id}")
async def get_export_preview(
    data_id: UUID,
    template_name: str = "default",
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get preview of data export with selected template."""
    try:
        # Get data and columns
        data_service = DataManagementService(db)
        data = await data_service.get_data_by_id(data_id, user_id)
        columns = await data_service.get_columns(data_id, user_id)

        print(f"DEBUG: Export preview for data_id {data_id}")
        print(f"DEBUG: Data structure: {data.data}")
        print(f"DEBUG: Columns: {columns}")

        # Get active columns in correct order
        active_columns = sorted(
            [col for col in columns if col.is_active],
            key=lambda x: x.order
        )

        print(f"DEBUG: Active columns: {active_columns}")

        # Get column names
        column_names = [col.name for col in active_columns]

        print(f"DEBUG: Column names: {column_names}")

        # Get sample data (first 5 rows)
        sample_data = []
        raw_data = data.data.get("rows", [])
        
        print(f"DEBUG: Raw data type: {type(raw_data)}")
        print(f"DEBUG: Raw data length: {len(raw_data)}")
        print(f"DEBUG: Raw data sample: {raw_data[:2] if raw_data else 'empty'}")

        # Handle different data structures
        if raw_data and isinstance(raw_data, list):
            # If raw_data is a list of dictionaries (objects)
            if raw_data and isinstance(raw_data[0], dict):
                for row in raw_data[:5]:
                    sample_row = []
                    for col in active_columns:
                        sample_row.append(row.get(col.name, ""))
                    sample_data.append(sample_row)
            # If raw_data is a list of lists (2D array)
            elif raw_data and isinstance(raw_data[0], list):
                for row in raw_data[:5]:
                    sample_row = []
                    for i, col in enumerate(active_columns):
                        if i < len(row):
                            sample_row.append(row[i])
                        else:
                            sample_row.append("")
                    sample_data.append(sample_row)

        print(f"DEBUG: Sample data: {sample_data}")

        return {
            "columns": column_names,
            "sampleData": sample_data
        }
    except Exception as e:
        print(f"DEBUG: Error in export preview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/sheets", response_model=Dict[str, Any])
async def create_spreadsheet(
    data: SpreadsheetCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create a new spreadsheet with structured data."""
    try:
        # If data_id is provided, fetch and format the data
        if data.data_id:
            print(f"DEBUG: Creating spreadsheet for data_id {data.data_id}")
            
            data_service = DataManagementService(db)
            structured_data = await data_service.get_data_by_id(data.data_id, user_id)
            columns = await data_service.get_columns(data.data_id, user_id)

            print(f"DEBUG: Structured data: {structured_data.data}")
            print(f"DEBUG: Columns: {columns}")

            # Get active columns in correct order
            active_columns = sorted(
                [col for col in columns if col.is_active],
                key=lambda x: x.order
            )

            print(f"DEBUG: Active columns: {active_columns}")

            # Prepare data for export
            column_names = [col.name for col in active_columns]
            rows = structured_data.data.get("rows", [])
            
            print(f"DEBUG: Column names: {column_names}")
            print(f"DEBUG: Rows type: {type(rows)}")
            print(f"DEBUG: Rows length: {len(rows)}")
            print(f"DEBUG: Rows sample: {rows[:2] if rows else 'empty'}")

            export_data = [column_names]
            
            # Handle different data structures
            if rows and isinstance(rows, list):
                # If rows is a list of dictionaries (objects)
                if rows and isinstance(rows[0], dict):
                    for row in rows:
                        export_row = []
                        for col in active_columns:
                            export_row.append(row.get(col.name, ""))
                        export_data.append(export_row)
                # If rows is a list of lists (2D array)
                elif rows and isinstance(rows[0], list):
                    for row in rows:
                        export_row = []
                        for i, col in enumerate(active_columns):
                            if i < len(row):
                                export_row.append(row[i])
                            else:
                                export_row.append("")
                        export_data.append(export_row)
            
            print(f"DEBUG: Export data: {export_data}")
        else:
            export_data = data.data
            print(f"DEBUG: Using provided data: {export_data}")

        # Create spreadsheet with template
        try:
            print(f"DEBUG: Initializing sheets service from token")
            is_authorized = await sheets_service.initialize_from_token(sheets_config.TOKEN_PATH)
            if not is_authorized:
                print(f"DEBUG: Not authorized with Google Sheets")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authorized with Google Sheets. Please authenticate first."
                )
            
            print(f"DEBUG: Creating spreadsheet with template: {data.template_name}")
            print(f"DEBUG: Title: {data.title or 'Exported Data'}")
            print(f"DEBUG: Export data length: {len(export_data) if export_data else 0}")
            
            result = await sheets_service.create_spreadsheet_with_template(
                title=data.title or "Exported Data",
                template_name=data.template_name,
                data=export_data
            )

            print(f"DEBUG: Spreadsheet creation result: {result}")
            return {
                "spreadsheetId": result.get("spreadsheet_id"),
                "spreadsheetUrl": result.get("spreadsheetUrl", "")
            }
        except Exception as sheet_error:
            print(f"DEBUG: Error in sheets service: {str(sheet_error)}")
            print(f"DEBUG: Error type: {type(sheet_error)}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            raise
    except Exception as e:
        print(f"DEBUG: Error creating spreadsheet: {str(e)}")
        print(f"DEBUG: Error type: {type(e)}")
        import traceback
        print(f"DEBUG: Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/sheets/{spreadsheet_id}/template", response_model=Dict[str, Any])
async def apply_template(
    spreadsheet_id: str,
    data: TemplateApply,
    user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """Apply a template to an existing spreadsheet."""
    try:
        result = await sheets_service.apply_template_to_existing(
            spreadsheet_id=spreadsheet_id,
            template_name=data.template_name,
            data_range=data.data_range
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/templates", response_model=List[str])
async def list_templates(
    user_id: UUID = Depends(get_current_user_id)
) -> List[str]:
    """List all available templates."""
    try:
        return await template_service.list_templates()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/templates", response_model=Dict[str, str])
async def create_template(
    template: TemplateCreate,
    user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, str]:
    """Create a new template."""
    try:
        template_data = {
            "header": template.header,
            "body": template.body,
            "alternateRow": template.alternateRow
        }
        await template_service.create_template(template.name, template_data)
        return {
            "status": "success",
            "message": f"Template '{template.name}' created successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/sheets/{spreadsheet_id}")
async def update_spreadsheet(
    spreadsheet_id: str,
    update_data: SpreadsheetUpdate
) -> Dict[str, str]:
    """Update values in a spreadsheet."""
    try:
        # Initialize from saved token
        is_authorized = await sheets_service.initialize_from_token(sheets_config.TOKEN_PATH)
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authorized with Google Sheets. Please authenticate first."
            )
        
        # Update the spreadsheet
        result = await sheets_service.update_values(
            spreadsheet_id=spreadsheet_id,
            range_name=update_data.range,
            values=update_data.values
        )
        return {
            "status": "success",
            "message": f"Updated {result.get('updatedCells', 0)} cells"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update spreadsheet: {str(e)}"
        )

@router.get("/sheets/{spreadsheet_id}/values/{range}")
async def get_spreadsheet_values(
    spreadsheet_id: str,
    range: str
) -> Dict[str, Any]:
    """Get values from a spreadsheet range."""
    try:
        # Initialize from saved token
        is_authorized = await sheets_service.initialize_from_token(sheets_config.TOKEN_PATH)
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authorized with Google Sheets. Please authenticate first."
            )
        
        # Get the values
        values = await sheets_service.get_values(
            spreadsheet_id=spreadsheet_id,
            range_name=range
        )
        return {
            "status": "success",
            "values": values
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read spreadsheet: {str(e)}"
        ) 