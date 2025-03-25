from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import ProductionCompany, ProductionService
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
        query = select(ProductionService)
        
        if entity_type:
            query = query.where(ProductionService.entity_type == entity_type)
            
        if entity_id:
            query = query.where(ProductionService.entity_id == entity_id)
            
        if company_id:
            query = query.where(ProductionService.production_company_id == company_id)
            
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_production_service(self, db: AsyncSession, service: ProductionServiceCreate) -> ProductionService:
        """Create new production service."""
        # Validate production company exists
        await EntityValidator.validate_production_company(db, service.production_company_id)
        
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
        return await super().get_entity(db, service_id)
    
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
            return db_service
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating production service: {str(e)}")
            raise
    
    async def delete_production_service(self, db: AsyncSession, service_id: UUID) -> bool:
        """Delete production service."""
        return await super().delete_entity(db, service_id)