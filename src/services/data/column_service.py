from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import DataColumn
from src.schemas.data_management import ColumnCreate, ColumnUpdate, ColumnResponse
from .history_service import HistoryService
from .structured_data_service import StructuredDataService


class ColumnService:
    """Service for managing data columns."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.structured_data_service = StructuredDataService(db)
        self.history_service = HistoryService(db)

    async def get_columns(self, data_id: UUID, user_id: UUID) -> List[ColumnResponse]:
        """Get columns for structured data."""
        structured_data = await self.structured_data_service.get_data_by_id(
            data_id, user_id
        )
        return structured_data.columns

    async def create_column(
        self, data_id: UUID, user_id: UUID, column: ColumnCreate
    ) -> DataColumn:
        """Create a new column."""
        structured_data = await self.structured_data_service._get_structured_data(
            data_id
        )

        # Verify user authorization
        if structured_data.conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this data",
            )

        new_column = DataColumn(
            structured_data_id=structured_data.id, **column.model_dump()
        )
        self.db.add(new_column)
        await self.db.commit()
        await self.db.refresh(new_column)

        await self.history_service.record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="CREATE_COLUMN",
            column_name=column.name,
            meta_data=column.model_dump(),
        )

        return new_column

    async def update_column(
        self,
        data_id: UUID,
        column_name: str,
        user_id: UUID,
        column_update: ColumnUpdate,
    ) -> DataColumn:
        """Update a column."""
        structured_data = await self.structured_data_service._get_structured_data(
            data_id
        )

        # Verify user authorization
        if structured_data.conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this data",
            )

        column = next(
            (col for col in structured_data.columns if col.name == column_name), None
        )
        if not column:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Column '{column_name}' not found",
            )

        update_data = column_update.model_dump(exclude_unset=True)
        old_values = {key: getattr(column, key) for key in update_data.keys()}

        for key, value in update_data.items():
            setattr(column, key, value)

        await self.db.commit()
        await self.db.refresh(column)

        await self.history_service.record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="UPDATE_COLUMN",
            column_name=column_name,
            meta_data={"old_values": old_values, "new_values": update_data},
        )

        return column

    async def delete_column(
        self, data_id: UUID, column_name: str, user_id: UUID
    ) -> None:
        """Delete a column."""
        structured_data = await self.structured_data_service._get_structured_data(
            data_id
        )

        # Verify user authorization
        if structured_data.conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this data",
            )

        column = next(
            (col for col in structured_data.columns if col.name == column_name), None
        )
        if not column:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Column '{column_name}' not found",
            )

        await self.db.delete(column)
        await self.db.commit()

        await self.history_service.record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="DELETE_COLUMN",
            column_name=column_name,
            meta_data={"column_config": column.meta_data},
        )
