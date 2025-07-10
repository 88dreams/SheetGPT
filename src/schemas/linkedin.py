"""
Pydantic schemas for LinkedIn integration.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class LinkedInAccountBase(BaseModel):
    """Base schema for LinkedIn account data."""
    user_id: UUID
    linkedin_id: str


class LinkedInAccountCreate(LinkedInAccountBase):
    """Schema for creating a new LinkedIn account."""
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: datetime


class LinkedInAccountUpdate(BaseModel):
    """Schema for updating a LinkedIn account."""
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    last_synced: Optional[datetime] = None


class LinkedInAccount(LinkedInAccountBase):
    """Schema for LinkedIn account responses."""
    id: int
    last_synced: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class LinkedInAccountForBackgroundTask(BaseModel):
    """Schema for representing a LinkedIn account in background tasks."""
    id: int
    user_id: UUID
    linkedin_id: str
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: datetime
    last_synced: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class LinkedInConnectionBase(BaseModel):
    """Base schema for LinkedIn connection data."""
    user_id: UUID
    linkedin_profile_id: str
    full_name: str
    connection_degree: int = Field(1, ge=1, le=2)


class LinkedInConnectionCreate(LinkedInConnectionBase):
    """Schema for creating a new LinkedIn connection."""
    company_name: Optional[str] = None
    position: Optional[str] = None


class LinkedInConnection(LinkedInConnectionBase):
    """Schema for LinkedIn connection responses."""
    id: int
    company_name: Optional[str] = None
    position: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class BrandConnectionBase(BaseModel):
    """Base schema for brand connection data."""
    user_id: UUID
    brand_id: UUID


class BrandConnectionCreate(BrandConnectionBase):
    """Schema for creating a brand connection record."""
    first_degree_count: int = 0
    second_degree_count: int = 0


class BrandConnection(BrandConnectionBase):
    """Schema for brand connection responses."""
    id: int
    first_degree_count: int
    second_degree_count: int
    last_updated: datetime

    class Config:
        orm_mode = True


class BrandConnectionResponse(BaseModel):
    """Enhanced brand connection response with brand details."""
    brand_id: UUID
    brand_name: str
    industry: Optional[str] = None
    company_type: Optional[str] = None
    first_degree_count: int
    second_degree_count: int
    total_connections: int


class LinkedInStatusResponse(BaseModel):
    """Response schema for LinkedIn connection status."""
    is_connected: bool
    profile_name: Optional[str] = None
    connection_count: Optional[int] = None
    last_synced: Optional[datetime] = None