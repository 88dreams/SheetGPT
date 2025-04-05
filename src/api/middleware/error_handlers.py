"""
Error handling middleware for FastAPI
Provides consistent error responses across the API with enhanced tracing
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, Any, Callable, Type, Union
from datetime import datetime
import uuid
import traceback

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
from src.config.logging_config import api_logger, db_logger, security_logger, log_security_event
from src.core.config import ENVIRONMENT

def setup_error_handlers(app: FastAPI) -> None:
    """Configure all error handlers for the application with robust tracing and logging."""
    
    # Handle our custom error hierarchy
    @app.exception_handler(SportsDatabaseError)
    async def sports_database_error_handler(request: Request, exc: SportsDatabaseError) -> JSONResponse:
        """Handle all custom sports database errors with request tracing."""
        # Generate or retrieve request ID
        if not hasattr(request.state, "request_id"):
            request.state.request_id = str(uuid.uuid4())
        request_id = request.state.request_id
        
        # Extract client info
        client_ip = request.client.host if request.client else None
        user_id = getattr(request.state, "user", {}).get("id", None)
        
        # Log with enhanced context
        context = {
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "client_ip": client_ip,
            "user_id": user_id,
            "error_type": exc.__class__.__name__
        }
        
        # Use built-in logging or our enhanced logging
        if hasattr(exc, "log_error"):
            exc.log_error(context=context)
        else:
            api_logger.error(
                f"{exc.__class__.__name__}: {str(exc)}",
                extra=context
            )
        
        # Create response with additional request tracing
        error_dict = exc.to_dict()
        if "details" not in error_dict:
            error_dict["details"] = {}
        
        # Add request ID and timestamp to response
        error_dict["details"]["request_id"] = request_id
        error_dict["details"]["timestamp"] = datetime.utcnow().isoformat()
        
        # Create JSON response
        response = JSONResponse(
            status_code=exc.status_code,
            content=error_dict
        )
        
        # Add request ID to headers for client-side tracing
        response.headers["X-Request-ID"] = request_id
        
        return response
    
    # Special handling for auth errors with security logging
    @app.exception_handler(AuthenticationError)
    async def auth_error_handler(request: Request, exc: AuthenticationError) -> JSONResponse:
        """Handle authentication errors with enhanced security logging."""
        # Generate or retrieve request ID
        if not hasattr(request.state, "request_id"):
            request.state.request_id = str(uuid.uuid4())
        request_id = request.state.request_id
        
        # Extract client info
        client_ip = request.client.host if request.client else None
        
        # Log security event for authentication failure
        log_security_event(
            event_type="AUTHENTICATION_FAILURE",
            description=f"Authentication failed: {exc.message}",
            ip_address=client_ip,
            details={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "error_type": exc.__class__.__name__
            }
        )
        
        # Create standard error response
        error_dict = exc.to_dict()
        if "details" not in error_dict:
            error_dict["details"] = {}
            
        # Add request ID and timestamp to response
        error_dict["details"]["request_id"] = request_id
        error_dict["details"]["timestamp"] = datetime.utcnow().isoformat()
        
        # Create JSON response
        response = JSONResponse(
            status_code=exc.status_code,
            content=error_dict
        )
        
        # Add request ID to headers for client-side tracing
        response.headers["X-Request-ID"] = request_id
        
        return response
    
    # Special handling for authorization errors with security logging
    @app.exception_handler(AuthorizationError)
    async def authorization_error_handler(request: Request, exc: AuthorizationError) -> JSONResponse:
        """Handle authorization errors with enhanced security logging."""
        # Generate or retrieve request ID
        if not hasattr(request.state, "request_id"):
            request.state.request_id = str(uuid.uuid4())
        request_id = request.state.request_id
        
        # Extract client info
        client_ip = request.client.host if request.client else None
        user_id = getattr(request.state, "user", {}).get("id", None)
        
        # Log security event for authorization failure
        log_security_event(
            event_type="AUTHORIZATION_FAILURE",
            description=f"Authorization failed: {exc.message}",
            user_id=user_id,
            ip_address=client_ip,
            details={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "error_type": exc.__class__.__name__
            }
        )
        
        # Create standard error response
        error_dict = exc.to_dict()
        if "details" not in error_dict:
            error_dict["details"] = {}
            
        # Add request ID and timestamp to response
        error_dict["details"]["request_id"] = request_id
        error_dict["details"]["timestamp"] = datetime.utcnow().isoformat()
        
        # Create JSON response
        response = JSONResponse(
            status_code=exc.status_code,
            content=error_dict
        )
        
        # Add request ID to headers for client-side tracing
        response.headers["X-Request-ID"] = request_id
        
        return response
    
    # Handle SQLAlchemy errors
    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        """Handle SQLAlchemy errors with detailed database logging."""
        # Generate or retrieve request ID
        if not hasattr(request.state, "request_id"):
            request.state.request_id = str(uuid.uuid4())
        request_id = request.state.request_id
        
        # Extract client info
        client_ip = request.client.host if request.client else None
        user_id = getattr(request.state, "user", {}).get("id", None)
        
        # Extract error information
        error_message = str(exc)
        error_type = exc.__class__.__name__
        
        # Log detailed database error
        db_logger.error(
            f"Database error: {error_message}",
            exc_info=True,
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "client_ip": client_ip,
                "user_id": user_id,
                "error_type": error_type
            }
        )
        
        # Create standardized database error
        error = DatabaseOperationError(
            message="Database operation failed",
            details={
                "error_type": error_type,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        # In development, include original error for debugging
        if ENVIRONMENT != "production":
            error.details["original_error"] = error_message
            
        # Create response
        response = JSONResponse(
            status_code=error.status_code,
            content=error.to_dict()
        )
        
        # Add request ID to headers for client-side tracing
        response.headers["X-Request-ID"] = request_id
        
        return response
    
    # Handle generic exceptions as a last resort
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle any unhandled exceptions with comprehensive error reporting."""
        # Generate or retrieve request ID
        if not hasattr(request.state, "request_id"):
            request.state.request_id = str(uuid.uuid4())
        request_id = request.state.request_id
        
        # Extract client info
        client_ip = request.client.host if request.client else None
        user_id = getattr(request.state, "user", {}).get("id", None)
        
        # Format the traceback for logging
        tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        
        # Log detailed exception with full context
        api_logger.error(
            f"Unhandled exception: {str(exc)}",
            exc_info=True,
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "client_ip": client_ip,
                "user_id": user_id,
                "error_type": exc.__class__.__name__,
                "traceback": tb_str if ENVIRONMENT != "production" else "Hidden in production"
            }
        )
        
        # Create standardized error response
        error_response = error_to_api_response(exc)
        
        # Add request ID and timestamp to response
        if "details" not in error_response:
            error_response["details"] = {}
        error_response["details"]["request_id"] = request_id
        error_response["details"]["timestamp"] = datetime.utcnow().isoformat()
        
        # In development, include stack trace for debugging
        if ENVIRONMENT != "production":
            error_response["details"]["traceback"] = tb_str
            
        # Create response
        response = JSONResponse(
            status_code=error_response.get("status_code", 500),
            content=error_response
        )
        
        # Add request ID to headers for client-side tracing
        response.headers["X-Request-ID"] = request_id
        
        return response