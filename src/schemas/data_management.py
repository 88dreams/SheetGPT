from typing import Optional, Any
from pydantic import BaseModel, Field

class ColumnCreate(BaseModel):
    """Schema for creating a new column."""
    name: str = Field(..., min_length=1, max_length=100)
    data_type: str = Field(..., min_length=1, max_length=50)
    format: Optional[str] = None
    formula: Optional[str] = None
    order: Optional[int] = None

class ColumnUpdate(BaseModel):
    """Schema for updating a column."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    data_type: Optional[str] = None
    format: Optional[str] = None
    formula: Optional[str] = None
    order: Optional[int] = None

class RowOperation(BaseModel):
    """Schema for row operations."""
    data: dict[str, Any]

class DataUpdate(BaseModel):
    """Schema for updating cell values."""
    column_name: str
    row_index: int
    value: Any 