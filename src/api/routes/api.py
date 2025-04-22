from fastapi import APIRouter
from typing import Dict

from src.api.routes import auth, chat, export, data_management, sports, sports_v2, admin, db_management, docs, linkedin, contacts

router = APIRouter()

# Include authentication routes
router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

# Include chat routes
router.include_router(
    chat.router,
    prefix="/chat",
    tags=["Chat"]
)

# Include export routes
router.include_router(
    export.router,
    prefix="/export",
    tags=["Export"]
)

# Include data management routes
router.include_router(
    data_management.router,
    prefix="/data",
    tags=["Data Management"]
)

# Include sports routes
router.include_router(
    sports.router,
    prefix="/sports",
    tags=["Sports"]
)

# Include sports v2 routes with enhanced entity resolution
router.include_router(
    sports_v2.router,
    tags=["Sports V2"]
)

# Include admin routes
router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin"]
)

# Include database management routes
router.include_router(
    db_management.router,
    prefix="/db-management",
    tags=["Database Management"]
)

# Include documentation routes
router.include_router(
    docs.router,
    tags=["Documentation"]
)

# Include LinkedIn integration routes
router.include_router(
    linkedin.router,
    prefix="/linkedin",
    tags=["LinkedIn Integration"]
)

# Include Contacts routes
router.include_router(
    contacts.router,
    prefix="/contacts",
    tags=["Contacts"]
)

@router.get("/status")
async def get_status() -> Dict[str, str]:
    """Get the current status of all services."""
    return {
        "api": "operational",
        "database": "connected",  # TODO: Implement actual database check
        "chatgpt": "available",   # TODO: Implement OpenAI API check
        "sheets": "ready"         # TODO: Implement Google Sheets API check
    }