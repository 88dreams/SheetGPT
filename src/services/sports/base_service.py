from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any, Type, Generic, TypeVar, Union, cast, Protocol
from uuid import UUID
import logging
from sqlalchemy import select, delete, update, func, or_
import math
from sqlalchemy.types import String, Text

from src.utils.errors import (
    DatabaseOperationError, 
    EntityNotFoundError,
    ValidationError,
    handle_database_errors
)
from src.services.sports.utils import normalize_entity_type
from src.models.base import TimestampedBase

logger = logging.getLogger(__name__)

class NameIdNicknameModel(Protocol):
    id: Any
    name: Any
    nickname: Any

# Generic type for model classes, bound to a base with common attributes
ModelType = TypeVar('ModelType', bound=NameIdNicknameModel)

class BaseEntityService(Generic[ModelType]):
    """Base service for common CRUD operations on sports entities."""
    
    def __init__(self, model_class: Type[ModelType]):
        """Initialize with the model class this service handles."""
        self.model_class = model_class
        self.entity_type = self._get_entity_type_from_model()
    
    def _get_entity_type_from_model(self) -> str:
        """Derive standardized entity type from model class name."""
        entity_type = self.model_class.__name__.lower()
        return normalize_entity_type(entity_type)
    
    def _model_to_dict(self, model: Any) -> Dict[str, Any]:
        """Convert a model instance to a dictionary, including only columns from its own table."""
        result = {}
        # Get only the columns that are defined in this model's table
        for column in model.__table__.columns:
            # This ensures we only include fields that actually belong to this entity type
            result[column.name] = getattr(model, column.name)
        return result
        
    def _prepare_filters(self, filters: Dict[str, Any]) -> List:
        """Convert a dictionary of filters to SQLAlchemy filter conditions."""
        conditions = []
        search_clauses = []
        search_value = None

        # Separate search_columns filter
        if 'search_columns' in filters:
            search_value = f"%{filters['search_columns']['value']}%"
            search_columns = filters['search_columns']['columns']
            
            for col_name in search_columns:
                if hasattr(self.model_class, col_name):
                    column = getattr(self.model_class, col_name)
                    # Ensure we only apply ILIKE to string-based columns
                    if isinstance(column.type, (String, Text)):
                        search_clauses.append(column.ilike(search_value))
            
            del filters['search_columns'] # Remove from normal processing

        if search_clauses:
            conditions.append(or_(*search_clauses))

        for key, value in filters.items():
            if hasattr(self.model_class, key):
                # Handle None values (IS NULL in SQL)
                if value is None:
                    conditions.append(getattr(self.model_class, key).is_(None))
                # Handle list values (IN operator in SQL)
                elif isinstance(value, list):
                    conditions.append(getattr(self.model_class, key).in_(value))
                # Handle string values with optional case-insensitive search
                elif isinstance(value, str) and key in ['name', 'type', 'entity_type']:
                    conditions.append(func.lower(getattr(self.model_class, key)) == value.lower())
                # Default exact match
                else:
                    conditions.append(getattr(self.model_class, key) == value)
        return conditions
    
    @handle_database_errors
    async def get_entities(self, db: AsyncSession, filters: Optional[Dict[str, Any]] = None, 
                          page: int = 1, limit: int = 50, 
                          sort_by: str = "id", sort_direction: str = "asc") -> Dict[str, Any]:
        """
        Get paginated entities with optional filtering.
        
        Args:
            db: Database session
            filters: Optional dictionary of field:value pairs to filter on
            page: Page number to retrieve
            limit: Number of items per page
            sort_by: Field to sort by
            sort_direction: Sort direction ("asc" or "desc")
            
        Returns:
            Dictionary with paginated results and metadata
        """
        # Create base query
        query = select(self.model_class)
        count_query = select(func.count()).select_from(self.model_class)
        
        # Add filters if provided
        if filters:
            conditions = self._prepare_filters(filters)
            if conditions:
                query = query.where(*conditions)
                count_query = count_query.where(*conditions)
        
        # Get total count with filters applied
        total_count = await db.scalar(count_query)
        
        # Add sorting
        if hasattr(self.model_class, sort_by):
            sort_column = getattr(self.model_class, sort_by)
            if sort_direction.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            # Default to sorting by id if the requested column doesn't exist
            logger.warning(f"Sort column '{sort_by}' does not exist on {self.entity_type}, using default 'id'")
            if hasattr(self.model_class, 'id'):
                query = query.order_by(self.model_class.id.asc())
                
        # Add pagination
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        entities = result.scalars().all()
        
        return {
            "items": [self._model_to_dict(entity) for entity in entities],
            "total": total_count or 0,
            "page": page,
            "size": limit,
            "pages": math.ceil((total_count or 0) / limit) if limit > 0 else 0
        }
    
    @handle_database_errors
    async def get_entity(self, db: AsyncSession, entity_id: UUID, raise_not_found: bool = True) -> Optional[ModelType]:
        """
        Get a specific entity by ID.
        
        Args:
            db: Database session
            entity_id: UUID of the entity to find
            raise_not_found: Whether to raise EntityNotFoundError if entity doesn't exist
            
        Returns:
            The entity if found, None otherwise (if raise_not_found is False)
            
        Raises:
            EntityNotFoundError: If entity doesn't exist and raise_not_found is True
        """
        if hasattr(self.model_class, 'id'):
            result = await db.execute(select(self.model_class).where(self.model_class.id == entity_id))
            entity = result.scalars().first()
            
            if entity is None and raise_not_found:
                # Use standardized entity not found error
                raise EntityNotFoundError(entity_type=self.entity_type, entity_id=str(entity_id))
                
            return entity
        return None
    
    @handle_database_errors
    async def get_entity_by_name(self, db: AsyncSession, name: str, raise_not_found: bool = True) -> Optional[ModelType]:
        """
        Get an entity by name (case-insensitive), checking nickname if available.
        
        Args:
            db: Database session
            name: Name or Nickname of the entity to find
            raise_not_found: Whether to raise EntityNotFoundError if entity doesn't exist
            
        Returns:
            The entity if found, None otherwise (if raise_not_found is False)
            
        Raises:
            EntityNotFoundError: If entity doesn't exist and raise_not_found is True
            ValidationError: If the model doesn't have a 'name' attribute
        """
        logger.debug(f"[BaseEntityService.get_entity_by_name] Called for entity_type: {self.entity_type}, name: '{name}', model_class: {self.model_class.__name__}")

        if not hasattr(self.model_class, 'name'):
            logger.error(f"[BaseEntityService.get_entity_by_name] Model {self.model_class.__name__} does not have a 'name' attribute.")
            raise ValidationError(f"{self.entity_type} model does not have a 'name' attribute")
            
        search_term_lower = name.lower()
        logger.debug(f"[BaseEntityService.get_entity_by_name] Lowercased search term: '{search_term_lower}'")

        conditions = []
        if hasattr(self.model_class, 'name'):
            conditions.append(func.lower(self.model_class.name) == search_term_lower)
        
        logger.debug(f"[BaseEntityService.get_entity_by_name] Initial condition: name == '{search_term_lower}'")

        if hasattr(self.model_class, 'nickname'):
            logger.debug(f"[BaseEntityService.get_entity_by_name] Model {self.model_class.__name__} has nickname attribute. Adding to conditions.")
            conditions.append(func.lower(self.model_class.nickname) == search_term_lower)
        else:
            logger.debug(f"[BaseEntityService.get_entity_by_name] Model {self.model_class.__name__} does NOT have nickname attribute.")
        
        query = select(self.model_class).where(or_(*conditions))
        
        # Log the generated SQL query (for dialects that support it easily like PostgreSQL)
        try:
            from sqlalchemy.dialects import postgresql
            compiled_query = query.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})
            logger.debug(f"[BaseEntityService.get_entity_by_name] Compiled SQL Query: {str(compiled_query)}")
        except Exception as e:
            logger.warning(f"[BaseEntityService.get_entity_by_name] Could not compile query for logging: {e}")

        result = await db.execute(query)
        entity = result.scalars().first()
        
        if entity:
            logger.debug(f"[BaseEntityService.get_entity_by_name] Found entity: {entity}")
        else:
            logger.debug(f"[BaseEntityService.get_entity_by_name] No entity found.")

        if entity is None and raise_not_found:
            raise EntityNotFoundError(entity_type=self.entity_type, entity_name=name)
            
        return entity
        
    @handle_database_errors
    async def find_entity(self, db: AsyncSession, search_term: str, raise_not_found: bool = False) -> Optional[ModelType]:
        """
        Find an entity by partial name/nickname match or exact ID match.
        
        Args:
            db: Database session
            search_term: Name fragment or UUID string to search for
            raise_not_found: Whether to raise EntityNotFoundError if entity doesn't exist
            
        Returns:
            The entity if found, None otherwise (if raise_not_found is False)
            
        Raises:
            EntityNotFoundError: If entity doesn't exist and raise_not_found is True
            ValidationError: If the model doesn't have a 'name' attribute
        """
        # Check if it's a valid UUID first
        try:
            entity_id = UUID(search_term)
            # Try to find by ID
            entity = await self.get_entity(db, entity_id, raise_not_found=False)
            if entity:
                return entity
        except ValueError:
            # Not a valid UUID, continue with name search
            pass
        
        # Require name attribute for searching by name/nickname (nickname alone isn't usually enough)
        if not hasattr(self.model_class, 'name'):
            if raise_not_found:
                raise ValidationError(f"{self.entity_type} model does not have a 'name' attribute for searching.")
            return None
            
        search_term_lower = search_term.lower()

        # Try exact match on name first (case insensitive)
        query_name_exact = select(self.model_class).where(func.lower(self.model_class.name) == search_term_lower)
        result_name_exact = await db.execute(query_name_exact)
        entity_name_exact = result_name_exact.scalars().first()
        if entity_name_exact:
            return entity_name_exact
            
        # If model has nickname, try exact match on nickname (case insensitive)
        if hasattr(self.model_class, 'nickname'):
            query_nickname_exact = select(self.model_class).where(func.lower(self.model_class.nickname) == search_term_lower)
            result_nickname_exact = await db.execute(query_nickname_exact)
            entity_nickname_exact = result_nickname_exact.scalars().first()
            if entity_nickname_exact:
                return entity_nickname_exact
            
        # Try partial match (contains) on name and nickname (if available)
        partial_match_conditions = [func.lower(self.model_class.name).contains(search_term_lower)]
        if hasattr(self.model_class, 'nickname') and self.model_class.nickname is not None: # Check if nickname column exists and is not None type
            partial_match_conditions.append(func.lower(self.model_class.nickname).contains(search_term_lower))
        
        query_partial = select(self.model_class).where(or_(*partial_match_conditions))
        result_partial = await db.execute(query_partial)
        entities_partial = result_partial.scalars().all()
        
        # If we have multiple partial matches, try to find a more precise one (exact word match)
        if len(entities_partial) > 1:
            for entity in entities_partial:
                name_parts = entity.name.lower().split()
                if search_term_lower in name_parts:
                    return entity
                if hasattr(entity, 'nickname') and entity.nickname:
                    nickname_parts = entity.nickname.lower().split()
                    if search_term_lower in nickname_parts:
                        return entity
        
        # Otherwise return the first partial match if any
        if entities_partial:
            return entities_partial[0]
            
        if raise_not_found:
            raise EntityNotFoundError(entity_type=self.entity_type, entity_name=search_term)
            
        return None
    
    @handle_database_errors
    async def create_entity(self, db: AsyncSession, data: Dict[str, Any], 
                           validate_fields: bool = True,
                           update_if_exists: bool = False) -> Optional[ModelType]:
        """
        Create a new entity or update if it exists.
        
        Args:
            db: Database session
            data: Entity data
            validate_fields: Whether to validate that all fields in data exist on model
            update_if_exists: Whether to update an existing entity with the same name
            
        Returns:
            The created or updated entity
            
        Raises:
            ValidationError: If fields don't exist on model and validate_fields is True
        """
        # Field validation to catch errors early
        if validate_fields:
            for key in data.keys():
                if not hasattr(self.model_class, key):
                    raise ValidationError(f"Field '{key}' does not exist on {self.entity_type} model")
        
        # If update_if_exists and a name is provided, check for existing entity
        if update_if_exists and 'name' in data and data['name'] and hasattr(self.model_class, 'name'):
            # Check if an entity with the same name already exists
            try:
                existing = await self.get_entity_by_name(db, data['name'], raise_not_found=False)
                if existing:
                    # Update and return existing entity
                    return await self.update_entity(db, existing.id, data, validate_fields=validate_fields)
            except Exception as e:
                logger.warning(f"Error checking for existing {self.entity_type}: {str(e)}")
        
        # Create new entity
        entity = self.model_class(**{k: v for k, v in data.items() if hasattr(self.model_class, k)})
        db.add(entity)
        await db.commit()
        await db.refresh(entity)
        return entity
    
    @handle_database_errors
    async def update_entity(self, db: AsyncSession, entity_id: UUID, data: Dict[str, Any], 
                           validate_fields: bool = True) -> Optional[ModelType]:
        """
        Update an entity.
        
        Args:
            db: Database session
            entity_id: UUID of the entity to update
            data: New entity data
            validate_fields: Whether to validate that all fields in data exist on model
            
        Returns:
            The updated entity
            
        Raises:
            EntityNotFoundError: If entity doesn't exist
            ValidationError: If fields don't exist on model and validate_fields is True
        """
        # Get the entity
        entity = await self.get_entity(db, entity_id)
        
        # Field validation
        if validate_fields:
            invalid_fields = [key for key in data.keys() if not hasattr(self.model_class, key)]
            if invalid_fields:
                raise ValidationError(f"Fields {invalid_fields} do not exist on {self.entity_type} model")
        
        # Update entity attributes
        for key, value in data.items():
            if hasattr(entity, key):
                setattr(entity, key, value)
        
        await db.commit()
        await db.refresh(entity)
        return entity
    
    @handle_database_errors
    async def delete_entity(self, db: AsyncSession, entity_id: UUID) -> bool:
        """
        Delete an entity.
        
        Args:
            db: Database session
            entity_id: UUID of the entity to delete
            
        Returns:
            True if entity was deleted
            
        Raises:
            EntityNotFoundError: If entity doesn't exist
        """
        # Get the entity to ensure it exists
        entity = await self.get_entity(db, entity_id)
        
        # Delete the entity
        await db.delete(entity)
        await db.commit()
        return True
        
    @handle_database_errors
    async def bulk_create(self, db: AsyncSession, entities_data: List[Dict[str, Any]],
                         validate_fields: bool = True,
                         update_if_exists: bool = False) -> List[ModelType]:
        """
        Create multiple entities at once.
        
        Args:
            db: Database session
            entities_data: List of entity data dictionaries
            validate_fields: Whether to validate that all fields exist on model
            update_if_exists: Whether to update existing entities with same name
            
        Returns:
            List of created entities
        """
        created_entities = []
        
        for data in entities_data:
            entity = await self.create_entity(
                db, data, 
                validate_fields=validate_fields,
                update_if_exists=update_if_exists
            )
            created_entities.append(entity)
            
        return created_entities
        
    @handle_database_errors
    async def bulk_update(self, db: AsyncSession, entity_ids: List[UUID], 
                         common_data: Dict[str, Any]) -> int:
        """
        Update multiple entities with the same data.
        
        Args:
            db: Database session
            entity_ids: List of entity UUIDs to update
            common_data: Data to apply to all entities
            
        Returns:
            Number of updated rows
        """
        # Field validation
        invalid_fields = [key for key in common_data.keys() if not hasattr(self.model_class, key)]
        if invalid_fields:
            raise ValidationError(f"Fields {invalid_fields} do not exist on {self.entity_type} model")
        
        # Use SQLAlchemy update statement for efficiency
        if hasattr(self.model_class, 'id'):
            stmt = update(self.model_class).where(
                self.model_class.id.in_(entity_ids)
            ).values(**common_data)
            
            result = await db.execute(stmt)
            await db.commit()
            
            return result.rowcount
        return 0

    @handle_database_errors
    async def get_all_models(self, db: AsyncSession, filters: Optional[Dict[str, Any]] = None) -> List[ModelType]:
        """
        Get all entity model instances, with optional filtering.
        
        Args:
            db: Database session
            filters: Optional dictionary of field:value pairs to filter on
            
        Returns:
            List of entity model instances.
        """
        query = select(self.model_class)
        
        if filters:
            conditions = self._prepare_filters(filters)
            if conditions:
                query = query.where(*conditions)
        
        # Optional: Add default sorting if desired for consistency, e.g., by name or ID
        if hasattr(self.model_class, "name"):
            query = query.order_by(self.model_class.name.asc())
        elif hasattr(self.model_class, "id"):
            query = query.order_by(self.model_class.id.asc())
            
        result = await db.execute(query)
        return list(result.scalars().all())