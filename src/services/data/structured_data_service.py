from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.models import Conversation, StructuredData
from src.schemas.data_management import (
    StructuredDataCreate,
    StructuredDataResponse,
    StructuredDataUpdate,
)
from src.services.data.history_service import HistoryService


class StructuredDataService:
    """Service for managing structured data entities."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.history_service = HistoryService(db)

    async def _get_structured_data(self, structured_data_id: UUID) -> StructuredData:
        """Get structured data by ID without user verification."""
        query = (
            select(StructuredData)
            .options(
                selectinload(StructuredData.conversation),
                selectinload(StructuredData.columns),
            )
            .where(
                StructuredData.id == structured_data_id,
                StructuredData.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(query)
        data = result.scalar_one_or_none()

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Structured data not found",
            )

        # Explicitly access columns to ensure they're loaded within the session
        if data.columns:
            for col in data.columns:
                # Access column attributes to ensure they're loaded
                _ = col.id
                _ = col.name
                _ = col.data_type

        return data

    async def get_all_data(self, user_id: UUID) -> List[StructuredDataResponse]:
        """Get all structured data for a user."""
        query = (
            select(StructuredData)
            .join(StructuredData.conversation)
            .options(
                selectinload(StructuredData.conversation),
                selectinload(StructuredData.columns),
            )
            .where(
                StructuredData.conversation.has(user_id=user_id),
                StructuredData.deleted_at.is_(None),
            )
            .order_by(desc(StructuredData.created_at))
        )

        result = await self.db.execute(query)
        data_list = result.scalars().all()

        # Process the data within the database session context
        response_data = []
        for data in data_list:
            data_dict = self._prepare_data_response(data)
            response_data.append(StructuredDataResponse.model_validate(data_dict))

        return response_data

    async def get_data_by_id(
        self, data_id: UUID, user_id: UUID
    ) -> StructuredDataResponse:
        """Get structured data by ID with user verification."""
        data = await self._get_structured_data(data_id)
        if data.conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this data",
            )

        data_dict = self._prepare_data_response(data)
        return StructuredDataResponse.model_validate(data_dict)

    def _prepare_data_response(self, data: StructuredData) -> Dict[str, Any]:
        """Prepare structured data response dictionary."""
        columns_list = []
        for col in data.columns:
            column_dict = {
                "id": col.id,
                "structured_data_id": col.structured_data_id,
                "name": col.name,
                "data_type": col.data_type,
                "format": col.format,
                "formula": col.formula,
                "order": col.order,
                "is_active": col.is_active,
                "meta_data": col.meta_data,
            }
            columns_list.append(column_dict)

        return {
            "id": data.id,
            "conversation_id": data.conversation_id,
            "data_type": data.data_type,
            "schema_version": data.schema_version,
            "data": data.data,
            "meta_data": data.meta_data,
            "created_at": data.created_at,
            "updated_at": data.updated_at,
            "columns": columns_list,
        }

    async def create_structured_data(
        self, data: StructuredDataCreate, user_id: UUID
    ) -> StructuredData:
        """Create new structured data."""
        # Create the structured data object
        structured_data = StructuredData(
            conversation_id=data.conversation_id,
            data_type=data.data_type,
            schema_version=data.schema_version,
            data=data.data,
            meta_data=data.meta_data,
        )

        # Add it to the session
        self.db.add(structured_data)

        # Flush to get the ID without committing the transaction
        await self.db.flush()

        # Record the change history
        await self.history_service.record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="CREATE_DATA",
            meta_data={"initial_data": data.data},
        )

        # Now commit both operations in a single transaction
        await self.db.commit()

        # Refresh to get the latest data
        await self.db.refresh(structured_data)

        return structured_data

    async def update_structured_data(
        self, data_id: UUID, user_id: UUID, data: StructuredDataUpdate
    ) -> StructuredData:
        """Update structured data."""
        structured_data = await self._get_structured_data(data_id)

        # Verify user authorization
        if structured_data.conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this data",
            )

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(structured_data, key, value)

        await self.db.commit()
        await self.db.refresh(structured_data)

        await self.history_service.record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="UPDATE_DATA",
            meta_data={"updated_fields": list(update_data.keys())},
        )

        return structured_data

    async def delete_structured_data(
        self, data_id: UUID, user_id: UUID, soft_delete: bool = True
    ) -> None:
        """Delete structured data."""
        # Get the raw model first
        query = select(StructuredData).where(
            StructuredData.id == data_id, StructuredData.deleted_at.is_(None)
        )
        result = await self.db.execute(query)
        structured_data = result.scalar_one_or_none()

        if not structured_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Structured data not found",
            )

        # Check authorization
        query = select(Conversation).where(
            Conversation.id == structured_data.conversation_id
        )
        result = await self.db.execute(query)
        conversation = result.scalar_one_or_none()

        if not conversation or conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this data",
            )

        if soft_delete:
            from datetime import datetime

            structured_data.deleted_at = datetime.utcnow()
            await self.db.commit()
        else:
            await self.db.delete(structured_data)
            await self.db.commit()

        await self.history_service.record_change(
            structured_data_id=structured_data.id,
            user_id=user_id,
            change_type="DELETE_DATA",
            meta_data={"soft_delete": soft_delete},
        )

    async def get_data_by_message_id(
        self, message_id: UUID, user_id: UUID
    ) -> StructuredDataResponse:
        """Get structured data by message ID."""
        query = (
            select(StructuredData)
            .join(StructuredData.conversation)
            .options(
                selectinload(StructuredData.conversation),
                selectinload(StructuredData.columns),
            )
            .where(
                StructuredData.conversation.has(user_id=user_id),
                text(
                    "structured_data.meta_data->>'message_id' = :message_id"
                ).bindparams(message_id=str(message_id)),
                StructuredData.deleted_at.is_(None),
            )
        )

        result = await self.db.execute(query)
        data = result.scalar_one_or_none()

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Structured data not found for this message",
            )

        data_dict = self._prepare_data_response(data)
        return StructuredDataResponse.model_validate(data_dict)
