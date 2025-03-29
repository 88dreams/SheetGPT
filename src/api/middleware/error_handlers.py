"""
Error handling middleware for FastAPI
Provides consistent error responses across the API
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, Any, Callable, Type, Union
import logging

from src.utils.errors import (
    SportsDatabaseError,
    EntityNotFoundError,
    EntityValidationError,
    EntityRelationshipError,
    DatabaseOperationError,
    AuthenticationError,
    AuthorizationError,
    ExternalServiceError,
    error_to_api_response
)

logger = logging.getLogger(__name__)

def setup_error_handlers(app: FastAPI) -> None:
    """Configure all error handlers for the application."""
    
    # Handle our custom error hierarchy
    @app.exception_handler(SportsDatabaseError)
    async def sports_database_error_handler(request: Request, exc: SportsDatabaseError) -> JSONResponse:
        """Handle all custom sports database errors."""
        exc.log_error(context={"path": request.url.path, "method": request.method})
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict()
        )
    
    # Handle SQLAlchemy errors
    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        """Handle SQLAlchemy errors that weren't caught by services."""
        error_message = str(exc)
        logger.error(
            f"Unhandled SQLAlchemy error: {error_message}",
            extra={
                "path": request.url.path,
                "method": request.method,
                "error_type": exc.__class__.__name__
            }
        )
        
        error = DatabaseOperationError(
            message="Database operation failed",
            details={"original_error": error_message}
        )
        
        return JSONResponse(
            status_code=error.status_code,
            content=error.to_dict()
        )
    
    # Handle generic exceptions as a last resort
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle any unhandled exceptions."""
        # Log details of the exception for debugging
        logger.exception(
            f"Unhandled exception: {str(exc)}",
            extra={
                "path": request.url.path,
                "method": request.method,
                "error_type": exc.__class__.__name__
            }
        )
        
        # Convert to standard response format
        error_response = error_to_api_response(exc)
        
        return JSONResponse(
            status_code=error_response.get("status_code", 500),
            content=error_response
        )

# Import this function and call it in your main.py
# setup_error_handlers(app)