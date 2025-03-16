from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import BroadcastCompany, BroadcastRights, DivisionConference
from src.schemas.sports import BroadcastCompanyCreate, BroadcastCompanyUpdate, BroadcastRightsCreate, BroadcastRightsUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator

logger = logging.getLogger(__name__)

class BroadcastCompanyService(BaseEntityService[BroadcastCompany]):
    """Service for managing broadcast companies."""
    
    def __init__(self):
        super().__init__(BroadcastCompany)
    
    async def get_broadcast_companies(self, db: AsyncSession) -> List[BroadcastCompany]:
        """Get all broadcast companies."""
        result = await db.execute(select(BroadcastCompany))
        return result.scalars().all()
    
    async def create_broadcast_company(self, db: AsyncSession, company: BroadcastCompanyCreate) -> BroadcastCompany:
        """Create a new broadcast company or update if it already exists."""
        # Check if a company with the same name already exists
        existing_company = await db.execute(
            select(BroadcastCompany).where(BroadcastCompany.name == company.name)
        )
        db_company = existing_company.scalars().first()

        if db_company:
            # Update existing company
            for key, value in company.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(db_company, key, value)
        else:
            # Create new company
            db_company = BroadcastCompany(**company.dict())
            db.add(db_company)
        
        try:
            await db.commit()
            await db.refresh(db_company)
            return db_company
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating broadcast company: {str(e)}")
            raise
    
    async def get_broadcast_company(self, db: AsyncSession, company_id: UUID) -> Optional[BroadcastCompany]:
        """Get a broadcast company by ID."""
        return await super().get_entity(db, company_id)
    
    async def update_broadcast_company(self, db: AsyncSession, company_id: UUID, company_update: BroadcastCompanyUpdate) -> Optional[BroadcastCompany]:
        """Update a broadcast company."""
        # First get the company
        result = await db.execute(select(BroadcastCompany).where(BroadcastCompany.id == company_id))
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
            logger.error(f"Error updating broadcast company: {str(e)}")
            raise
    
    async def delete_broadcast_company(self, db: AsyncSession, company_id: UUID) -> bool:
        """Delete a broadcast company."""
        return await super().delete_entity(db, company_id)

class BroadcastRightsService(BaseEntityService[BroadcastRights]):
    """Service for managing broadcast rights."""
    
    def __init__(self):
        super().__init__(BroadcastRights)
    
    async def get_broadcast_rights(self, db: AsyncSession, 
                                   entity_type: Optional[str] = None, 
                                   entity_id: Optional[UUID] = None,
                                   company_id: Optional[UUID] = None) -> List[BroadcastRights]:
        """Get all broadcast rights, optionally filtered."""
        query = select(BroadcastRights)
        
        if entity_type:
            query = query.where(BroadcastRights.entity_type == entity_type)
            
        if entity_id:
            query = query.where(BroadcastRights.entity_id == entity_id)
            
        if company_id:
            query = query.where(BroadcastRights.broadcast_company_id == company_id)
            
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_broadcast_rights(self, db: AsyncSession, rights: BroadcastRightsCreate) -> BroadcastRights:
        """Create new broadcast rights."""
        # Validate broadcast company exists
        await EntityValidator.validate_broadcast_company(db, rights.broadcast_company_id)
        
        # Validate division/conference if provided
        if rights.division_conference_id:
            await EntityValidator.validate_division_conference(db, rights.division_conference_id)
        
        # Validate that the entity exists
        await EntityValidator.validate_entity_type_and_id(db, rights.entity_type, rights.entity_id)
        
        # Create new broadcast rights
        db_rights = BroadcastRights(**rights.dict())
        db.add(db_rights)
        
        try:
            await db.commit()
            await db.refresh(db_rights)
            return db_rights
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating broadcast rights: {str(e)}")
            raise
    
    async def get_broadcast_right(self, db: AsyncSession, rights_id: UUID) -> Optional[BroadcastRights]:
        """Get broadcast rights by ID."""
        return await super().get_entity(db, rights_id)
    
    async def update_broadcast_rights(self, db: AsyncSession, rights_id: UUID, rights_update: BroadcastRightsUpdate) -> Optional[BroadcastRights]:
        """Update broadcast rights."""
        # First get the broadcast rights
        result = await db.execute(select(BroadcastRights).where(BroadcastRights.id == rights_id))
        db_rights = result.scalars().first()
        
        if not db_rights:
            return None
        
        # Update attributes
        update_data = rights_update.dict(exclude_unset=True)
        
        # Perform validations for updated fields
        if 'broadcast_company_id' in update_data:
            await EntityValidator.validate_broadcast_company(db, update_data['broadcast_company_id'])
            
        if 'division_conference_id' in update_data and update_data['division_conference_id'] is not None:
            await EntityValidator.validate_division_conference(db, update_data['division_conference_id'])
            
        if 'entity_type' in update_data and 'entity_id' in update_data:
            await EntityValidator.validate_entity_type_and_id(db, update_data['entity_type'], update_data['entity_id'])
        elif 'entity_id' in update_data:
            await EntityValidator.validate_entity_type_and_id(db, db_rights.entity_type, update_data['entity_id'])
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_rights, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_rights)
            return db_rights
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating broadcast rights: {str(e)}")
            raise
    
    async def delete_broadcast_rights(self, db: AsyncSession, rights_id: UUID) -> bool:
        """Delete broadcast rights."""
        return await super().delete_entity(db, rights_id)