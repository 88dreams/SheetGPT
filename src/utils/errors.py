"""
Standardized error classes for SheetGPT backend services.

These classes provide a consistent error handling approach across the application.
"""
from typing import Dict, Any, Optional, List, Union
import logging

logger = logging.getLogger(__name__)

class SportsDatabaseError(Exception):
    """Base class for all sports database related errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.status_code = status_code
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary for API responses."""
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "details": self.details,
            "status_code": self.status_code
        }
    
    def log_error(self, logger_instance=None, level=logging.ERROR, context: Dict[str, Any] = None):
        """Log the error with consistent formatting."""
        log = logger_instance or logger
        context_dict = {
            "error_type": self.__class__.__name__,
            "status_code": self.status_code,
            **(context or {}),
            **(self.details or {})
        }
        log.log(level, f"{self.message}", extra=context_dict)


class EntityNotFoundError(SportsDatabaseError):
    """Error raised when an entity is not found."""
    
    def __init__(self, entity_type: str, entity_id: Optional[str] = None, 
                 entity_name: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.entity_name = entity_name
        
        # Create a clear message based on available information
        if entity_id and entity_name:
            message = f"{entity_type.capitalize()} with ID '{entity_id}' or name '{entity_name}' not found"
        elif entity_id:
            message = f"{entity_type.capitalize()} with ID '{entity_id}' not found"
        elif entity_name:
            message = f"{entity_type.capitalize()} with name '{entity_name}' not found"
        else:
            message = f"{entity_type.capitalize()} not found"
        
        error_details = {
            "entity_type": entity_type,
            **(details or {})
        }
        
        if entity_id:
            error_details["entity_id"] = str(entity_id)
        if entity_name:
            error_details["entity_name"] = entity_name
            
        super().__init__(message, error_details, status_code=404)


class DuplicateEntityError(SportsDatabaseError):
    """Error raised when an entity already exists in the system."""
    
    def __init__(self, message: str, entity_type: Optional[str] = None, 
                entity_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.entity_type = entity_type
        self.entity_id = entity_id
        
        error_details = {
            **(details or {})
        }
        
        if entity_type:
            error_details["entity_type"] = entity_type
        if entity_id:
            error_details["entity_id"] = str(entity_id)
            
        super().__init__(message, error_details, status_code=409)  # 409 Conflict


class EntityValidationError(SportsDatabaseError):
    """Error raised when entity validation fails."""
    
    def __init__(self, message: str, entity_type: Optional[str] = None, 
                 field_errors: Optional[Dict[str, str]] = None, details: Optional[Dict[str, Any]] = None):
        self.entity_type = entity_type
        self.field_errors = field_errors or {}
        
        error_details = {
            **(details or {})
        }
        
        if entity_type:
            error_details["entity_type"] = entity_type
        
        if field_errors:
            error_details["field_errors"] = field_errors
            
        super().__init__(message, error_details, status_code=400)


class EntityRelationshipError(SportsDatabaseError):
    """Error raised when entity relationship validation fails."""
    
    def __init__(self, message: str, source_type: str, target_type: str, 
                 source_id: Optional[str] = None, target_id: Optional[str] = None,
                 details: Optional[Dict[str, Any]] = None):
        self.source_type = source_type
        self.target_type = target_type
        self.source_id = source_id
        self.target_id = target_id
        
        error_details = {
            "source_type": source_type,
            "target_type": target_type,
            **(details or {})
        }
        
        if source_id:
            error_details["source_id"] = str(source_id)
        if target_id:
            error_details["target_id"] = str(target_id)
            
        super().__init__(message, error_details, status_code=400)


class DatabaseOperationError(SportsDatabaseError):
    """Error raised when a database operation fails."""
    
    def __init__(self, message: str, operation: Optional[str] = None, 
                 entity_type: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.operation = operation
        self.entity_type = entity_type
        
        error_details = {
            **(details or {})
        }
        
        if operation:
            error_details["operation"] = operation
        if entity_type:
            error_details["entity_type"] = entity_type
            
        super().__init__(message, error_details, status_code=500)


class AuthenticationError(SportsDatabaseError):
    """Error raised for authentication issues."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, status_code=401)


class AuthorizationError(SportsDatabaseError):
    """Error raised for authorization issues."""
    
    def __init__(self, message: str, required_role: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.required_role = required_role
        
        error_details = {
            **(details or {})
        }
        
        if required_role:
            error_details["required_role"] = required_role
        
        super().__init__(message, error_details, status_code=403)


class ValidationError(SportsDatabaseError):
    """Error raised for general validation issues."""
    
    def __init__(self, message: str, field_errors: Optional[Dict[str, str]] = None, 
                details: Optional[Dict[str, Any]] = None):
        self.field_errors = field_errors or {}
        
        error_details = {
            **(details or {})
        }
        
        if field_errors:
            error_details["field_errors"] = field_errors
        
        super().__init__(message, error_details, status_code=400)


class ExternalServiceError(SportsDatabaseError):
    """Error raised when an external service call fails."""
    
    def __init__(self, message: str, service_name: str, details: Optional[Dict[str, Any]] = None):
        self.service_name = service_name
        
        error_details = {
            "service": service_name,
            **(details or {})
        }
            
        super().__init__(message, error_details, status_code=502)


# Error handling decorators and utilities

def handle_database_errors(func):
    """
    Decorator to standardize database error handling in services.
    
    This decorator takes care of:
    1. Exception wrapping for consistent API responses
    2. Transaction handling (rollback on error)
    3. Proper error logging with context
    """
    import functools
    import inspect
    from sqlalchemy.exc import SQLAlchemyError, IntegrityError
    
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        # Try to identify the db session parameter
        db = None
        # Check if we have a db session in the arguments
        # Most service methods have the db session as the 2nd parameter (after self)
        if len(args) >= 2 and hasattr(args[1], 'rollback'):
            db = args[1]
        # Otherwise check kwargs
        elif 'db' in kwargs and hasattr(kwargs['db'], 'rollback'):
            db = kwargs['db']
            
        try:
            return await func(*args, **kwargs)
        except SportsDatabaseError:
            # Don't wrap already properly typed errors, but still rollback if possible
            if db:
                try:
                    await db.rollback()
                except Exception as rollback_error:
                    logger.warning(f"Error during rollback: {str(rollback_error)}")
            raise
        except IntegrityError as e:
            # Handle constraint violations
            operation_name = func.__name__
            error_message = str(e)
            
            # Rollback the transaction if possible
            if db:
                try:
                    await db.rollback()
                except Exception as rollback_error:
                    logger.warning(f"Error during rollback: {str(rollback_error)}")
            
            # Extract constraint information if available
            details = {"original_error": error_message}
            if "duplicate key" in error_message.lower():
                err = DatabaseOperationError(
                    f"Database constraint violation: duplicate record", 
                    operation=operation_name,
                    details=details
                )
            elif "foreign key constraint" in error_message.lower():
                err = EntityRelationshipError(
                    f"Referenced entity does not exist",
                    source_type="unknown",
                    target_type="unknown",
                    details=details
                )
            else:
                err = DatabaseOperationError(
                    f"Database integrity error", 
                    operation=operation_name,
                    details=details
                )
            
            # Log with appropriate context
            context = {"function": func.__name__}
            err.log_error(context=context)
            raise err
        except SQLAlchemyError as e:
            # Handle general database errors
            operation_name = func.__name__
            error_message = str(e)
            
            # Rollback the transaction if possible
            if db:
                try:
                    await db.rollback()
                except Exception as rollback_error:
                    logger.warning(f"Error during rollback: {str(rollback_error)}")
            
            err = DatabaseOperationError(
                f"Database operation failed: {operation_name}", 
                operation=operation_name,
                details={"original_error": error_message}
            )
            
            # Log with appropriate context
            context = {"function": func.__name__}
            err.log_error(context=context)
            raise err
        except Exception as e:
            # Handle other unexpected errors
            operation_name = func.__name__
            error_message = str(e)
            
            # Rollback the transaction if possible
            if db:
                try:
                    await db.rollback()
                except Exception as rollback_error:
                    logger.warning(f"Error during rollback: {str(rollback_error)}")
            
            # Log unexpected errors at a higher level
            logger.exception(f"Unexpected error in {operation_name}: {error_message}")
            
            err = DatabaseOperationError(
                f"Unexpected error in database operation", 
                operation=operation_name,
                details={"original_error": error_message}
            )
            raise err
    
    return wrapper

# Utility function to convert errors to API response dictionaries
def error_to_api_response(error: Exception) -> Dict[str, Any]:
    """Convert any exception to a structured API response dictionary."""
    if isinstance(error, SportsDatabaseError):
        return error.to_dict()
    
    # Default error response for unhandled exceptions
    return {
        "error": error.__class__.__name__,
        "message": str(error),
        "details": {},
        "status_code": 500
    }