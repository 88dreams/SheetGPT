from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import logging
import math
from sqlalchemy import select, func
import importlib

from src.models.sports_models import ProductionService, Brand
from src.models import sports_models as models
from src.schemas.sports import ProductionCompanyCreate, ProductionCompanyUpdate, ProductionServiceCreate, ProductionServiceUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator
from src.utils.errors import handle_database_errors
from src.services.sports.entity_name_resolver import EntityNameResolver

logger = logging.getLogger(__name__)

class ProductionServiceService(BaseEntityService[ProductionService]):
    """Service for managing production services."""
    
    def __init__(self):
        super().__init__(ProductionService)
        self.entity_type = "production_service"

    @handle_database_errors
    async def get_production_services(self, db: AsyncSession, 
                                     entity_type: Optional[str] = None, 
                                     entity_id: Optional[UUID] = None,
                                     company_id: Optional[UUID] = None) -> List[Dict[str, Any]]:
        """Get all production services, optionally filtered."""
        query = select(ProductionService)
        if entity_type:
            query = query.where(ProductionService.entity_type == entity_type)
        if entity_id:
            query = query.where(ProductionService.entity_id == entity_id)
        if company_id:
            query = query.where(ProductionService.production_company_id == company_id)
        
        result = await db.execute(query)
        services = result.scalars().all()
        
        return [await self._enrich_production_service(db, service) for service in services]

    @handle_database_errors
    async def create_production_service(
        self, db: AsyncSession, service_data: Union[ProductionServiceCreate, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create a new production service.
        """
        if isinstance(service_data, ProductionServiceCreate):
            data = service_data.model_dump(exclude_unset=True)
        else:
            data = service_data

        if "production_company_id" not in data:
            raise ValueError("production_company_id is required")
        await EntityValidator.validate_production_company(db, data["production_company_id"])
        
        if data.get("secondary_brand_id"):
            await EntityValidator.validate_brand(db, data["secondary_brand_id"])
        
        if "entity_type" in data and "entity_id" in data:
            await EntityValidator.validate_entity_type_and_id(db, data["entity_type"], data["entity_id"])
        else:
            raise ValueError("entity_type and entity_id are required")

        if not data.get("name"):
            entity_name = await EntityNameResolver.get_entity_name_by_id(db, data["entity_type"], data["entity_id"])
            if entity_name:
                data["name"] = f"{entity_name} Production"

        new_service = await super().create_entity(db, data)
        
        if not new_service:
            raise ValueError("Failed to create production service")

        enriched_service = await self._enrich_production_service(db, new_service)
        return enriched_service
    
    @handle_database_errors
    async def get_production_service(self, db: AsyncSession, service_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Get production service by ID with enriched fields.
        """
        service = await super().get_entity(db, service_id)
        
        if not service:
            return None
            
        return await self._enrich_production_service(db, service)
    
    @handle_database_errors
    async def get_production_services_by_entity(self, db: AsyncSession, entity_type: str, entity_id: UUID) -> List[Dict[str, Any]]:
        """
        Get all production services for a specific entity type and ID.
        """
        query = select(self.model_class).where(
            (self.model_class.entity_type == entity_type) &
            (self.model_class.entity_id == entity_id)
        )
        result = await db.execute(query)
        services = result.scalars().all()
        
        return [await self._enrich_production_service(db, service) for service in services]

    async def _enrich_production_service(self, db: AsyncSession, service: ProductionService) -> Dict[str, Any]:
        """Enrich a production service with related entity names."""
        
        service_dict = {c.key: getattr(service, c.key) for c in service.__table__.columns}
        
        if service.production_company_id:
            prod_company = await db.get(Brand, service.production_company_id)
            service_dict["production_company_name"] = prod_company.name if prod_company else None
        else:
            service_dict["production_company_name"] = None
        
        if service.secondary_brand_id:
            sec_brand = await db.get(Brand, service.secondary_brand_id)
            service_dict["secondary_brand_name"] = sec_brand.name if sec_brand else None
        
        entity_name = await EntityNameResolver.get_entity_name_by_id(db, service.entity_type, service.entity_id)
        service_dict["entity_name"] = entity_name
        
        return service_dict
        
    @handle_database_errors
    async def update_production_service(
        self, db: AsyncSession, service_id: UUID, service_update: Union[ProductionServiceUpdate, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Update a production service.
        """
        if isinstance(service_update, ProductionServiceUpdate):
            update_data = service_update.model_dump(exclude_unset=True)
        else:
            update_data = service_update
            
        if "production_company_id" in update_data:
            await EntityValidator.validate_production_company(db, update_data["production_company_id"])
            
        if "secondary_brand_id" in update_data and update_data["secondary_brand_id"] is not None:
            await EntityValidator.validate_brand(db, update_data["secondary_brand_id"])
            
        if "entity_type" in update_data and "entity_id" in update_data:
            await EntityValidator.validate_entity_type_and_id(db, update_data["entity_type"], update_data["entity_id"])
        elif "entity_id" in update_data:
            original_service = await super().get_entity(db, service_id)
            if original_service:
                await EntityValidator.validate_entity_type_and_id(db, original_service.entity_type, update_data["entity_id"])
        
        updated_service = await super().update_entity(db, service_id, update_data)

        if not updated_service:
            raise ValueError(f"Failed to update production service with ID {service_id}")
            
        return await self._enrich_production_service(db, updated_service)
    
    @handle_database_errors
    async def delete_production_service(self, db: AsyncSession, service_id: UUID) -> bool:
        """Delete a production service."""
        return await super().delete_entity(db, service_id)
