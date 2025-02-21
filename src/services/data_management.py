from typing import Dict, Any, List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import StructuredData, DataColumn, DataChangeHistory
from src.schemas.data_management import ColumnCreate, ColumnUpdate

class DataManagementService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_structured_data(self, structured_data_id: UUID) -> StructuredData:
        """Get structured data by ID."""
        query = select(StructuredData).where(StructuredData.id == structured_data_id)
        result = await self.db.execute(query)
        data = result.scalar_one_or_none()
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Structured data not found"
            )
        return data

    async def _record_change(
        self,
        structured_data_id: UUID,
        user_id: UUID,
        change_type: str,
        column_name: Optional[str] = None,
        row_index: Optional[int] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        meta_data: Optional[Dict] = None
    ) -> None:
        """Record a change in the history."""
        change = DataChangeHistory(
            structured_data_id=structured_data_id,
            user_id=user_id,
            change_type=change_type,
            column_name=column_name,
            row_index=row_index,
            old_value=old_value,
            new_value=new_value,
            meta_data=meta_data or {}
        )
        self.db.add(change)
        await self.db.commit()

    async def add_column(
        self,
        structured_data_id: UUID,
        user_id: UUID,
        column_data: ColumnCreate
    ) -> Dict[str, Any]:
        """Add a new column to structured data."""
        # Get structured data
        structured_data = await self._get_structured_data(structured_data_id)

        # Check if column name already exists
        existing_columns = [col.name for col in structured_data.columns if col.is_active]
        if column_data.name in existing_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Column '{column_data.name}' already exists"
            )

        # Create new column
        column = DataColumn(
            structured_data_id=structured_data_id,
            name=column_data.name,
            data_type=column_data.data_type,
            format=column_data.format,
            formula=column_data.formula,
            order=column_data.order or len(existing_columns),
            is_active=True
        )
        self.db.add(column)

        # Update data structure
        data = structured_data.data
        if "rows" not in data:
            data["rows"] = []
        for row in data["rows"]:
            row[column_data.name] = None
        structured_data.data = data

        # Record change
        await self._record_change(
            structured_data_id=structured_data_id,
            user_id=user_id,
            change_type="ADD_COLUMN",
            column_name=column_data.name,
            meta_data=column_data.dict()
        )

        await self.db.commit()
        return {"status": "success", "column": column_data.dict()}

    async def update_column(
        self,
        structured_data_id: UUID,
        user_id: UUID,
        column_name: str,
        column_data: ColumnUpdate
    ) -> Dict[str, Any]:
        """Update an existing column."""
        # Get structured data
        structured_data = await self._get_structured_data(structured_data_id)

        # Find the column
        column = next(
            (col for col in structured_data.columns if col.name == column_name and col.is_active),
            None
        )
        if not column:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Column '{column_name}' not found"
            )

        # Store old values for history
        old_values = {
            "name": column.name,
            "data_type": column.data_type,
            "format": column.format,
            "formula": column.formula,
            "order": column.order
        }

        # Update column
        if column_data.name and column_data.name != column_name:
            # Update data structure if column is renamed
            data = structured_data.data
            for row in data["rows"]:
                row[column_data.name] = row.pop(column_name)
            structured_data.data = data
            column.name = column_data.name

        if column_data.data_type:
            column.data_type = column_data.data_type
        if column_data.format is not None:
            column.format = column_data.format
        if column_data.formula is not None:
            column.formula = column_data.formula
        if column_data.order is not None:
            column.order = column_data.order

        # Record change
        await self._record_change(
            structured_data_id=structured_data_id,
            user_id=user_id,
            change_type="UPDATE_COLUMN",
            column_name=column_name,
            old_value=str(old_values),
            new_value=str(column_data.dict(exclude_unset=True)),
            meta_data={"old": old_values, "new": column_data.dict(exclude_unset=True)}
        )

        await self.db.commit()
        return {"status": "success", "column": column_data.dict(exclude_unset=True)}

    async def delete_column(
        self,
        structured_data_id: UUID,
        user_id: UUID,
        column_name: str,
        keep_history: bool = True
    ) -> None:
        """Delete a column."""
        # Get structured data
        structured_data = await self._get_structured_data(structured_data_id)

        # Find the column
        column = next(
            (col for col in structured_data.columns if col.name == column_name and col.is_active),
            None
        )
        if not column:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Column '{column_name}' not found"
            )

        # Soft delete the column
        column.is_active = False

        if keep_history:
            # Keep the data in the structure but mark column as inactive
            data = structured_data.data
            column_data = {
                "name": column.name,
                "data_type": column.data_type,
                "format": column.format,
                "formula": column.formula,
                "order": column.order
            }
            # Record change
            await self._record_change(
                structured_data_id=structured_data_id,
                user_id=user_id,
                change_type="DELETE_COLUMN",
                column_name=column_name,
                meta_data=column_data
            )
        else:
            # Remove the column from the data structure
            data = structured_data.data
            for row in data["rows"]:
                row.pop(column_name, None)
            structured_data.data = data

        await self.db.commit()

    async def add_row(
        self,
        structured_data_id: UUID,
        user_id: UUID,
        row_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add a new row of data."""
        # Get structured data
        structured_data = await self._get_structured_data(structured_data_id)

        # Validate row data against columns
        active_columns = [col.name for col in structured_data.columns if col.is_active]
        invalid_columns = set(row_data.keys()) - set(active_columns)
        if invalid_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid columns: {invalid_columns}"
            )

        # Add missing columns with None values
        for col in active_columns:
            if col not in row_data:
                row_data[col] = None

        # Add row to data structure
        data = structured_data.data
        if "rows" not in data:
            data["rows"] = []
        row_index = len(data["rows"])
        data["rows"].append(row_data)
        structured_data.data = data

        # Record change
        await self._record_change(
            structured_data_id=structured_data_id,
            user_id=user_id,
            change_type="ADD_ROW",
            row_index=row_index,
            new_value=str(row_data),
            meta_data={"row_data": row_data}
        )

        await self.db.commit()
        return {"status": "success", "row_index": row_index, "data": row_data}

    async def delete_row(
        self,
        structured_data_id: UUID,
        user_id: UUID,
        row_index: int,
        keep_history: bool = True
    ) -> None:
        """Delete a row."""
        # Get structured data
        structured_data = await self._get_structured_data(structured_data_id)

        # Validate row index
        data = structured_data.data
        if "rows" not in data or row_index >= len(data["rows"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Row {row_index} not found"
            )

        # Store row data for history
        old_row_data = data["rows"][row_index]

        # Remove row
        data["rows"].pop(row_index)
        structured_data.data = data

        if keep_history:
            # Record change
            await self._record_change(
                structured_data_id=structured_data_id,
                user_id=user_id,
                change_type="DELETE_ROW",
                row_index=row_index,
                old_value=str(old_row_data),
                meta_data={"row_data": old_row_data}
            )

        await self.db.commit()

    async def update_cell(
        self,
        structured_data_id: UUID,
        user_id: UUID,
        column_name: str,
        row_index: int,
        value: Any
    ) -> Dict[str, Any]:
        """Update a single cell value."""
        # Get structured data
        structured_data = await self._get_structured_data(structured_data_id)

        # Validate column
        column = next(
            (col for col in structured_data.columns if col.name == column_name and col.is_active),
            None
        )
        if not column:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Column '{column_name}' not found"
            )

        # Validate row index
        data = structured_data.data
        if "rows" not in data or row_index >= len(data["rows"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Row {row_index} not found"
            )

        # Store old value for history
        old_value = data["rows"][row_index].get(column_name)

        # Update cell value
        data["rows"][row_index][column_name] = value
        structured_data.data = data

        # Record change
        await self._record_change(
            structured_data_id=structured_data_id,
            user_id=user_id,
            change_type="UPDATE_CELL",
            column_name=column_name,
            row_index=row_index,
            old_value=str(old_value),
            new_value=str(value)
        )

        await self.db.commit()
        return {
            "status": "success",
            "column": column_name,
            "row": row_index,
            "old_value": old_value,
            "new_value": value
        }

    async def get_history(
        self,
        structured_data_id: UUID,
        limit: int = 10,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get change history for structured data."""
        query = (
            select(DataChangeHistory)
            .where(DataChangeHistory.structured_data_id == structured_data_id)
            .order_by(DataChangeHistory.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(query)
        changes = result.scalars().all()

        return [
            {
                "id": change.id,
                "change_type": change.change_type,
                "column_name": change.column_name,
                "row_index": change.row_index,
                "old_value": change.old_value,
                "new_value": change.new_value,
                "created_at": change.created_at,
                "user_id": change.user_id,
                "meta_data": change.meta_data
            }
            for change in changes
        ]

    async def revert_change(
        self,
        structured_data_id: UUID,
        user_id: UUID,
        change_id: UUID
    ) -> Dict[str, Any]:
        """Revert a specific change."""
        # Get the change
        query = select(DataChangeHistory).where(DataChangeHistory.id == change_id)
        result = await self.db.execute(query)
        change = result.scalar_one_or_none()
        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        # Get structured data
        structured_data = await self._get_structured_data(structured_data_id)

        # Revert the change based on type
        if change.change_type == "UPDATE_CELL":
            await self.update_cell(
                structured_data_id=structured_data_id,
                user_id=user_id,
                column_name=change.column_name,
                row_index=change.row_index,
                value=eval(change.old_value)  # Convert string back to original type
            )
        elif change.change_type == "ADD_COLUMN":
            await self.delete_column(
                structured_data_id=structured_data_id,
                user_id=user_id,
                column_name=change.column_name
            )
        elif change.change_type == "DELETE_COLUMN":
            # Restore column from metadata
            column_data = change.meta_data
            await self.add_column(
                structured_data_id=structured_data_id,
                user_id=user_id,
                column_data=ColumnCreate(**column_data)
            )
        # Add more revert operations as needed

        return {"status": "success", "message": f"Reverted change {change_id}"} 