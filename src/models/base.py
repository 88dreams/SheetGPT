from datetime import datetime
from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional, List

from src.utils.database import Base

class TimestampedBase(Base):
    """Abstract base class with timestamp fields."""
    
    __abstract__ = True

    tags: Mapped[Optional[List[str]]] = mapped_column(
        JSONB, 
        nullable=True, 
        default=[]
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None
    ) 