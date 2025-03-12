from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import DataChangeHistory


class HistoryService:
    """Service for managing data change history."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_change(
        self,
        structured_data_id: UUID,
        user_id: UUID,
        change_type: str,
        column_name: Optional[str] = None,
        row_index: Optional[int] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        meta_data: Optional[Dict] = None,
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
            meta_data=meta_data or {},
        )
        self.db.add(change)
        await self.db.commit()

    async def get_change_history(
        self, structured_data_id: UUID, limit: int = 50, offset: int = 0
    ) -> List[DataChangeHistory]:
        """Get change history for structured data."""
        query = (
            select(DataChangeHistory)
            .where(DataChangeHistory.structured_data_id == structured_data_id)
            .order_by(desc(DataChangeHistory.created_at))
            .offset(offset)
            .limit(limit)
        )

        result = await self.db.execute(query)
        return result.scalars().all()
