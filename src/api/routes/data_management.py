from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from uuid import UUID

# This comment was added to test hot reloading
from src.utils.database import get_db
from src.utils.security import get_current_user_id
from src.services.data_management import DataManagementService
from src.schemas.data_management import (
    ColumnCreate,
    ColumnUpdate,
    RowOperation,
    DataUpdate
)

router = APIRouter(prefix="/data", tags=["Data Management"])

@router.post("/{structured_data_id}/columns", status_code=status.HTTP_201_CREATED)
async def add_column(
    structured_data_id: UUID,
    column_data: ColumnCreate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Add a new column to structured data."""
    service = DataManagementService(db)
    try:
        result = await service.add_column(
            structured_data_id=structured_data_id,
            user_id=current_user_id,
            column_data=column_data
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{structured_data_id}/columns/{column_name}")
async def update_column(
    structured_data_id: UUID,
    column_name: str,
    column_data: ColumnUpdate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update an existing column."""
    service = DataManagementService(db)
    try:
        result = await service.update_column(
            structured_data_id=structured_data_id,
            user_id=current_user_id,
            column_name=column_name,
            column_data=column_data
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{structured_data_id}/columns/{column_name}")
async def delete_column(
    structured_data_id: UUID,
    column_name: str,
    keep_history: bool = True,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """Delete a column."""
    service = DataManagementService(db)
    try:
        await service.delete_column(
            structured_data_id=structured_data_id,
            user_id=current_user_id,
            column_name=column_name,
            keep_history=keep_history
        )
        return {"status": "success", "message": f"Column '{column_name}' deleted"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{structured_data_id}/rows")
async def add_row(
    structured_data_id: UUID,
    row_data: RowOperation,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Add a new row of data."""
    service = DataManagementService(db)
    try:
        result = await service.add_row(
            structured_data_id=structured_data_id,
            user_id=current_user_id,
            row_data=row_data.data
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{structured_data_id}/rows/{row_index}")
async def delete_row(
    structured_data_id: UUID,
    row_index: int,
    keep_history: bool = True,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """Delete a row."""
    service = DataManagementService(db)
    try:
        await service.delete_row(
            structured_data_id=structured_data_id,
            user_id=current_user_id,
            row_index=row_index,
            keep_history=keep_history
        )
        return {"status": "success", "message": f"Row {row_index} deleted"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{structured_data_id}/cells")
async def update_cell(
    structured_data_id: UUID,
    update_data: DataUpdate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update a single cell value."""
    service = DataManagementService(db)
    try:
        result = await service.update_cell(
            structured_data_id=structured_data_id,
            user_id=current_user_id,
            column_name=update_data.column_name,
            row_index=update_data.row_index,
            value=update_data.value
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{structured_data_id}/history")
async def get_change_history(
    structured_data_id: UUID,
    limit: int = 10,
    offset: int = 0,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get change history for structured data."""
    service = DataManagementService(db)
    try:
        history = await service.get_history(
            structured_data_id=structured_data_id,
            limit=limit,
            offset=offset
        )
        return history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{structured_data_id}/revert/{change_id}")
async def revert_change(
    structured_data_id: UUID,
    change_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Revert a specific change."""
    service = DataManagementService(db)
    try:
        result = await service.revert_change(
            structured_data_id=structured_data_id,
            user_id=current_user_id,
            change_id=change_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) 