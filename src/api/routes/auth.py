from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.auth import UserCreate, UserLogin, UserResponse, TokenResponse
from src.services.user import UserService
from src.utils.database import get_db
from src.utils.security import get_current_user_id

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Register a new user."""
    user_service = UserService(db)
    user = await user_service.create_user(user_data)
    return UserResponse.model_validate(user)

@router.post("/login", response_model=TokenResponse)
async def login_user(
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Authenticate user and return token."""
    user_service = UserService(db)
    return await user_service.authenticate_user(user_data)

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Get current user information."""
    user_service = UserService(db)
    user = await user_service.get_user_by_id(current_user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user) 