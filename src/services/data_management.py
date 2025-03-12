from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.data_management import (
    ColumnCreate,
    ColumnUpdate,
    StructuredDataCreate,
    StructuredDataResponse,
    StructuredDataUpdate,
)
from src.services.data import (
    ColumnService,
    HistoryService,
    RowService,
    StructuredDataService
)


class DataManagementService:
    """Facade service that orchestrates data management operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.structured_data_service = StructuredDataService(db)
        self.column_service = ColumnService(db)
        self.row_service = RowService(db)
        self.history_service = HistoryService(db)

    # Structured Data Operations

    async def get_all_data(self, user_id: UUID) -> List[StructuredDataResponse]:
        """Get all structured data for a user."""
        return await self.structured_data_service.get_all_data(user_id)

    async def get_data_by_id(
        self, data_id: UUID, user_id: UUID
    ) -> StructuredDataResponse:
        """Get structured data by ID with user verification."""
        return await self.structured_data_service.get_data_by_id(data_id, user_id)

    async def create_structured_data(
        self, data: StructuredDataCreate, user_id: UUID
    ) -> StructuredDataResponse:
        """Create new structured data."""
        structured_data = await self.structured_data_service.create_structured_data(
            data, user_id
        )
        return await self.structured_data_service.get_data_by_id(
            structured_data.id, user_id
        )

    async def update_structured_data(
        self, data_id: UUID, user_id: UUID, data: StructuredDataUpdate
    ) -> StructuredDataResponse:
        """Update structured data."""
        structured_data = await self.structured_data_service.update_structured_data(
            data_id, user_id, data
        )
        return await self.structured_data_service.get_data_by_id(
            structured_data.id, user_id
        )

    async def delete_structured_data(
        self, data_id: UUID, user_id: UUID, soft_delete: bool = True
    ) -> None:
        """Delete structured data."""
        await self.structured_data_service.delete_structured_data(
            data_id, user_id, soft_delete
        )

    async def get_data_by_message_id(
        self, message_id: UUID, user_id: UUID
    ) -> StructuredDataResponse:
        """Get structured data by message ID."""
        return await self.structured_data_service.get_data_by_message_id(
            message_id, user_id
        )

    # Column Operations

    async def get_columns(self, data_id: UUID, user_id: UUID):
        """Get columns for structured data."""
        return await self.column_service.get_columns(data_id, user_id)

    async def create_column(self, data_id: UUID, user_id: UUID, column: ColumnCreate):
        """Create a new column."""
        return await self.column_service.create_column(data_id, user_id, column)

    async def update_column(
        self,
        data_id: UUID,
        column_name: str,
        user_id: UUID,
        column_update: ColumnUpdate,
    ):
        """Update a column."""
        return await self.column_service.update_column(
            data_id, column_name, user_id, column_update
        )

    async def delete_column(
        self, data_id: UUID, column_name: str, user_id: UUID
    ) -> None:
        """Delete a column."""
        await self.column_service.delete_column(data_id, column_name, user_id)

    # Row Operations

    async def get_rows(
        self, data_id: UUID, user_id: UUID, skip: int = 0, limit: int = 50
    ) -> Dict[str, Any]:
        """Get rows for structured data with pagination."""
        return await self.row_service.get_rows(data_id, user_id, skip, limit)

    async def add_row(
        self, data_id: UUID, user_id: UUID, row_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add a new row to structured data."""
        return await self.row_service.add_row(data_id, user_id, row_data)

    async def update_row(
        self, data_id: UUID, user_id: UUID, row_index: int, row_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a row in structured data."""
        return await self.row_service.update_row(data_id, user_id, row_index, row_data)

    async def delete_row(self, data_id: UUID, user_id: UUID, row_index: int) -> None:
        """Delete a row from structured data."""
        await self.row_service.delete_row(data_id, user_id, row_index)

    async def update_cell(
        self, data_id: UUID, user_id: UUID, column_name: str, row_index: int, value: Any
    ) -> Dict[str, Any]:
        """Update a cell value."""
        return await self.row_service.update_cell(
            data_id, user_id, column_name, row_index, value
        )

    # History Operations

    async def get_change_history(
        self, data_id: UUID, user_id: UUID, limit: int = 50, offset: int = 0
    ):
        """Get change history for structured data."""
        # First verify the user has access to this data
        await self.structured_data_service.get_data_by_id(data_id, user_id)
        return await self.history_service.get_change_history(data_id, limit, offset)
