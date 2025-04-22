"""
Models for LinkedIn integration functionality.
"""
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as SQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from uuid import UUID, uuid4

from src.models.base import TimestampedBase


class LinkedInAccount(TimestampedBase):
    """Model for storing LinkedIn account information for users."""
    
    __tablename__ = "linkedin_accounts"
    __table_args__ = (
        Index('ix_linkedin_accounts_user_id', 'user_id', unique=True),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )
    user_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        unique=True
    )
    linkedin_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    access_token: Mapped[str] = mapped_column(
        String(),
        nullable=False
    )
    refresh_token: Mapped[Optional[str]] = mapped_column(
        String(),
        nullable=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        nullable=False
    )
    last_synced: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default="CURRENT_TIMESTAMP"
    )


class LinkedInConnection(TimestampedBase):
    """Model for storing LinkedIn connection information."""
    
    __tablename__ = "linkedin_connections"
    __table_args__ = (
        UniqueConstraint('user_id', 'linkedin_profile_id', name='uq_user_profile'),
        Index('ix_linkedin_connections_user_id', 'user_id'),
        Index('ix_linkedin_connections_linkedin_profile_id', 'linkedin_profile_id'),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )
    user_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    linkedin_profile_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    company_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    position: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    connection_degree: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )


class BrandConnection(TimestampedBase):
    """Model for linking LinkedIn connections to brands."""
    
    __tablename__ = "brand_connections"
    __table_args__ = (
        UniqueConstraint('user_id', 'brand_id', name='uq_user_brand'),
        Index('ix_brand_connections_user_id', 'user_id'),
        Index('ix_brand_connections_brand_id', 'brand_id'),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )
    user_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    brand_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    first_degree_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    second_degree_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    last_updated: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default="CURRENT_TIMESTAMP"
    )