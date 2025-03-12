from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from uuid import UUID

# This comment was added to test hot reloading
from src.utils.database import get_db
from src.utils.security import get_current_user_id
from src.services.data_management import DataManagementService
from src.schemas.data_management import (
    StructuredDataCreate,
    StructuredDataUpdate,
    StructuredDataResponse,
    ColumnCreate,
    ColumnUpdate,
    ColumnResponse,
    DataUpdate,
    DataChangeHistoryResponse
)

router = APIRouter()

@router.get("/by-message/{message_id}", response_model=Dict[str, Any])
async def get_structured_data_by_message(
    message_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get structured data by message ID."""
    service = DataManagementService(db)
    data = await service.get_data_by_message_id(message_id, current_user_id)
    
    # Convert to dictionary and ensure proper format
    response = data.model_dump()
    
    # Ensure UUID fields are strings for JSON serialization
    response["id"] = str(response["id"])
    response["conversation_id"] = str(response["conversation_id"])
    
    # Ensure columns are properly formatted
    for col in response.get("columns", []):
        if "id" in col:
            col["id"] = str(col["id"])
        if "structured_data_id" in col:
            col["structured_data_id"] = str(col["structured_data_id"])
    
    # Ensure data has expected structure
    if "data" in response and isinstance(response["data"], dict) and "rows" in response["data"]:
        if "column_order" not in response["data"]:
            # Add column_order if missing (frontend expects this)
            headers = []
            if response["data"]["rows"] and isinstance(response["data"]["rows"][0], dict):
                headers = list(response["data"]["rows"][0].keys())
            response["data"]["column_order"] = headers
    
    return response

@router.get("", response_model=List[Dict[str, Any]])
async def list_structured_data(
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get all structured data for the current user."""
    service = DataManagementService(db)
    data_list = await service.get_all_data(current_user_id)
    
    # Convert each item to dictionary and ensure proper format
    response_list = []
    for item in data_list:
        response = item.model_dump()
        
        # Ensure UUID fields are strings
        response["id"] = str(response["id"])
        response["conversation_id"] = str(response["conversation_id"])
        
        # Ensure columns are properly formatted
        for col in response.get("columns", []):
            if "id" in col:
                col["id"] = str(col["id"])
            if "structured_data_id" in col:
                col["structured_data_id"] = str(col["structured_data_id"])
        
        # Ensure data has expected structure
        if "data" in response and isinstance(response["data"], dict) and "rows" in response["data"]:
            if "column_order" not in response["data"]:
                headers = []
                if response["data"]["rows"] and isinstance(response["data"]["rows"][0], dict):
                    headers = list(response["data"]["rows"][0].keys())
                response["data"]["column_order"] = headers
        
        response_list.append(response)
    
    return response_list

@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_structured_data(
    data: StructuredDataCreate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create new structured data."""
    service = DataManagementService(db)
    result = await service.create_structured_data(data, current_user_id)
    
    # Extract relevant fields to dictionary
    response = {
        "id": str(result.id),
        "conversation_id": str(result.conversation_id),
        "data_type": result.data_type,
        "schema_version": result.schema_version,
        "data": result.data,
        "meta_data": result.meta_data,
        "created_at": result.created_at.isoformat() if result.created_at else None,
        "updated_at": result.updated_at.isoformat() if result.updated_at else None,
        "columns": []  # Initially empty, columns will be added later
    }
    
    # Ensure the data field has the expected structure for frontend
    if "rows" in result.data and isinstance(result.data["rows"], list):
        data_with_columns = {
            "column_order": result.data.get("column_order", []),
            "rows": result.data["rows"]
        }
        response["data"] = data_with_columns
    
    return response

@router.get("/{data_id}", response_model=Dict[str, Any])
async def get_structured_data(
    data_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get structured data by ID."""
    service = DataManagementService(db)
    data = await service.get_data_by_id(data_id, current_user_id)
    
    # Convert to dictionary and ensure proper format
    response = data.model_dump()
    
    # Ensure UUID fields are strings
    response["id"] = str(response["id"])
    response["conversation_id"] = str(response["conversation_id"])
    
    # Ensure columns are properly formatted
    for col in response.get("columns", []):
        if "id" in col:
            col["id"] = str(col["id"])
        if "structured_data_id" in col:
            col["structured_data_id"] = str(col["structured_data_id"])
    
    # Ensure data has expected structure
    if "data" in response and isinstance(response["data"], dict) and "rows" in response["data"]:
        if "column_order" not in response["data"]:
            headers = []
            if response["data"]["rows"] and isinstance(response["data"]["rows"][0], dict):
                headers = list(response["data"]["rows"][0].keys())
            response["data"]["column_order"] = headers
    
    return response

@router.put("/{data_id}", response_model=Dict[str, Any])
async def update_structured_data(
    data_id: UUID,
    data: StructuredDataUpdate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update structured data."""
    service = DataManagementService(db)
    updated_data = await service.update_structured_data(data_id, current_user_id, data)
    
    # Build response dictionary manually to avoid SQLAlchemy relationship serialization issues
    response = {
        "id": str(updated_data.id),
        "conversation_id": str(updated_data.conversation_id),
        "data_type": updated_data.data_type,
        "schema_version": updated_data.schema_version,
        "data": updated_data.data,
        "meta_data": updated_data.meta_data,
        "created_at": updated_data.created_at.isoformat() if updated_data.created_at else None,
        "updated_at": updated_data.updated_at.isoformat() if updated_data.updated_at else None,
        "columns": []
    }
    
    # Add columns if available
    if hasattr(updated_data, 'columns'):
        response["columns"] = [
            {
                "id": str(col.id),
                "structured_data_id": str(col.structured_data_id),
                "name": col.name,
                "data_type": col.data_type,
                "format": col.format,
                "formula": col.formula,
                "order": col.order,
                "is_active": col.is_active,
                "meta_data": col.meta_data
            }
            for col in updated_data.columns
        ]
    
    # Ensure data has expected structure
    if "data" in response and isinstance(response["data"], dict) and "rows" in response["data"]:
        if "column_order" not in response["data"]:
            headers = []
            if response["data"]["rows"] and isinstance(response["data"]["rows"][0], dict):
                headers = list(response["data"]["rows"][0].keys())
            response["data"]["column_order"] = headers
    
    return response

@router.delete("/{data_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_structured_data(
    data_id: UUID,
    soft_delete: bool = True,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete structured data."""
    service = DataManagementService(db)
    await service.delete_structured_data(data_id, current_user_id, soft_delete)

@router.get("/{data_id}/columns", response_model=List[ColumnResponse])
async def list_columns(
    data_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> List[ColumnResponse]:
    """Get all columns for structured data."""
    service = DataManagementService(db)
    return await service.get_columns(data_id, current_user_id)

@router.post("/{data_id}/columns", response_model=ColumnResponse, status_code=status.HTTP_201_CREATED)
async def create_column(
    data_id: UUID,
    column: ColumnCreate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> ColumnResponse:
    """Create a new column."""
    service = DataManagementService(db)
    return await service.create_column(data_id, current_user_id, column)

@router.put("/{data_id}/columns/{column_name}", response_model=ColumnResponse)
async def update_column(
    data_id: UUID,
    column_name: str,
    column: ColumnUpdate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> ColumnResponse:
    """Update a column."""
    service = DataManagementService(db)
    return await service.update_column(data_id, column_name, current_user_id, column)

@router.delete("/{data_id}/columns/{column_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_column(
    data_id: UUID,
    column_name: str,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete a column."""
    service = DataManagementService(db)
    await service.delete_column(data_id, column_name, current_user_id)

@router.put("/{data_id}/cells", response_model=Dict[str, Any])
async def update_cell(
    data_id: UUID,
    update: DataUpdate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update a cell value."""
    service = DataManagementService(db)
    return await service.update_cell(
        data_id,
        current_user_id,
        update.column_name,
        update.row_index,
        update.value
    )

@router.get("/{data_id}/history", response_model=List[DataChangeHistoryResponse])
async def get_change_history(
    data_id: UUID,
    limit: int = 50,
    offset: int = 0,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> List[DataChangeHistoryResponse]:
    """Get change history for structured data."""
    service = DataManagementService(db)
    return await service.get_change_history(data_id, current_user_id, limit, offset)

@router.post("/{data_id}/export", status_code=status.HTTP_202_ACCEPTED)
async def export_data(
    data_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """Export structured data to Google Sheets."""
    # This will be implemented in the export service
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Export functionality coming soon"
    )

@router.get("/{data_id}/rows", response_model=Dict[str, Any])
async def get_rows(
    data_id: UUID,
    skip: int = 0,
    limit: int = 50,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get rows for structured data with pagination."""
    service = DataManagementService(db)
    return await service.get_rows(data_id, current_user_id, skip, limit)

@router.post("/{data_id}/rows", response_model=Dict[str, Any])
async def add_row(
    data_id: UUID,
    row_data: Dict[str, Any],
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Add a new row to structured data."""
    service = DataManagementService(db)
    return await service.add_row(data_id, current_user_id, row_data)

@router.put("/{data_id}/rows/{row_index}", response_model=Dict[str, Any])
async def update_row(
    data_id: UUID,
    row_index: int,
    row_data: Dict[str, Any],
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update a row in structured data."""
    service = DataManagementService(db)
    return await service.update_row(data_id, current_user_id, row_index, row_data)

@router.delete("/{data_id}/rows/{row_index}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_row(
    data_id: UUID,
    row_index: int,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete a row from structured data."""
    service = DataManagementService(db)
    await service.delete_row(data_id, current_user_id, row_index) 