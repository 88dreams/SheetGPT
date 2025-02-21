from typing import Dict, Any, List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import StructuredData, DataColumn, DataChangeHistory
from src.schemas.data_management import (
    ColumnCreate,
    ColumnUpdate,
    StructuredDataCreate,
    StructuredDataUpdate,
)

class DataManagementService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_structured_data(self, structured_data_id: UUID) -> StructuredData:
        """Get structured data by ID."""
        query = select(StructuredData).where(
            StructuredData.id == structured_data_id,
            StructuredData.deleted_at.is_(None)
        )
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

    async def get_all_data(self, user_id: UUID) -> List[StructuredData]:
        """Get all structured data for a user."""
        query = select(StructuredData).join(
            StructuredData.conversation
        ).where(
            StructuredData.conversation.has(user_id=user_id),
            StructuredData.deleted_at.is_(None)
        ).order_by(desc(StructuredData.created_at))
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_data_by_id(self, data_id: UUID, user_id: UUID) -> StructuredData:
        """Get structured data by ID with user verification."""
        data = await self._get_structured_data(data_id)
        if data.conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this data"
            )
        return data

    async def create_structured_data(
        self,
        data: StructuredDataCreate,
        user_id: UUID
    ) -> StructuredData:
        """Create new structured data."""
        structured_data = StructuredData(
            conversation_id=data.conversation_id,
            data_type=data.data_type,
            schema_version=data.schema_version,
            data=data.data,
            meta_data=data.meta_data
        )
        self.db.add(structured_data)
        await self.db.commit()
        await self.db.refresh(structured_data)
        
        await self._record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="CREATE_DATA",
            meta_data={"initial_data": data.data}
        )
        
        return structured_data

    async def update_structured_data(
        self,
        data_id: UUID,
        user_id: UUID,
        data: StructuredDataUpdate
    ) -> StructuredData:
        """Update structured data."""
        structured_data = await self.get_data_by_id(data_id, user_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(structured_data, key, value)
        
        await self.db.commit()
        await self.db.refresh(structured_data)
        
        await self._record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="UPDATE_DATA",
            meta_data={"updated_fields": list(update_data.keys())}
        )
        
        return structured_data

    async def delete_structured_data(
        self,
        data_id: UUID,
        user_id: UUID,
        soft_delete: bool = True
    ) -> None:
        """Delete structured data."""
        structured_data = await self.get_data_by_id(data_id, user_id)
        
        if soft_delete:
            from datetime import datetime
            structured_data.deleted_at = datetime.utcnow()
            await self.db.commit()
        else:
            await self.db.delete(structured_data)
            await self.db.commit()
        
        await self._record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="DELETE_DATA",
            meta_data={"soft_delete": soft_delete}
        )

    async def get_columns(self, data_id: UUID, user_id: UUID) -> List[DataColumn]:
        """Get columns for structured data."""
        structured_data = await self.get_data_by_id(data_id, user_id)
        return structured_data.columns

    async def create_column(
        self,
        data_id: UUID,
        user_id: UUID,
        column: ColumnCreate
    ) -> DataColumn:
        """Create a new column."""
        structured_data = await self.get_data_by_id(data_id, user_id)
        
        new_column = DataColumn(
            structured_data_id=structured_data.id,
            **column.model_dump()
        )
        self.db.add(new_column)
        await self.db.commit()
        await self.db.refresh(new_column)
        
        await self._record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="CREATE_COLUMN",
            column_name=column.name,
            meta_data=column.model_dump()
        )
        
        return new_column

    async def update_column(
        self,
        data_id: UUID,
        column_name: str,
        user_id: UUID,
        column_update: ColumnUpdate
    ) -> DataColumn:
        """Update a column."""
        structured_data = await self.get_data_by_id(data_id, user_id)
        
        column = next(
            (col for col in structured_data.columns if col.name == column_name),
            None
        )
        if not column:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Column '{column_name}' not found"
            )
        
        update_data = column_update.model_dump(exclude_unset=True)
        old_values = {
            key: getattr(column, key)
            for key in update_data.keys()
        }
        
        for key, value in update_data.items():
            setattr(column, key, value)
        
        await self.db.commit()
        await self.db.refresh(column)
        
        await self._record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="UPDATE_COLUMN",
            column_name=column_name,
            meta_data={
                "old_values": old_values,
                "new_values": update_data
            }
        )
        
        return column

    async def delete_column(
        self,
        data_id: UUID,
        column_name: str,
        user_id: UUID
    ) -> None:
        """Delete a column."""
        structured_data = await self.get_data_by_id(data_id, user_id)
        
        column = next(
            (col for col in structured_data.columns if col.name == column_name),
            None
        )
        if not column:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Column '{column_name}' not found"
            )
        
        await self.db.delete(column)
        await self.db.commit()
        
        await self._record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="DELETE_COLUMN",
            column_name=column_name,
            meta_data={"column_config": column.meta_data}
        )

    async def update_cell(
        self,
        data_id: UUID,
        user_id: UUID,
        column_name: str,
        row_index: int,
        value: Any
    ) -> Dict[str, Any]:
        """Update a cell value."""
        structured_data = await self.get_data_by_id(data_id, user_id)
        
        if not structured_data.data:
            structured_data.data = []
        
        # Ensure row exists
        while len(structured_data.data) <= row_index:
            structured_data.data.append({})
        
        old_value = structured_data.data[row_index].get(column_name)
        structured_data.data[row_index][column_name] = value
        
        await self.db.commit()
        await self.db.refresh(structured_data)
        
        await self._record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="UPDATE_CELL",
            column_name=column_name,
            row_index=row_index,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(value)
        )
        
        return structured_data.data[row_index]

    async def get_change_history(
        self,
        data_id: UUID,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[DataChangeHistory]:
        """Get change history for structured data."""
        structured_data = await self.get_data_by_id(data_id, user_id)
        
        query = select(DataChangeHistory).where(
            DataChangeHistory.structured_data_id == structured_data.id
        ).order_by(
            desc(DataChangeHistory.created_at)
        ).offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all() 