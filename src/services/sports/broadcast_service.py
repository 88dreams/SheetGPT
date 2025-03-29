from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import logging
import math
from sqlalchemy import select

from src.models.sports_models import Brand, BroadcastRights, DivisionConference
from src.schemas.sports import BroadcastCompanyCreate, BroadcastCompanyUpdate, BroadcastRightsCreate, BroadcastRightsUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator
from src.utils.errors import handle_database_errors

logger = logging.getLogger(__name__)

class BroadcastCompanyService(BaseEntityService[Brand]):
    """
    Service for managing broadcast companies.
    
    Note: Uses the Brand model as the unified company entity, filtering by company_type='Broadcaster'.
    Legacy BroadcastCompany model will be deprecated in favor of using the Brand model directly.
    """
    
    def __init__(self):
        super().__init__(Brand)
        self.entity_type = "broadcast_company"  # Override entity_type for error messages
    
    @handle_database_errors
    async def get_broadcast_companies(self, db: AsyncSession, 
                                     filters: Optional[Dict[str, Any]] = None,
                                     page: int = 1, 
                                     limit: int = 50,
                                     sort_by: str = "name", 
                                     sort_direction: str = "asc") -> Dict[str, Any]:
        """
        Get all broadcast company brands with optional filtering.
        
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
        # Add the broadcaster filter to any existing filters
        if not filters:
            filters = {}
        filters["company_type"] = "Broadcaster"
        
        # Use the enhanced get_entities method from BaseEntityService
        return await super().get_entities(
            db, 
            filters=filters, 
            page=page, 
            limit=limit, 
            sort_by=sort_by, 
            sort_direction=sort_direction
        )
    
    @handle_database_errors
    async def create_broadcast_company(self, db: AsyncSession, company_data: Union[BroadcastCompanyCreate, Dict[str, Any]]) -> Brand:
        """
        Create a new broadcast company brand or update if it already exists.
        
        Args:
            db: Database session
            company_data: Company data (either BroadcastCompanyCreate schema or dict)
            
        Returns:
            The created or updated brand
        """
        # Convert to dict if it's a Pydantic model
        if hasattr(company_data, "dict"):
            data = company_data.dict(exclude_unset=True)
        else:
            data = company_data
        
        # Add broadcast company defaults
        if "industry" not in data:
            data["industry"] = "Media"
        
        data["company_type"] = "Broadcaster"
        
        # Use the enhanced create_entity method with update_if_exists=True
        return await super().create_entity(db, data, update_if_exists=True)
    
    @handle_database_errors
    async def get_broadcast_company(self, db: AsyncSession, company_id: UUID) -> Brand:
        """
        Get a broadcast company by ID.
        
        Args:
            db: Database session
            company_id: UUID of the company to get
            
        Returns:
            The brand if found
            
        Raises:
            EntityNotFoundError: If brand doesn't exist
        """
        return await super().get_entity(db, company_id)
    
    @handle_database_errors
    async def get_broadcast_company_by_name(self, db: AsyncSession, name: str) -> Brand:
        """
        Get a broadcast company by name (case-insensitive).
        
        Args:
            db: Database session
            name: Name of the company to get
            
        Returns:
            The brand if found
            
        Raises:
            EntityNotFoundError: If brand doesn't exist
        """
        return await super().get_entity_by_name(db, name)
    
    @handle_database_errors
    async def find_broadcast_company(self, db: AsyncSession, search_term: str, raise_not_found: bool = False) -> Optional[Brand]:
        """
        Find a broadcast company by name (partial match) or ID.
        
        Args:
            db: Database session
            search_term: Name fragment or UUID string to search for
            raise_not_found: Whether to raise EntityNotFoundError if company doesn't exist
            
        Returns:
            The brand if found, None otherwise (if raise_not_found is False)
            
        Raises:
            EntityNotFoundError: If brand doesn't exist and raise_not_found is True
        """
        # First try finding with the base method
        brand = await super().find_entity(db, search_term, raise_not_found=False)
        
        # If found, check if it's a broadcaster or try to filter by company_type
        if brand:
            if brand.company_type == "Broadcaster":
                return brand
            elif not brand.company_type:
                # If no company_type is set, update it
                brand.company_type = "Broadcaster"
                await db.commit()
                await db.refresh(brand)
                return brand
            
        # If not found or not a broadcaster, search specifically for broadcasters
        query = select(self.model_class).where(
            (self.model_class.company_type == "Broadcaster") &
            (self.model_class.name.ilike(f"%{search_term}%"))
        )
        result = await db.execute(query)
        brands = result.scalars().all()
        
        if brands:
            return brands[0]
        
        if raise_not_found:
            from src.utils.errors import EntityNotFoundError
            raise EntityNotFoundError(entity_type=self.entity_type, entity_name=search_term)
            
        return None
    
    @handle_database_errors
    async def update_broadcast_company(self, db: AsyncSession, company_id: UUID, company_update: Union[BroadcastCompanyUpdate, Dict[str, Any]]) -> Brand:
        """
        Update a broadcast company.
        
        Args:
            db: Database session
            company_id: UUID of the company to update
            company_update: Company data to update (either BroadcastCompanyUpdate schema or dict)
            
        Returns:
            The updated brand
            
        Raises:
            EntityNotFoundError: If brand doesn't exist
        """
        # Convert to dict if it's a Pydantic model
        if hasattr(company_update, "dict"):
            update_data = company_update.dict(exclude_unset=True)
        else:
            update_data = company_update
            
        # Ensure company_type remains 'Broadcaster'
        update_data["company_type"] = "Broadcaster"
            
        return await super().update_entity(db, company_id, update_data)
    
    @handle_database_errors
    async def delete_broadcast_company(self, db: AsyncSession, company_id: UUID) -> bool:
        """
        Delete a broadcast company.
        
        Args:
            db: Database session
            company_id: UUID of the company to delete
            
        Returns:
            True if the company was deleted
            
        Raises:
            EntityNotFoundError: If brand doesn't exist
        """
        return await super().delete_entity(db, company_id)

class BroadcastRightsService(BaseEntityService[BroadcastRights]):
    """Service for managing broadcast rights."""
    
    def __init__(self):
        super().__init__(BroadcastRights)
    
    @handle_database_errors
    async def get_broadcast_rights(self, db: AsyncSession, 
                                  filters: Optional[Dict[str, Any]] = None,
                                  entity_type: Optional[str] = None, 
                                  entity_id: Optional[UUID] = None,
                                  company_id: Optional[UUID] = None,
                                  page: int = 1, 
                                  limit: int = 50,
                                  sort_by: str = "start_date", 
                                  sort_direction: str = "desc") -> Dict[str, Any]:
        """
        Get broadcast rights with optional filtering.
        
        Args:
            db: Database session
            filters: Optional dictionary of field:value pairs to filter on
            entity_type: Optional entity type to filter by
            entity_id: Optional entity ID to filter by
            company_id: Optional company ID to filter by
            page: Page number to retrieve
            limit: Number of items per page
            sort_by: Field to sort by
            sort_direction: Sort direction ("asc" or "desc")
            
        Returns:
            Dictionary with paginated results and metadata
        """
        # Create filters dictionary if not provided
        if not filters:
            filters = {}
            
        # Add specific filters if provided
        if entity_type:
            filters["entity_type"] = entity_type
        if entity_id:
            filters["entity_id"] = entity_id
        if company_id:
            filters["broadcast_company_id"] = company_id
            
        # Use the enhanced get_entities method from BaseEntityService
        return await super().get_entities(
            db, 
            filters=filters, 
            page=page, 
            limit=limit, 
            sort_by=sort_by, 
            sort_direction=sort_direction
        )
    
    @handle_database_errors
    async def create_broadcast_rights(self, db: AsyncSession, 
                                     rights_data: Union[BroadcastRightsCreate, Dict[str, Any]]) -> BroadcastRights:
        """
        Create new broadcast rights.
        
        Args:
            db: Database session
            rights_data: Broadcast rights data (either BroadcastRightsCreate schema or dict)
            
        Returns:
            The created broadcast rights
            
        Raises:
            ValidationError: If validation fails
        """
        # Convert to dict if it's a Pydantic model
        if hasattr(rights_data, "dict"):
            data = rights_data.dict()
        else:
            data = rights_data
            
        # Validate broadcast company exists (now a Brand)
        await EntityValidator.validate_broadcast_company(db, data["broadcast_company_id"])
        
        # Validate division/conference if provided
        if data.get("division_conference_id"):
            await EntityValidator.validate_division_conference(db, data["division_conference_id"])
        
        # Validate that the entity exists
        await EntityValidator.validate_entity_type_and_id(db, data["entity_type"], data["entity_id"])
        
        # Use the enhanced create_entity method
        return await super().create_entity(db, data)
    
    @handle_database_errors
    async def get_broadcast_right(self, db: AsyncSession, rights_id: UUID) -> BroadcastRights:
        """
        Get broadcast rights by ID.
        
        Args:
            db: Database session
            rights_id: UUID of the rights to get
            
        Returns:
            The broadcast rights if found
            
        Raises:
            EntityNotFoundError: If rights don't exist
        """
        return await super().get_entity(db, rights_id)
    
    @handle_database_errors
    async def update_broadcast_rights(self, db: AsyncSession, 
                                     rights_id: UUID, 
                                     rights_update: Union[BroadcastRightsUpdate, Dict[str, Any]]) -> BroadcastRights:
        """
        Update broadcast rights.
        
        Args:
            db: Database session
            rights_id: UUID of the rights to update
            rights_update: Rights data to update (either BroadcastRightsUpdate schema or dict)
            
        Returns:
            The updated broadcast rights
            
        Raises:
            EntityNotFoundError: If rights don't exist
            ValidationError: If validation fails
        """
        # Get the current rights to check entity_type later
        db_rights = await self.get_entity(db, rights_id)
        
        # Convert to dict if it's a Pydantic model
        if hasattr(rights_update, "dict"):
            update_data = rights_update.dict(exclude_unset=True)
        else:
            update_data = rights_update
        
        # Perform validations for updated fields
        if 'broadcast_company_id' in update_data:
            await EntityValidator.validate_broadcast_company(db, update_data['broadcast_company_id'])
            
        if 'division_conference_id' in update_data and update_data['division_conference_id'] is not None:
            await EntityValidator.validate_division_conference(db, update_data['division_conference_id'])
            
        if 'entity_type' in update_data and 'entity_id' in update_data:
            await EntityValidator.validate_entity_type_and_id(db, update_data['entity_type'], update_data['entity_id'])
        elif 'entity_id' in update_data:
            await EntityValidator.validate_entity_type_and_id(db, db_rights.entity_type, update_data['entity_id'])
        
        # Use the enhanced update_entity method
        return await super().update_entity(db, rights_id, update_data)
    
    @handle_database_errors
    async def delete_broadcast_rights(self, db: AsyncSession, rights_id: UUID) -> bool:
        """
        Delete broadcast rights.
        
        Args:
            db: Database session
            rights_id: UUID of the rights to delete
            
        Returns:
            True if the rights were deleted
            
        Raises:
            EntityNotFoundError: If rights don't exist
        """
        return await super().delete_entity(db, rights_id)