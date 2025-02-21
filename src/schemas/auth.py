from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """Schema for user response."""
    email: EmailStr
    is_active: bool
    is_superuser: bool

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    """Schema for token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int 