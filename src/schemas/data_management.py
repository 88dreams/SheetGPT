from typing import Dict, List, Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field, validator
from datetime import datetime

class ColumnBase(BaseModel):
    """Base schema for column configuration."""
    name: str = Field(..., min_length=1, max_length=100)
    data_type: str = Field(..., min_length=1, max_length=50)
    format: Optional[str] = None
    formula: Optional[str] = None
    order: int = Field(..., ge=0)
    is_active: bool = True
    meta_data: Dict[str, Any] = Field(default_factory=dict)

class ColumnCreate(ColumnBase):
    """Schema for creating a new column."""
    pass

class ColumnUpdate(BaseModel):
    """Schema for updating a column."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    data_type: Optional[str] = None
    format: Optional[str] = None
    formula: Optional[str] = None
    order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    meta_data: Optional[Dict[str, Any]] = None

class ColumnResponse(ColumnBase):
    """Schema for column response."""
    id: UUID
    structured_data_id: UUID

    model_config = {
        "from_attributes": True
    }

class DataUpdate(BaseModel):
    """Schema for updating cell values."""
    column_name: str
    row_index: int
    value: Any

class StructuredDataBase(BaseModel):
    """Base schema for structured data."""
    data_type: str
    schema_version: str
    data: Dict[str, Any]
    meta_data: Dict[str, Any] = Field(default_factory=dict)

class StructuredDataCreate(StructuredDataBase):
    """Schema for creating structured data."""
    conversation_id: UUID

class StructuredDataUpdate(BaseModel):
    """Schema for updating structured data."""
    data_type: Optional[str] = None
    schema_version: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    meta_data: Optional[Dict[str, Any]] = None

class StructuredDataResponse(BaseModel):
    """Schema for structured data responses."""
    id: UUID
    conversation_id: UUID
    data_type: str
    schema_version: str
    data: Dict[str, Any]
    meta_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    columns: List[ColumnResponse]

    model_config = {
        "from_attributes": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }
    }
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

class DataChangeHistoryResponse(BaseModel):
    """Schema for change history response."""
    id: UUID
    structured_data_id: UUID
    user_id: UUID
    change_type: str
    column_name: Optional[str]
    row_index: Optional[int]
    old_value: Optional[str]
    new_value: Optional[str]
    created_at: str
    meta_data: Dict[str, Any]

    model_config = {
        "from_attributes": True
    }
        
    @validator('created_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

ColumnResponse.model_rebuild()
StructuredDataResponse.model_rebuild() 