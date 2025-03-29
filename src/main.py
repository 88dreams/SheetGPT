import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from typing import Dict

from src.api.routes import api as api_router
from src.api.middleware.error_handlers import setup_error_handlers
from src.utils.config import get_settings
from src.config.logging_config import app_logger, api_logger
from src.utils.errors import EntityValidationError

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="An intelligent interface for structured conversations with ChatGPT and spreadsheet integration",
    version="0.1.0",
)

# Configure CORS with specific origins
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add error handling middleware
@app.middleware("http")
async def errors_handling(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        api_logger.error(f"Middleware error: {str(exc)}", exc_info=True)
        # Ensure CORS headers are present in error responses
        response = JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
        )
        
        # Add CORS headers explicitly for error responses
        origin = request.headers.get('origin')
        if origin in origins:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        return response

# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    api_logger.error(f"Validation error: {str(exc)}", exc_info=True)
    
    # Convert validation errors to our standardized format
    field_errors = {}
    for error in exc.errors():
        field_path = '.'.join(str(loc) for loc in error['loc'])
        field_errors[field_path] = error['msg']
    
    # Create a standardized validation error
    error = EntityValidationError(
        message="Request validation failed",
        field_errors=field_errors,
        details={"validation_errors": exc.errors()}
    )
    
    response = JSONResponse(
        status_code=error.status_code,
        content=error.to_dict(),
    )
    
    # Add CORS headers
    origin = request.headers.get('origin')
    if origin in origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    api_logger.error(f"HTTP error: {str(exc.detail)}", exc_info=True)
    
    # Map to our standardized format
    error_response = {
        "error": "HTTPException",
        "message": str(exc.detail),
        "details": {},
        "status_code": exc.status_code
    }
    
    response = JSONResponse(
        status_code=exc.status_code,
        content=error_response,
    )
    
    # Add CORS headers
    origin = request.headers.get('origin')
    if origin in origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# Setup our customized error handlers
setup_error_handlers(app)

# Include API Router
app.include_router(
    api_router.router,
    prefix=settings.API_V1_PREFIX
)

# Mount the exports directory to serve static files
exports_dir = Path("data/exports")
if not exports_dir.exists():
    os.makedirs(exports_dir, exist_ok=True)
    app_logger.info(f"Created exports directory: {exports_dir.absolute()}")

app.mount("/api/v1/exports", StaticFiles(directory=exports_dir), name="exports")
app_logger.info(f"Mounted exports directory: {exports_dir.absolute()}")

@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint returning API information."""
    app_logger.info("Root endpoint accessed")
    return {
        "name": settings.PROJECT_NAME,
        "version": "0.1.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    app_logger.info("Health check endpoint accessed")
    return {
        "status": "healthy",
        "message": "Service is running normally"
    }

if __name__ == "__main__":
    import uvicorn
    app_logger.info("Starting application server")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    ) 