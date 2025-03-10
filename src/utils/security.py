from datetime import datetime, timedelta
from typing import Optional, Union
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.utils.config import get_settings
from src.utils.database import get_db

settings = get_settings()

# Security configurations
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

# Token model
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[UUID] = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    import logging
    logger = logging.getLogger("auth")
    
    try:
        # Log the first 3 chars of the password and hash for debugging
        logger.info(f"Verifying password - Input starts with: {plain_password[:3] if len(plain_password) > 3 else '*****'}")
        logger.info(f"Hash starts with: {hashed_password[:10] if len(hashed_password) > 10 else '*****'}")
        
        result = pwd_context.verify(plain_password, hashed_password)
        logger.info(f"Password verification result: {result}")
        return result
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        # Return False on error to maintain security
        return False

def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm="HS256"
    )
    return encoded_jwt

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> UUID:
    """Get current user ID from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        token_data = TokenData(user_id=UUID(user_id))
    except (JWTError, ValueError):
        raise credentials_exception
    
    return token_data.user_id

async def get_current_admin_user(
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> UUID:
    """
    Get current user ID and verify the user is an admin.
    Returns the user ID if successful, otherwise raises an exception.
    """
    from sqlalchemy import select
    from src.models.models import User
    
    # Query to check if user is admin
    query = select(User).where(
        (User.id == current_user_id) & 
        (User.is_admin == True)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user_id 