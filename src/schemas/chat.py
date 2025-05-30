from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator

class ConversationCreate(BaseModel):
    """Schema for creating a new conversation."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class ConversationUpdate(BaseModel):
    """Schema for updating a conversation."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None

class MessageBase(BaseModel):
    """Base schema for chat messages."""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)
    meta_data: Optional[Dict] = Field(default_factory=dict)

class MessageCreate(MessageBase):
    """Schema for creating a new message."""
    structured_format: Optional[Dict] = None
    selected_llm: Optional[str] = None

class MessageResponse(MessageBase):
    """Schema for message responses."""
    id: UUID
    conversation_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

class ConversationResponse(BaseModel):
    """Schema for conversation responses."""
    id: UUID
    title: str
    description: Optional[str]
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    order: Optional[int] = None
    messages: List[MessageResponse]
    meta_data: Dict

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

class ChatResponse(BaseModel):
    """Schema for chat responses."""
    message: str
    structured_data: Optional[Dict] = None

class ConversationListItem(BaseModel):
    """Schema for conversation list items (without messages)."""
    id: UUID
    title: str
    description: Optional[str]
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    order: Optional[int] = None
    meta_data: Dict

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

class ConversationList(BaseModel):
    """Schema for paginated conversation list."""
    items: List[ConversationListItem]
    total: int
    skip: int
    limit: int

class ConversationOrderUpdate(BaseModel):
    """Schema for updating conversation order."""
    id: UUID
    order: int 