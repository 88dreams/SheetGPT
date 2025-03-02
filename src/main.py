from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict

from src.api.routes import api as api_router
from src.utils.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="An intelligent interface for structured conversations with ChatGPT and spreadsheet integration",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development frontend
        "http://localhost:8000",  # Local API
        "http://frontend:5173",   # Docker container frontend
        "http://127.0.0.1:5173",  # Alternative local frontend
        "http://localhost",       # Base localhost
        f"http://{settings.PROJECT_NAME.lower()}.localhost", # Project-specific localhost
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Content-Type", "Authorization"]
)

# Include API Router
app.include_router(
    api_router.router,
    prefix=settings.API_V1_PREFIX
)

@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint returning API information."""
    return {
        "name": settings.PROJECT_NAME,
        "version": "0.1.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "message": "Service is running normally"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    ) 