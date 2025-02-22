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

@router.get("/by-message/{message_id}", response_model=StructuredDataResponse)
async def get_structured_data_by_message(
    message_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> StructuredDataResponse:
    """Get structured data by message ID."""
    service = DataManagementService(db)
    return await service.get_data_by_message_id(message_id, current_user_id)

@router.get("", response_model=List[StructuredDataResponse])
async def list_structured_data(
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> List[StructuredDataResponse]:
    """Get all structured data for the current user."""
    service = DataManagementService(db)
    return await service.get_all_data(current_user_id)

@router.post("", response_model=StructuredDataResponse, status_code=status.HTTP_201_CREATED)
async def create_structured_data(
    data: StructuredDataCreate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> StructuredDataResponse:
    """Create new structured data."""
    service = DataManagementService(db)
    return await service.create_structured_data(data, current_user_id)

@router.get("/{data_id}", response_model=StructuredDataResponse)
async def get_structured_data(
    data_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> StructuredDataResponse:
    """Get structured data by ID."""
    service = DataManagementService(db)
    return await service.get_data_by_id(data_id, current_user_id)

@router.put("/{data_id}", response_model=StructuredDataResponse)
async def update_structured_data(
    data_id: UUID,
    data: StructuredDataUpdate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> StructuredDataResponse:
    """Update structured data."""
    service = DataManagementService(db)
    return await service.update_structured_data(data_id, current_user_id, data)

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