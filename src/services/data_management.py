from typing import Dict, Any, List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import select, desc, String, cast, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.models import StructuredData, DataColumn, DataChangeHistory, Conversation
from src.schemas.data_management import (
    ColumnCreate,
    ColumnUpdate,
    StructuredDataCreate,
    StructuredDataUpdate,
    StructuredDataResponse,
)

class DataManagementService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_structured_data(self, structured_data_id: UUID) -> StructuredData:
        """Get structured data by ID."""
        query = (
            select(StructuredData)
            .options(
                selectinload(StructuredData.conversation),
                selectinload(StructuredData.columns)
            )
            .where(
                StructuredData.id == structured_data_id,
                StructuredData.deleted_at.is_(None)
            )
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

    async def get_all_data(self, user_id: UUID) -> List[StructuredDataResponse]:
        """Get all structured data for a user."""
        query = (
            select(StructuredData)
            .join(StructuredData.conversation)
            .options(selectinload(StructuredData.columns))
            .where(
                StructuredData.conversation.has(user_id=user_id),
                StructuredData.deleted_at.is_(None)
            )
            .order_by(desc(StructuredData.created_at))
        )
        
        result = await self.db.execute(query)
        data_list = result.scalars().all()
        
        return [StructuredDataResponse.from_orm(data) for data in data_list]

    async def get_data_by_id(self, data_id: UUID, user_id: UUID) -> StructuredDataResponse:
        """Get structured data by ID with user verification."""
        data = await self._get_structured_data(data_id)
        if data.conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this data"
            )
        
        # Convert SQLAlchemy model to dict with relationships
        data_dict = {
            "id": data.id,
            "conversation_id": data.conversation_id,
            "data_type": data.data_type,
            "schema_version": data.schema_version,
            "data": data.data,
            "meta_data": data.meta_data,
            "created_at": data.created_at,
            "updated_at": data.updated_at,
            "columns": [
                {
                    "id": col.id,
                    "structured_data_id": col.structured_data_id,
                    "name": col.name,
                    "data_type": col.data_type,
                    "format": col.format,
                    "formula": col.formula,
                    "order": col.order,
                    "is_active": col.is_active,
                    "meta_data": col.meta_data
                }
                for col in data.columns
            ]
        }
        
        return StructuredDataResponse.model_validate(data_dict)

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
        # Get the raw model first
        query = (
            select(StructuredData)
            .where(
                StructuredData.id == data_id,
                StructuredData.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(query)
        structured_data = result.scalar_one_or_none()
        
        if not structured_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Structured data not found"
            )

        # Check authorization
        query = select(Conversation).where(Conversation.id == structured_data.conversation_id)
        result = await self.db.execute(query)
        conversation = result.scalar_one_or_none()
        
        if not conversation or conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this data"
            )
        
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

    async def get_rows(
        self,
        data_id: UUID,
        user_id: UUID,
        skip: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get rows for structured data with pagination."""
        data = await self.get_data_by_id(data_id, user_id)
        
        if not isinstance(data.data, dict) or "rows" not in data.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data is not in row-based format"
            )
        
        total_rows = len(data.data["rows"])
        rows = data.data["rows"][skip:skip + limit]
        
        return {
            "total": total_rows,
            "rows": rows,
            "column_order": data.data.get("column_order", [])
        }

    async def add_row(
        self,
        data_id: UUID,
        user_id: UUID,
        row_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add a new row to structured data."""
        data = await self.get_data_by_id(data_id, user_id)
        
        if not isinstance(data.data, dict) or "rows" not in data.data:
            data.data = {"rows": [], "column_order": list(row_data.keys())}
        
        # Ensure all columns exist
        for col_name in row_data.keys():
            if col_name not in data.data.get("column_order", []):
                data.data["column_order"].append(col_name)
        
        # Add the new row
        data.data["rows"].append(row_data)
        await self.db.commit()
        
        await self._record_change(
            structured_data_id=data.id,
            user_id=user_id,
            change_type="ADD_ROW",
            meta_data={"row_data": row_data}
        )
        
        return row_data

    async def update_row(
        self,
        data_id: UUID,
        user_id: UUID,
        row_index: int,
        row_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a row in structured data."""
        data = await self.get_data_by_id(data_id, user_id)
        
        if not isinstance(data.data, dict) or "rows" not in data.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data is not in row-based format"
            )
        
        if row_index < 0 or row_index >= len(data.data["rows"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Row index out of range"
            )
        
        old_row = data.data["rows"][row_index].copy()
        data.data["rows"][row_index].update(row_data)
        await self.db.commit()
        
        await self._record_change(
            structured_data_id=data.id,
            user_id=user_id,
            change_type="UPDATE_ROW",
            row_index=row_index,
            meta_data={
                "old_data": old_row,
                "new_data": row_data
            }
        )
        
        return data.data["rows"][row_index]

    async def delete_row(
        self,
        data_id: UUID,
        user_id: UUID,
        row_index: int
    ) -> None:
        """Delete a row from structured data."""
        data = await self.get_data_by_id(data_id, user_id)
        
        if not isinstance(data.data, dict) or "rows" not in data.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data is not in row-based format"
            )
        
        if row_index < 0 or row_index >= len(data.data["rows"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Row index out of range"
            )
        
        deleted_row = data.data["rows"].pop(row_index)
        await self.db.commit()
        
        await self._record_change(
            structured_data_id=data.id,
            user_id=user_id,
            change_type="DELETE_ROW",
            row_index=row_index,
            meta_data={"deleted_row": deleted_row}
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
        data = await self.get_data_by_id(data_id, user_id)
        
        if not isinstance(data.data, dict) or "rows" not in data.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data is not in row-based format"
            )
        
        if row_index < 0 or row_index >= len(data.data["rows"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Row index out of range"
            )
        
        row = data.data["rows"][row_index]
        old_value = row.get(column_name)
        row[column_name] = value
        await self.db.commit()
        
        await self._record_change(
            structured_data_id=data.id,
            user_id=user_id,
            change_type="UPDATE_CELL",
            column_name=column_name,
            row_index=row_index,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(value)
        )
        
        return row

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

    async def get_data_by_message_id(self, message_id: UUID, user_id: UUID) -> StructuredDataResponse:
        """Get structured data by message ID."""
        query = (
            select(StructuredData)
            .join(StructuredData.conversation)
            .options(
                selectinload(StructuredData.conversation),
                selectinload(StructuredData.columns)
            )
            .where(
                StructuredData.conversation.has(user_id=user_id),
                text("structured_data.meta_data->>'message_id' = :message_id").bindparams(
                    message_id=str(message_id)
                ),
                StructuredData.deleted_at.is_(None)
            )
        )
        
        result = await self.db.execute(query)
        data = result.scalar_one_or_none()
        
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Structured data not found for this message"
            )
        
        # Convert SQLAlchemy model to dict with relationships
        data_dict = {
            "id": data.id,
            "conversation_id": data.conversation_id,
            "data_type": data.data_type,
            "schema_version": data.schema_version,
            "data": data.data,
            "meta_data": data.meta_data,
            "created_at": data.created_at,
            "updated_at": data.updated_at,
            "columns": [
                {
                    "id": col.id,
                    "structured_data_id": col.structured_data_id,
                    "name": col.name,
                    "data_type": col.data_type,
                    "format": col.format,
                    "formula": col.formula,
                    "order": col.order,
                    "is_active": col.is_active,
                    "meta_data": col.meta_data
                }
                for col in data.columns
            ]
        }
        
        return StructuredDataResponse.model_validate(data_dict) 