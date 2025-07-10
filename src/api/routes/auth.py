from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from src.schemas.auth import UserCreate, UserLogin, UserResponse, TokenResponse
from src.services.user import UserService
from src.utils.database import get_db
from src.utils.security import get_current_user_id, create_access_token
from datetime import timedelta, datetime
from src.utils.config import get_settings

settings = get_settings()

router = APIRouter()

@router.get("/health", include_in_schema=False)
async def auth_health_check():
    """Simple health check for the auth system."""
    return {
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "auth"
    }

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Register a new user."""
    import logging
    import traceback
    logger = logging.getLogger("auth.register")
    logger.setLevel(logging.INFO)
    
    safe_data = {
        "email": user_data.email,
        "password_length": len(user_data.password) if user_data.password else 0
    }
    logger.info(f"Registration attempt received: {safe_data}")
    
    try:
        user_service = UserService(db)
        user = await user_service.create_user(user_data)
        logger.info(f"Registration successful for: {user_data.email}")
        return UserResponse.model_validate(user)
    except Exception as e:
        logger.error(f"Registration error for {user_data.email}: {str(e)}")
        logger.error(traceback.format_exc())
        raise

@router.post("/login", response_model=TokenResponse)
async def login_user(
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Authenticate user and return token."""
    import logging
    import traceback
    logger = logging.getLogger("auth.login")
    logger.setLevel(logging.INFO)
    
    safe_data = {
        "email": user_data.email,
        "password_length": len(user_data.password) if user_data.password else 0
    }
    logger.info(f"Login attempt received: {safe_data}")
    
    try:
        user_service = UserService(db)
        result = await user_service.authenticate_user(user_data)
        logger.info(f"Login successful for: {user_data.email}")
        return result
    except Exception as e:
        logger.error(f"Login error for {user_data.email}: {str(e)}")
        logger.error(traceback.format_exc())
        raise

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Get current user information."""
    user_service = UserService(db)
    user = await user_service.get_user_by_id(UUID(current_user_id))
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user) 

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Refresh authentication token."""
    user_service = UserService(db)
    user = await user_service.get_user_by_id(UUID(current_user_id))
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token, 
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.get("/debug", include_in_schema=False)
async def auth_debug():
    """Debug endpoint to provide information about authentication configuration."""
    import os
    import sys
    import logging
    import traceback
    from sqlalchemy import text
    from src.utils.database import get_db_session
    
    logger = logging.getLogger("auth.debug")
    logger.setLevel(logging.INFO)
    
    results = {
        "environment": {
            "variables": {},
            "system": {},
            "app": {}
        },
        "database": {},
        "errors": []
    }
    
    try:
        results["environment"]["variables"] = {
            "ENVIRONMENT": os.getenv("ENVIRONMENT", "unknown"),
            "SECRET_KEY_SET": bool(os.getenv("SECRET_KEY")),
            "SECRET_KEY_LENGTH": len(os.getenv("SECRET_KEY", "")) if os.getenv("SECRET_KEY") else 0,
            "DATABASE_URL_SET": bool(os.getenv("DATABASE_URL")),
            "DATABASE_URL_TYPE": os.getenv("DATABASE_URL", "").split(":")[0] if os.getenv("DATABASE_URL") else "unknown",
            "DATABASE_URL_SSL": "sslmode" in os.getenv("DATABASE_URL", "") or "ssl" in os.getenv("DATABASE_URL", ""),
            "CORS_ORIGINS": os.getenv("CORS_ORIGINS", "").split(","),
            "DEBUG": os.getenv("DEBUG", "False")
        }
        
        results["environment"]["system"] = {
            "python_version": sys.version,
            "platform": sys.platform,
            "pid": os.getpid()
        }
        
        # NOTE: The Settings model does not have ENVIRONMENT or CORS_ORIGINS defined, causing linter errors.
        # This is likely a bug in the Settings model itself in `src/utils/config.py`.
        # For now, I will use os.getenv as a workaround to fix the immediate error here.
        results["environment"]["app"] = {
            "settings_environment": os.getenv("ENVIRONMENT", "unknown"),
            "api_prefix": settings.API_V1_PREFIX,
            "debug_mode": settings.DEBUG,
            "token_expire_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            "cors_origins_count": len(os.getenv("CORS_ORIGINS", "").split(",")),
            "database_url_partial": settings.DATABASE_URL.split("@")[1].split("/")[0] if "@" in settings.DATABASE_URL else "masked"
        }
    except Exception as e:
        error_info = {
            "section": "environment",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        results["errors"].append(error_info)
        logger.error(f"Error gathering environment info: {str(e)}", exc_info=True)
    
    try:
        logger.info("Testing database connection...")
        async with get_db_session() as session:
            db_test_result = await session.execute(text("SELECT 1 as test"))
            row = db_test_result.fetchone()
            connection_ok = row and row.test == 1
            
            version_result = await session.execute(text("SELECT version()"))
            version = version_result.scalar_one_or_none()
            
            user_count_result = await session.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user'"))
            users_table_exists = (user_count_result.scalar_one_or_none() or 0) > 0
            
            if users_table_exists:
                user_count_result = await session.execute(text("SELECT COUNT(*) FROM \"user\""))
                user_count = user_count_result.scalar_one_or_none()
            else:
                user_count = "table not found"
                
            from src.utils.security import get_password_hash
            password_hash = get_password_hash("test_password")
            hash_working = bool(password_hash and len(password_hash) > 20)
                
            results["database"] = {
                "connection": "OK" if connection_ok else "Failed",
                "version": version,
                "users_table_exists": users_table_exists,
                "user_count": user_count,
                "hash_function_working": hash_working,
                "hash_sample_length": len(password_hash) if hash_working else 0
            }
    except Exception as e:
        error_info = {
            "section": "database",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        results["errors"].append(error_info)
        logger.error(f"Database connection error: {str(e)}", exc_info=True)
        results["database"] = {
            "connection": "Failed",
            "error": str(e),
            "error_type": type(e).__name__
        }
    
    logger.info(f"Auth debug endpoint results: {results}")
    return results