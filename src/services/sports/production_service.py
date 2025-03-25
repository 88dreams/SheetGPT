from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select, func
import importlib

from src.models.sports_models import ProductionCompany, ProductionService, Brand
from src.models import sports_models as models
from src.schemas.sports import ProductionCompanyCreate, ProductionCompanyUpdate, ProductionServiceCreate, ProductionServiceUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator

logger = logging.getLogger(__name__)

class ProductionCompanyService(BaseEntityService[ProductionCompany]):
    """Service for managing production companies."""
    
    def __init__(self):
        super().__init__(ProductionCompany)
    
    async def get_production_companies(self, db: AsyncSession) -> List[ProductionCompany]:
        """Get all production companies."""
        result = await db.execute(select(ProductionCompany))
        return result.scalars().all()
    
    async def create_production_company(self, db: AsyncSession, company: ProductionCompanyCreate) -> ProductionCompany:
        """Create a new production company or update if it already exists."""
        # Check if a company with the same name already exists
        existing_company = await db.execute(
            select(ProductionCompany).where(ProductionCompany.name == company.name)
        )
        db_company = existing_company.scalars().first()

        if db_company:
            # Update existing company
            for key, value in company.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(db_company, key, value)
        else:
            # Create new company
            db_company = ProductionCompany(**company.dict())
            db.add(db_company)
        
        try:
            await db.commit()
            await db.refresh(db_company)
            return db_company
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating production company: {str(e)}")
            raise
    
    async def get_production_company(self, db: AsyncSession, company_id: UUID) -> Optional[ProductionCompany]:
        """Get a production company by ID."""
        return await super().get_entity(db, company_id)
    
    async def update_production_company(self, db: AsyncSession, company_id: UUID, company_update: ProductionCompanyUpdate) -> Optional[ProductionCompany]:
        """Update a production company."""
        # First get the company
        result = await db.execute(select(ProductionCompany).where(ProductionCompany.id == company_id))
        db_company = result.scalars().first()
        
        if not db_company:
            return None
        
        # Update company attributes
        update_data = company_update.dict(exclude_unset=True)
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_company, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_company)
            return db_company
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating production company: {str(e)}")
            raise
    
    async def delete_production_company(self, db: AsyncSession, company_id: UUID) -> bool:
        """Delete a production company."""
        return await super().delete_entity(db, company_id)

class ProductionServiceService(BaseEntityService[ProductionService]):
    """Service for managing production services."""
    
    def __init__(self):
        super().__init__(ProductionService)
    
    async def get_production_services(self, db: AsyncSession, 
                                     entity_type: Optional[str] = None, 
                                     entity_id: Optional[UUID] = None,
                                     company_id: Optional[UUID] = None) -> List[ProductionService]:
        """Get all production services, optionally filtered."""
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
        
        if entity_type:
            query = query.where(ProductionService.entity_type == entity_type)
            
        if entity_id:
            query = query.where(ProductionService.entity_id == entity_id)
            
        if company_id:
            query = query.where(ProductionService.production_company_id == company_id)
            
        result = await db.execute(query)
        
        # Process the results to include the company name and secondary brand
        services = []
        for record in result:
            service = record[0]
            company_name = record[1]
            secondary_brand_name = record[2]
            
            # Add the company name and secondary brand name to the service object
            service_dict = service.__dict__.copy()
            service_dict["production_company_name"] = company_name.replace(" (Brand)", "") if company_name else None
            service_dict["secondary_brand_name"] = secondary_brand_name.replace(" (Brand)", "") if secondary_brand_name else None
            
            # Generate a proper display name for the entity
            entity_name = None
            try:
                if service.entity_type.lower() in ('championship', 'playoff', 'playoffs'):
                    # For special entity types, use entity_type as the entity_name
                    entity_name = service.entity_type
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
            
            # Create a ProductionService object with the core fields
            updated_service = ProductionService()
            for key, value in service_dict.items():
                if hasattr(updated_service, key):
                    setattr(updated_service, key, value)
            
            # Make sure the production_company_name is non-null - it's critical for the UI
            if not service_dict.get("production_company_name"):
                # Fallback: directly look up the brand name
                brand_query = await db.execute(
                    select(Brand).where(Brand.id == service.production_company_id)
                )
                brand = brand_query.scalars().first()
                if brand:
                    service_dict["production_company_name"] = brand.name.replace(" (Brand)", "")
            
            # Dynamically add the additional fields for the response
            # These will be included in the API response because of our schema
            setattr(updated_service, "production_company_name", service_dict.get("production_company_name"))
            setattr(updated_service, "secondary_brand_name", service_dict.get("secondary_brand_name"))
            setattr(updated_service, "entity_name", service_dict.get("entity_name"))
            setattr(updated_service, "name", service_dict.get("name"))
            
            services.append(updated_service)
            
        return services
    
    async def create_production_service(self, db: AsyncSession, service: ProductionServiceCreate) -> ProductionService:
        """Create new production service."""
        # Validate production company exists
        await EntityValidator.validate_production_company(db, service.production_company_id)
        
        # Validate secondary brand if provided
        if service.secondary_brand_id:
            try:
                await EntityValidator.validate_brand(db, service.secondary_brand_id)
            except AttributeError:
                # If validate_brand doesn't exist, fall back to more generic validation
                brand_result = await db.execute(select(Brand).where(Brand.id == service.secondary_brand_id))
                if not brand_result.scalars().first():
                    raise ValueError(f"Secondary brand with ID {service.secondary_brand_id} not found")
        
        # Handle special entity types
        entity_type = service.entity_type.lower()
        entity_id = service.entity_id
        
        # For special entity types, skip validation
        if entity_type in ('championship', 'playoff', 'playoffs'):
            logger.info(f"Creating production service for special entity type: {entity_type}, name: {entity_id}")
            
            # Create service dict with all fields
            service_dict = service.dict()
            
            # For special types with string IDs, generate a UUID
            if not isinstance(entity_id, UUID):
                # Use a deterministic UUID based on the entity type and name
                import hashlib
                name_hash = hashlib.md5(f"{entity_type}:{entity_id}".encode()).hexdigest()
                generated_uuid = UUID(name_hash[:32])
                logger.info(f"Generated UUID {generated_uuid} for {entity_type}: {entity_id}")
                service_dict['entity_id'] = generated_uuid
            
            # Create new production service with the dict
            db_service = ProductionService(**service_dict)
            db.add(db_service)
        else:
            # For regular entity types, validate entity exists
            await EntityValidator.validate_entity_type_and_id(db, service.entity_type, service.entity_id)
            
            # Create new production service
            db_service = ProductionService(**service.dict())
            db.add(db_service)
        
        try:
            await db.commit()
            await db.refresh(db_service)
            return db_service
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating production service: {str(e)}")
            raise
    
    async def get_production_service(self, db: AsyncSession, service_id: UUID) -> Optional[ProductionService]:
        """Get production service by ID."""
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
            .where(ProductionService.id == service_id)
        )
        
        result = await db.execute(query)
        record = result.first()
        
        if not record:
            return None
            
        service = record[0]
        company_name = record[1]
        secondary_brand_name = record[2]
        
        # Add the company name and secondary brand to the service object
        service_dict = service.__dict__.copy()
        service_dict["production_company_name"] = company_name.replace(" (Brand)", "") if company_name else None
        service_dict["secondary_brand_name"] = secondary_brand_name.replace(" (Brand)", "") if secondary_brand_name else None
        
        # Generate a proper display name for the entity
        entity_name = None
        try:
            if service.entity_type.lower() in ('championship', 'playoff', 'playoffs'):
                # For special entity types, use entity_type as the entity_name
                entity_name = service.entity_type
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
    
    async def update_production_service(self, db: AsyncSession, service_id: UUID, service_update: ProductionServiceUpdate) -> Optional[ProductionService]:
        """Update production service."""
        # First get the production service
        result = await db.execute(select(ProductionService).where(ProductionService.id == service_id))
        db_service = result.scalars().first()
        
        if not db_service:
            return None
        
        # Update attributes
        update_data = service_update.dict(exclude_unset=True)
        
        # Perform validations for updated fields
        if 'production_company_id' in update_data:
            await EntityValidator.validate_production_company(db, update_data['production_company_id'])
            
        # Validate secondary brand if provided
        if 'secondary_brand_id' in update_data and update_data['secondary_brand_id']:
            try:
                await EntityValidator.validate_brand(db, update_data['secondary_brand_id'])
            except AttributeError:
                # If validate_brand doesn't exist, fall back to more generic validation
                brand_result = await db.execute(select(Brand).where(Brand.id == update_data['secondary_brand_id']))
                if not brand_result.scalars().first():
                    raise ValueError(f"Secondary brand with ID {update_data['secondary_brand_id']} not found")
            
        if 'entity_type' in update_data and 'entity_id' in update_data:
            await EntityValidator.validate_entity_type_and_id(db, update_data['entity_type'], update_data['entity_id'])
        elif 'entity_id' in update_data:
            await EntityValidator.validate_entity_type_and_id(db, db_service.entity_type, update_data['entity_id'])
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_service, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_service)
            
            # Get the updated service with enhanced information
            return await self.get_production_service(db, service_id)
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating production service: {str(e)}")
            raise
    
    async def delete_production_service(self, db: AsyncSession, service_id: UUID) -> bool:
        """Delete production service."""
        return await super().delete_entity(db, service_id)