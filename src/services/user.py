from datetime import timedelta
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import User
from src.schemas.auth import UserCreate, UserLogin, TokenResponse
from src.utils.config import get_settings
from src.utils.security import verify_password, get_password_hash, create_access_token

settings = get_settings()
# Define a longer expiry for refresh tokens (e.g., 7 days)
REFRESH_TOKEN_EXPIRE_MINUTES = settings.REFRESH_TOKEN_EXPIRE_MINUTES if hasattr(settings, 'REFRESH_TOKEN_EXPIRE_MINUTES') else 60 * 24 * 7

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user."""
        # Check if user exists
        if await self.get_user_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create new user
        user = User(
            email=user_data.email,
            hashed_password=get_password_hash(user_data.password)
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def authenticate_user(self, user_data: UserLogin) -> TokenResponse:
        """Authenticate user and return token."""
        import logging
        logger = logging.getLogger("auth")
        
        logger.info(f"Authentication attempt for email: {user_data.email}")
        
        user = await self.get_user_by_email(user_data.email)
        
        if not user:
            logger.warning(f"User not found: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        logger.info(f"User found, verifying password for: {user_data.email}")
        password_verification = verify_password(user_data.password, user.hashed_password)
        logger.info(f"Password verification result: {password_verification}")
        
        if not password_verification:
            logger.warning(f"Invalid password for user: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )

        # Create refresh token
        refresh_token_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
        refresh_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=refresh_token_expires
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()