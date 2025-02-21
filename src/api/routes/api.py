from fastapi import APIRouter
from typing import Dict

from src.api.routes import auth, chat, export, data_management

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

@router.get("/status")
async def get_status() -> Dict[str, str]:
    """Get the current status of all services."""
    return {
        "api": "operational",
        "database": "connected",  # TODO: Implement actual database check
        "chatgpt": "available",   # TODO: Implement OpenAI API check
        "sheets": "ready"         # TODO: Implement Google Sheets API check
    } 