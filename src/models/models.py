from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
from uuid import UUID, uuid4

from src.models.base import TimestampedBase

class User(TimestampedBase):
    """User model for authentication and tracking."""
    
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    is_admin: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    # Relationships
    conversations: Mapped[List["Conversation"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )

class Conversation(TimestampedBase):
    """Model for tracking conversations with ChatGPT."""
    
    __tablename__ = "conversations"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    meta_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )

    # Relationships
    user: Mapped[User] = relationship(back_populates="conversations")
    messages: Mapped[List["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan"
    )
    structured_data: Mapped[List["StructuredData"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan"
    )

class Message(TimestampedBase):
    """Model for individual messages in a conversation."""
    
    __tablename__ = "messages"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4
    )
    conversation_id: Mapped[UUID] = mapped_column(
        ForeignKey("conversations.id"),
        nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    meta_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )

    # Relationships
    conversation: Mapped[Conversation] = relationship(back_populates="messages")

class StructuredData(TimestampedBase):
    """Model for storing structured data extracted from conversations."""
    
    __tablename__ = "structured_data"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4
    )
    conversation_id: Mapped[UUID] = mapped_column(
        ForeignKey("conversations.id"),
        nullable=False
    )
    data_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    schema_version: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False
    )
    meta_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )

    # Relationships
    conversation: Mapped[Conversation] = relationship(back_populates="structured_data")
    columns: Mapped[List["DataColumn"]] = relationship(
        back_populates="structured_data",
        cascade="all, delete-orphan"
    )
    change_history: Mapped[List["DataChangeHistory"]] = relationship(
        back_populates="structured_data",
        cascade="all, delete-orphan"
    )

class DataColumn(TimestampedBase):
    """Model for managing columns in structured data."""
    
    __tablename__ = "data_columns"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4
    )
    structured_data_id: Mapped[UUID] = mapped_column(
        ForeignKey("structured_data.id"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    data_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    format: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    formula: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    order: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    meta_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )

    # Relationships
    structured_data: Mapped[StructuredData] = relationship(back_populates="columns")

class DataChangeHistory(TimestampedBase):
    """Model for tracking changes to structured data."""
    
    __tablename__ = "data_change_history"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4
    )
    structured_data_id: Mapped[UUID] = mapped_column(
        ForeignKey("structured_data.id"),
        nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )
    change_type: Mapped[str] = mapped_column(
        String(50),  # ADD_COLUMN, DELETE_COLUMN, EDIT_CELL, etc.
        nullable=False
    )
    column_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    row_index: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    old_value: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    new_value: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    meta_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict
    )

    # Relationships
    structured_data: Mapped[StructuredData] = relationship(back_populates="change_history")
    user: Mapped[User] = relationship("User") 