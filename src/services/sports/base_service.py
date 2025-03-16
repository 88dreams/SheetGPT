from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any, Type, Generic, TypeVar
from uuid import UUID
import logging
from sqlalchemy import select, delete, update, func
import math

logger = logging.getLogger(__name__)

# Generic type for model classes
T = TypeVar('T')

class BaseEntityService(Generic[T]):
    """Base service for common CRUD operations on sports entities."""
    
    def __init__(self, model_class: Type[T]):
        """Initialize with the model class this service handles."""
        self.model_class = model_class
    
    def _model_to_dict(self, model: Any) -> Dict[str, Any]:
        """Convert a model instance to a dictionary, including only columns from its own table."""
        result = {}
        # Get only the columns that are defined in this model's table
        for column in model.__table__.columns:
            # This ensures we only include fields that actually belong to this entity type
            result[column.name] = getattr(model, column.name)
        return result
    
    async def get_entities(self, db: AsyncSession, page: int = 1, limit: int = 50, 
                          sort_by: str = "id", sort_direction: str = "asc") -> Dict[str, Any]:
        """Get paginated entities."""
        # Get total count
        count_query = select(func.count()).select_from(self.model_class)
        total_count = await db.scalar(count_query)
        
        # Create base query
        query = select(self.model_class)
        
        # Add sorting
        if hasattr(self.model_class, sort_by):
            sort_column = getattr(self.model_class, sort_by)
            if sort_direction.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
                
        # Add pagination
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        entities = result.scalars().all()
        
        return {
            "items": [self._model_to_dict(entity) for entity in entities],
            "total": total_count,
            "page": page,
            "size": limit,
            "pages": math.ceil(total_count / limit)
        }
    
    async def get_entity(self, db: AsyncSession, entity_id: UUID) -> Optional[T]:
        """Get a specific entity by ID."""
        result = await db.execute(select(self.model_class).where(self.model_class.id == entity_id))
        return result.scalars().first()
    
    async def get_entity_by_name(self, db: AsyncSession, name: str) -> Optional[T]:
        """Get an entity by name (case-insensitive)."""
        if not hasattr(self.model_class, 'name'):
            return None
            
        # Use case-insensitive search
        query = select(self.model_class).where(func.lower(self.model_class.name) == func.lower(name))
        result = await db.execute(query)
        return result.scalars().first()
    
    async def create_entity(self, db: AsyncSession, data: Dict[str, Any]) -> Optional[T]:
        """Create a new entity."""
        try:
            entity = self.model_class(**data)
            db.add(entity)
            await db.commit()
            await db.refresh(entity)
            return entity
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating entity: {str(e)}")
            raise
    
    async def update_entity(self, db: AsyncSession, entity_id: UUID, data: Dict[str, Any]) -> Optional[T]:
        """Update an entity."""
        result = await db.execute(select(self.model_class).where(self.model_class.id == entity_id))
        entity = result.scalars().first()
        if not entity:
            return None
        
        for key, value in data.items():
            if hasattr(entity, key):
                setattr(entity, key, value)
        
        try:
            await db.commit()
            await db.refresh(entity)
            return entity
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating entity: {str(e)}")
            raise
    
    async def delete_entity(self, db: AsyncSession, entity_id: UUID) -> bool:
        """Delete an entity."""
        result = await db.execute(select(self.model_class).where(self.model_class.id == entity_id))
        entity = result.scalars().first()
        if not entity:
            return False
        
        try:
            await db.delete(entity)
            await db.commit()
            return True
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error deleting entity: {str(e)}")
            raise