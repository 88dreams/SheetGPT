from typing import Any, Dict
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from .history_service import HistoryService
from .structured_data_service import StructuredDataService


class RowService:
    """Service for managing data rows."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.structured_data_service = StructuredDataService(db)
        self.history_service = HistoryService(db)

    async def get_rows(
        self, data_id: UUID, user_id: UUID, skip: int = 0, limit: int = 50
    ) -> Dict[str, Any]:
        """Get rows for structured data with pagination."""
        data = await self.structured_data_service.get_data_by_id(data_id, user_id)

        if not isinstance(data.data, dict) or "rows" not in data.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data is not in row-based format",
            )

        total_rows = len(data.data["rows"])
        rows = data.data["rows"][skip : skip + limit]

        return {
            "total": total_rows,
            "rows": rows,
            "column_order": data.data.get("column_order", []),
        }

    async def add_row(
        self, data_id: UUID, user_id: UUID, row_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add a new row to structured data."""
        structured_data = await self.structured_data_service._get_structured_data(
            data_id
        )

        # Verify user authorization
        if structured_data.conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this data",
            )

        if (
            not isinstance(structured_data.data, dict)
            or "rows" not in structured_data.data
        ):
            structured_data.data = {"rows": [], "column_order": list(row_data.keys())}

        # Ensure all columns exist
        for col_name in row_data.keys():
            if col_name not in structured_data.data.get("column_order", []):
                structured_data.data["column_order"].append(col_name)

        # Add the new row
        structured_data.data["rows"].append(row_data)
        await self.db.commit()

        await self.history_service.record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="ADD_ROW",
            meta_data={"row_data": row_data},
        )

        return row_data

    async def update_row(
        self, data_id: UUID, user_id: UUID, row_index: int, row_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a row in structured data."""
        structured_data = await self.structured_data_service._get_structured_data(
            data_id
        )

        # Verify user authorization
        if structured_data.conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this data",
            )

        if (
            not isinstance(structured_data.data, dict)
            or "rows" not in structured_data.data
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data is not in row-based format",
            )

        if row_index < 0 or row_index >= len(structured_data.data["rows"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Row index out of range"
            )

        old_row = structured_data.data["rows"][row_index].copy()
        structured_data.data["rows"][row_index].update(row_data)
        await self.db.commit()

        await self.history_service.record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="UPDATE_ROW",
            row_index=row_index,
            meta_data={"old_data": old_row, "new_data": row_data},
        )

        return structured_data.data["rows"][row_index]

    async def delete_row(self, data_id: UUID, user_id: UUID, row_index: int) -> None:
        """Delete a row from structured data."""
        structured_data = await self.structured_data_service._get_structured_data(
            data_id
        )

        # Verify user authorization
        if structured_data.conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this data",
            )

        if (
            not isinstance(structured_data.data, dict)
            or "rows" not in structured_data.data
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data is not in row-based format",
            )

        if row_index < 0 or row_index >= len(structured_data.data["rows"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Row index out of range"
            )

        deleted_row = structured_data.data["rows"].pop(row_index)
        await self.db.commit()

        await self.history_service.record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="DELETE_ROW",
            row_index=row_index,
            meta_data={"deleted_row": deleted_row},
        )

    async def update_cell(
        self, data_id: UUID, user_id: UUID, column_name: str, row_index: int, value: Any
    ) -> Dict[str, Any]:
        """Update a cell value."""
        structured_data = await self.structured_data_service._get_structured_data(
            data_id
        )

        # Verify user authorization
        if structured_data.conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this data",
            )

        if (
            not isinstance(structured_data.data, dict)
            or "rows" not in structured_data.data
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data is not in row-based format",
            )

        if row_index < 0 or row_index >= len(structured_data.data["rows"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Row index out of range"
            )

        row = structured_data.data["rows"][row_index]
        old_value = row.get(column_name)
        row[column_name] = value
        await self.db.commit()

        await self.history_service.record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="UPDATE_CELL",
            column_name=column_name,
            row_index=row_index,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(value),
        )

        return row
