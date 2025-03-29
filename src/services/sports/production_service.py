from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import logging
import math
from sqlalchemy import select, func
import importlib

from src.models.sports_models import ProductionCompany, ProductionService, Brand
from src.models import sports_models as models
from src.schemas.sports import ProductionCompanyCreate, ProductionCompanyUpdate, ProductionServiceCreate, ProductionServiceUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator
from src.utils.errors import handle_database_errors

logger = logging.getLogger(__name__)

class ProductionCompanyService(BaseEntityService[Brand]):
    """
    Service for managing production companies.
    
    Note: Uses the Brand model as the unified company entity, filtering by company_type='Production Company'.
    Legacy ProductionCompany model will be deprecated in favor of using the Brand model directly.
    """
    
    def __init__(self):
        super().__init__(Brand)
        self.entity_type = "production_company"  # Override entity_type for error messages
    
    @handle_database_errors
    async def get_production_companies(self, db: AsyncSession, 
                                     filters: Optional[Dict[str, Any]] = None,
                                     page: int = 1, 
                                     limit: int = 50,
                                     sort_by: str = "name", 
                                     sort_direction: str = "asc") -> Dict[str, Any]:
        """
        Get all production company brands with optional filtering.
        
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
        # Add the production company filter to any existing filters
        if not filters:
            filters = {}
        filters["company_type"] = "Production Company"
        
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
    async def create_production_company(self, db: AsyncSession, company_data: Union[ProductionCompanyCreate, Dict[str, Any]]) -> Brand:
        """
        Create a new production company brand or update if it already exists.
        
        Args:
            db: Database session
            company_data: Company data (either ProductionCompanyCreate schema or dict)
            
        Returns:
            The created or updated brand
        """
        # Convert to dict if it's a Pydantic model
        if hasattr(company_data, "dict"):
            data = company_data.dict(exclude_unset=True)
        else:
            data = company_data
        
        # Add production company defaults
        if "industry" not in data:
            data["industry"] = "Production"
        
        data["company_type"] = "Production Company"
        
        # Use the enhanced create_entity method with update_if_exists=True
        return await super().create_entity(db, data, update_if_exists=True)
    
    @handle_database_errors
    async def get_production_company(self, db: AsyncSession, company_id: UUID) -> Brand:
        """
        Get a production company by ID.
        
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
    async def get_production_company_by_name(self, db: AsyncSession, name: str) -> Brand:
        """
        Get a production company by name (case-insensitive).
        
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
    async def find_production_company(self, db: AsyncSession, search_term: str, raise_not_found: bool = False) -> Optional[Brand]:
        """
        Find a production company by name (partial match) or ID.
        
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
        
        # If found, check if it's a production company or try to filter by company_type
        if brand:
            if brand.company_type == "Production Company":
                return brand
            elif not brand.company_type:
                # If no company_type is set, update it
                brand.company_type = "Production Company"
                await db.commit()
                await db.refresh(brand)
                return brand
            
        # If not found or not a production company, search specifically for production companies
        query = select(self.model_class).where(
            (self.model_class.company_type == "Production Company") &
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
    async def update_production_company(self, db: AsyncSession, company_id: UUID, company_update: Union[ProductionCompanyUpdate, Dict[str, Any]]) -> Brand:
        """
        Update a production company.
        
        Args:
            db: Database session
            company_id: UUID of the company to update
            company_update: Company data to update (either ProductionCompanyUpdate schema or dict)
            
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
            
        # Ensure company_type remains 'Production Company'
        update_data["company_type"] = "Production Company"
            
        return await super().update_entity(db, company_id, update_data)
    
    @handle_database_errors
    async def delete_production_company(self, db: AsyncSession, company_id: UUID) -> bool:
        """
        Delete a production company.
        
        Args:
            db: Database session
            company_id: UUID of the company to delete
            
        Returns:
            True if the company was deleted
            
        Raises:
            EntityNotFoundError: If brand doesn't exist
        """
        return await super().delete_entity(db, company_id)

class ProductionServiceService(BaseEntityService[ProductionService]):
    """Service for managing production services."""
    
    def __init__(self):
        super().__init__(ProductionService)
    
    @handle_database_errors
    async def get_production_services(self, db: AsyncSession, 
                                     filters: Optional[Dict[str, Any]] = None,
                                     entity_type: Optional[str] = None, 
                                     entity_id: Optional[UUID] = None,
                                     company_id: Optional[UUID] = None,
                                     page: int = 1, 
                                     limit: int = 50,
                                     sort_by: str = "id", 
                                     sort_direction: str = "desc") -> Dict[str, Any]:
        """
        Get all production services with optional filtering.
        
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
        # Join with Brand directly to get the production company name and secondary brand
        # In our model, the production_company_id and secondary_brand_id of ProductionService point to Brand.id
        brand_alias = Brand.__table__.alias('production_company')
        secondary_brand_alias = Brand.__table__.alias('secondary_brand')
        
        query = (
            select(
                ProductionService,
                func.replace(brand_alias.c.name, ' (Brand)', '').label("production_company_name"),
                func.replace(secondary_brand_alias.c.name, ' (Brand)', '').label("secondary_brand_name")
            )
            .outerjoin(
                brand_alias,
                ProductionService.production_company_id == brand_alias.c.id
            )
            .outerjoin(
                secondary_brand_alias,
                ProductionService.secondary_brand_id == secondary_brand_alias.c.id
            )
        )
        
        # Create filters dictionary if not provided
        if not filters:
            filters = {}
            
        # Add specific filters if provided
        if entity_type:
            filters["entity_type"] = entity_type
        if entity_id:
            filters["entity_id"] = entity_id
        if company_id:
            filters["production_company_id"] = company_id
            
        # Apply filters to query
        conditions = []
        for key, value in filters.items():
            if hasattr(ProductionService, key):
                # Handle None values (IS NULL in SQL)
                if value is None:
                    conditions.append(getattr(ProductionService, key).is_(None))
                # Handle list values (IN operator in SQL)
                elif isinstance(value, list):
                    conditions.append(getattr(ProductionService, key).in_(value))
                # Handle string values with optional case-insensitive search
                elif isinstance(value, str) and key in ['entity_type']:
                    conditions.append(func.lower(getattr(ProductionService, key)) == value.lower())
                # Default exact match
                else:
                    conditions.append(getattr(ProductionService, key) == value)
        
        if conditions:
            query = query.where(*conditions)
            
        # Add sorting
        if hasattr(ProductionService, sort_by):
            sort_column = getattr(ProductionService, sort_by)
            if sort_direction.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            # Default to id sorting if requested column doesn't exist
            query = query.order_by(ProductionService.id.desc())
            
        # Count total records
        count_query = select(func.count()).select_from(ProductionService)
        if conditions:
            count_query = count_query.where(*conditions)
        total_count = await db.scalar(count_query)
        
        # Apply pagination
        query = query.offset((page - 1) * limit).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        
        # Process the results to include the company name and secondary brand
        services = []
        for record in result:
            service = record[0]
            company_name = record[1]
            secondary_brand_name = record[2]
            
            # Process the service to enrich it with additional data
            enriched_service = await self._enrich_production_service(db, service, company_name, secondary_brand_name)
            services.append(enriched_service)
            
        return {
            "items": services,
            "total": total_count or 0,
            "page": page,
            "size": limit,
            "pages": math.ceil((total_count or 0) / limit) if limit > 0 else 0
        }
    
    async def _enrich_production_service(self, db: AsyncSession, service: ProductionService, 
                                        company_name: Optional[str] = None, 
                                        secondary_brand_name: Optional[str] = None) -> ProductionService:
        """
        Enrich a production service with additional fields like entity name and display name.
        
        Args:
            db: Database session
            service: The production service to enrich
            company_name: Optional preloaded company name
            secondary_brand_name: Optional preloaded secondary brand name
            
        Returns:
            The enriched production service
        """
        # Create a copy of the service dict for modification
        service_dict = service.__dict__.copy()
        
        # Add the company name and secondary brand
        service_dict["production_company_name"] = company_name.replace(" (Brand)", "") if company_name else None
        service_dict["secondary_brand_name"] = secondary_brand_name.replace(" (Brand)", "") if secondary_brand_name else None
        
        # Generate a proper display name for the entity
        entity_name = None
        try:
            # Handle special entity types
            if service.entity_type.lower() in ('championship', 'playoff', 'playoffs', 'tournament'):
                # For special entity types, use entity_type as the entity_name
                entity_name = service.entity_type
            # Handle standard entity types
            elif service.entity_type.lower() == 'league':
                entity_lookup_result = await db.execute(
                    select(models.League).where(models.League.id == service.entity_id)
                )
                entity = entity_lookup_result.scalars().first()
                if entity:
                    entity_name = entity.name
            elif service.entity_type.lower() == 'team':
                entity_lookup_result = await db.execute(
                    select(models.Team).where(models.Team.id == service.entity_id)
                )
                entity = entity_lookup_result.scalars().first()
                if entity:
                    entity_name = entity.name
            elif service.entity_type.lower() == 'game':
                entity_lookup_result = await db.execute(
                    select(models.Game).where(models.Game.id == service.entity_id)
                )
                entity = entity_lookup_result.scalars().first()
                if entity:
                    entity_name = f"Game {entity.id}"
            elif service.entity_type.lower() in ('division', 'conference', 'division_conference'):
                entity_lookup_result = await db.execute(
                    select(models.DivisionConference).where(models.DivisionConference.id == service.entity_id)
                )
                entity = entity_lookup_result.scalars().first()
                if entity:
                    entity_name = entity.name
            else:
                # For any other entity type
                entity_name = service.entity_type.capitalize()
        except Exception as e:
            logger.warning(f"Error getting entity name: {e}")
        
        # Add the entity name
        service_dict["entity_name"] = entity_name or "Unknown Entity"
        
        # Create a proper display name that will be shown in the UI
        if company_name and entity_name:
            service_dict["name"] = f"{company_name} for {entity_name}"
        elif company_name:
            service_dict["name"] = f"{company_name} for {service.entity_type}"
        else:
            service_dict["name"] = f"Service for {entity_name or service.entity_type}"
        
        # Make sure the production_company_name is non-null - it's critical for the UI
        if not service_dict.get("production_company_name"):
            # Fallback: directly look up the brand name
            brand_query = await db.execute(
                select(Brand).where(Brand.id == service.production_company_id)
            )
            brand = brand_query.scalars().first()
            if brand:
                service_dict["production_company_name"] = brand.name.replace(" (Brand)", "")
        
        # Add the additional fields directly to the service object
        # These fields are defined in the ProductionServiceResponse schema
        setattr(service, "production_company_name", service_dict.get("production_company_name"))
        setattr(service, "secondary_brand_name", service_dict.get("secondary_brand_name"))
        setattr(service, "entity_name", service_dict.get("entity_name"))
        setattr(service, "name", service_dict.get("name"))
                
        return service
    
    @handle_database_errors
    async def create_production_service(self, db: AsyncSession, 
                                       service_data: Union[ProductionServiceCreate, Dict[str, Any]]) -> ProductionService:
        """
        Create new production service.
        
        Args:
            db: Database session
            service_data: Production service data (either ProductionServiceCreate schema or dict)
            
        Returns:
            The created production service
            
        Raises:
            ValidationError: If validation fails
        """
        # Convert to dict if it's a Pydantic model
        if hasattr(service_data, "dict"):
            data = service_data.dict()
        else:
            data = service_data
            
        # Validate production company exists (now a Brand)
        await EntityValidator.validate_production_company(db, data["production_company_id"])
        
        # Validate secondary brand if provided
        if data.get("secondary_brand_id"):
            await EntityValidator.validate_brand(db, data["secondary_brand_id"])
        
        # Handle special entity types
        entity_type = data["entity_type"].lower()
        entity_id = data["entity_id"]
        
        # For special entity types, create a deterministic UUID
        if entity_type in ('championship', 'playoff', 'playoffs', 'tournament'):
            logger.info(f"Creating production service for special entity type: {entity_type}, name: {entity_id}")
            
            # For special types with string IDs, generate a UUID
            if not isinstance(entity_id, UUID):
                # Use a deterministic UUID based on the entity type and name
                import hashlib
                name_hash = hashlib.md5(f"{entity_type}:{entity_id}".encode()).hexdigest()
                generated_uuid = UUID(name_hash[:32])
                logger.info(f"Generated UUID {generated_uuid} for {entity_type}: {entity_id}")
                data['entity_id'] = generated_uuid
        else:
            # For regular entity types, validate entity exists
            await EntityValidator.validate_entity_type_and_id(db, data["entity_type"], data["entity_id"])
        
        # Create the entity using the base service method
        service = await super().create_entity(db, data)
        
        # Return enriched service
        return await self.get_production_service(db, service.id)
    
    @handle_database_errors
    async def get_production_service(self, db: AsyncSession, service_id: UUID) -> ProductionService:
        """
        Get production service by ID with enriched fields.
        
        Args:
            db: Database session
            service_id: UUID of the service to get
            
        Returns:
            The production service if found
            
        Raises:
            EntityNotFoundError: If service doesn't exist
        """
        # First get the basic service using the base method
        service = await super().get_entity(db, service_id)
        
        # Now join with brands to get names
        brand_alias = Brand.__table__.alias('production_company')
        secondary_brand_alias = Brand.__table__.alias('secondary_brand')
        
        query = (
            select(
                func.replace(brand_alias.c.name, ' (Brand)', '').label("production_company_name"),
                func.replace(secondary_brand_alias.c.name, ' (Brand)', '').label("secondary_brand_name")
            )
            .outerjoin(
                brand_alias,
                service.production_company_id == brand_alias.c.id
            )
            .outerjoin(
                secondary_brand_alias,
                service.secondary_brand_id == secondary_brand_alias.c.id
            )
        )
        
        result = await db.execute(query)
        record = result.first()
        
        company_name = record[0] if record else None
        secondary_brand_name = record[1] if record else None
        
        # Enrich the service with additional fields
        return await self._enrich_production_service(db, service, company_name, secondary_brand_name)
    
    @handle_database_errors
    async def update_production_service(self, db: AsyncSession, 
                                       service_id: UUID, 
                                       service_update: Union[ProductionServiceUpdate, Dict[str, Any]]) -> ProductionService:
        """
        Update production service.
        
        Args:
            db: Database session
            service_id: UUID of the service to update
            service_update: Service data to update (either ProductionServiceUpdate schema or dict)
            
        Returns:
            The updated production service
            
        Raises:
            EntityNotFoundError: If service doesn't exist
            ValidationError: If validation fails
        """
        # Get the current service to check entity_type later
        db_service = await self.get_entity(db, service_id)
        
        # Convert to dict if it's a Pydantic model
        if hasattr(service_update, "dict"):
            update_data = service_update.dict(exclude_unset=True)
        else:
            update_data = service_update
        
        # Perform validations for updated fields
        if 'production_company_id' in update_data:
            await EntityValidator.validate_production_company(db, update_data['production_company_id'])
            
        # Validate secondary brand if provided
        if 'secondary_brand_id' in update_data and update_data['secondary_brand_id']:
            await EntityValidator.validate_brand(db, update_data['secondary_brand_id'])
            
        # Validate entity type/id if provided
        if 'entity_type' in update_data and 'entity_id' in update_data:
            entity_type = update_data['entity_type'].lower()
            entity_id = update_data['entity_id']
            
            # For special entity types
            if entity_type in ('championship', 'playoff', 'playoffs', 'tournament'):
                if not isinstance(entity_id, UUID):
                    # Generate deterministic UUID
                    import hashlib
                    name_hash = hashlib.md5(f"{entity_type}:{entity_id}".encode()).hexdigest()
                    generated_uuid = UUID(name_hash[:32])
                    update_data['entity_id'] = generated_uuid
            else:
                # For regular entity types
                await EntityValidator.validate_entity_type_and_id(db, update_data['entity_type'], update_data['entity_id'])
        elif 'entity_id' in update_data:
            await EntityValidator.validate_entity_type_and_id(db, db_service.entity_type, update_data['entity_id'])
        
        # Update the entity using the base service method
        updated_service = await super().update_entity(db, service_id, update_data)
        
        # Return enriched service
        return await self.get_production_service(db, service_id)
    
    @handle_database_errors
    async def delete_production_service(self, db: AsyncSession, service_id: UUID) -> bool:
        """
        Delete production service.
        
        Args:
            db: Database session
            service_id: UUID of the service to delete
            
        Returns:
            True if the service was deleted
            
        Raises:
            EntityNotFoundError: If service doesn't exist
        """
        return await super().delete_entity(db, service_id)