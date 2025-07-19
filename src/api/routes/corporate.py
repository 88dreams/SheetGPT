from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.sports import CorporateCreate, CorporateUpdate, CorporateRead
from src.services.sports.corporate_service import CorporateService
from src.utils.database import get_db
from src.utils.security import get_current_user_id

router = APIRouter(tags=["corporate"])
corporate_service = CorporateService()

@router.post("/", response_model=CorporateRead, status_code=status.HTTP_201_CREATED)
async def create_corporate(
    corporate_in: CorporateCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id) # Add security later if needed
):
    """Create a new corporate entity."""
    return await corporate_service.create(db, corporate_in)

@router.get("/", response_model=List[CorporateRead])
async def get_all_corporates(
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """Get all corporate entities."""
    return await corporate_service.get_all(db)

@router.get("/{corporate_id}", response_model=CorporateRead)
async def get_corporate(
    corporate_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """Get a corporate entity by ID."""
    db_corporate = await corporate_service.get_by_id(db, corporate_id)
    if not db_corporate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Corporate entity not found")
    return db_corporate

@router.put("/{corporate_id}", response_model=CorporateRead)
async def update_corporate(
    corporate_id: UUID,
    corporate_in: CorporateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """Update a corporate entity."""
    updated_corporate = await corporate_service.update(db, corporate_id, corporate_in)
    if not updated_corporate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Corporate entity not found")
    return updated_corporate

@router.delete("/{corporate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_corporate(
    corporate_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """Delete a corporate entity."""
    deleted = await corporate_service.delete(db, corporate_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Corporate entity not found")
    return 