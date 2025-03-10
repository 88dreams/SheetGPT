from typing import TypeVar, Generic, Optional, List
from pydantic import BaseModel
from uuid import UUID

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response model."""
    items: List[T]
    total: int
    page: int
    size: int
    pages: int
    
class ApiSuccess(BaseModel):
    """Standard API success response."""
    success: bool
    message: str 