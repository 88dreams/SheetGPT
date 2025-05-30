from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any, Union, Literal
from uuid import UUID
from datetime import date, datetime

# Import BrandRead from sports schemas
from src.schemas.sports import BrandRead 

# Base schemas for Contact
class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    linkedin_url: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    connected_on: Optional[date] = None
    notes: Optional[str] = None
    import_source_tag: Optional[str] = None

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    linkedin_url: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    connected_on: Optional[date] = None
    notes: Optional[str] = None

class ContactResponse(ContactBase):
    id: UUID
    user_id: UUID
    created_at: str
    updated_at: str
    email: Optional[str] = None
    
    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for ContactBrandAssociation
class ContactBrandAssociationBase(BaseModel):
    contact_id: UUID
    brand_id: UUID
    confidence_score: float = 1.0
    association_type: str = "employed_at"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = True
    is_primary: bool = True

class ContactBrandAssociationCreate(ContactBrandAssociationBase):
    pass

class ContactBrandAssociationUpdate(BaseModel):
    confidence_score: Optional[float] = None
    association_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    is_primary: Optional[bool] = None

class ContactBrandAssociationResponse(ContactBrandAssociationBase):
    id: UUID
    created_at: str
    updated_at: str
    brand: Optional[BrandRead] = None
    contact_name: Optional[str] = None
    
    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Enhanced response with brand associations
class ContactWithBrandsResponse(ContactResponse):
    brand_associations: List[ContactBrandAssociationResponse] = []

# Schema for CSV import
class ContactCSVImport(BaseModel):
    file_data: List[Dict[str, str]]

class ContactCSVRow(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    connected_on: Optional[str] = None

class ContactImportRequest(BaseModel):
    file_content: List[ContactCSVRow]
    auto_match_brands: bool = True
    match_threshold: float = 0.6

class ContactImportStats(BaseModel):
    total_contacts_in_file: int
    processed_rows: int
    imported_contacts: int
    updated_contacts: int
    matched_brands_associated: int
    import_errors: List[Dict[str, Any]] = []
    
class ContactListParams(BaseModel):
    skip: int = 0
    limit: int = 100
    search: Optional[str] = None
    brand_id: Optional[UUID] = None
    sort_by: Optional[str] = "last_name"
    sort_order: Optional[str] = "asc"

# Schema for bulk updating contact tags
class BulkUpdateTagRequest(BaseModel):
    new_tag: str = Field(..., min_length=1, description="The new import source tag to apply.")
    target_contacts: Literal["all", "all_untagged"] = Field("all_untagged", description="Which contacts to target: 'all' or 'all_untagged'.")

class BulkUpdateSpecificContactsTagRequest(BaseModel):
    """Schema for updating the import source tag for a list of specific contact IDs."""
    contact_ids: List[UUID] = Field(..., min_items=1)
    new_tag: str = Field(..., min_length=1, max_length=255)

class ContactFullResponse(ContactResponse):
    brand_associations: List[ContactBrandAssociationResponse] = []

# Schema for single contact import via Save and Next
class SingleContactImportRequest(BaseModel):
    contact_data: Dict[str, Optional[str]]
    import_source_tag: Optional[str] = None
    auto_match_brands: bool = True
    match_threshold: float = Field(0.6, ge=0.0, le=1.0)