from datetime import datetime, timedelta
from typing import Optional, Union, Dict, Any
from uuid import UUID
import os
import base64
import json
import time
import secrets
import string

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from cryptography.fernet import Fernet

from src.utils.config import get_settings
from src.utils.database import get_db

settings = get_settings()

# Security configurations
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Encryption for sensitive data
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Generate a key if not provided
    ENCRYPTION_KEY = Fernet.generate_key()
    
cipher = Fernet(ENCRYPTION_KEY)
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

def decode_token_and_get_user_id(token: str) -> Optional[UUID]:
    """Decodes a JWT token and extracts the user ID (sub)."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )
        user_id = payload.get("sub")
        if user_id:
            return UUID(user_id)
        return None
    except (JWTError, ValueError):
        return None

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> UUID:
    """Get current user ID from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    user_id = decode_token_and_get_user_id(token)
    if not user_id:
        raise credentials_exception
    
    return user_id

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


def generate_secure_state(user_id: str) -> str:
    """
    Generate a secure state parameter for OAuth flows.
    
    Args:
        user_id: The user's ID to encode in the state
        
    Returns:
        Encoded state string
    """
    # Create a random state token
    alphabet = string.ascii_letters + string.digits
    random_state = ''.join(secrets.choice(alphabet) for _ in range(32))
    
    # Combine with user ID and timestamp
    state_data = {
        "user_id": user_id,
        "random": random_state,
        "timestamp": int(time.time())
    }
    
    # Encode as base64
    state_json = json.dumps(state_data)
    state_bytes = state_json.encode('utf-8')
    state = base64.urlsafe_b64encode(state_bytes).decode('utf-8')
    
    return state


def extract_user_id_from_state(state: str) -> str:
    """
    Extract user ID from encoded state parameter.
    
    Args:
        state: The encoded state string
        
    Returns:
        The user ID
        
    Raises:
        ValueError: If state is invalid or expired
    """
    try:
        # Decode from base64
        state_bytes = base64.urlsafe_b64decode(state)
        state_json = state_bytes.decode('utf-8')
        state_data = json.loads(state_json)
        
        # Check timestamp (expire after 10 minutes)
        timestamp = state_data.get("timestamp", 0)
        if int(time.time()) - timestamp > 600:
            raise ValueError("State parameter expired")
            
        return state_data.get("user_id")
    except Exception as e:
        raise ValueError(f"Invalid state parameter: {str(e)}")


def encrypt_token(token: str) -> str:
    """
    Encrypt a token before storing in database.
    
    Args:
        token: The token to encrypt
        
    Returns:
        Encrypted token
    """
    return cipher.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt a token retrieved from database.
    
    Args:
        encrypted_token: The encrypted token
        
    Returns:
        Decrypted token
    """
    return cipher.decrypt(encrypted_token.encode()).decode()