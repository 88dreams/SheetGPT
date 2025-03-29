"""
Tests for the error handling utilities in src/utils/errors.py
"""
import pytest
import logging
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from src.utils.errors import (
    SportsDatabaseError,
    EntityNotFoundError,
    EntityValidationError,
    EntityRelationshipError,
    DatabaseOperationError,
    AuthenticationError,
    AuthorizationError,
    ExternalServiceError,
    handle_database_errors,
    error_to_api_response
)


class TestErrorClasses:
    """Tests for the custom error classes."""
    
    def test_base_error_initialization(self):
        """Test initialization of the base error class."""
        error = SportsDatabaseError("Test error message", {"test": "detail"}, 400)
        
        assert error.message == "Test error message"
        assert error.details == {"test": "detail"}
        assert error.status_code == 400
    
    def test_base_error_to_dict(self):
        """Test error conversion to dictionary."""
        error = SportsDatabaseError("Test error message", {"test": "detail"}, 400)
        error_dict = error.to_dict()
        
        assert error_dict["error"] == "SportsDatabaseError"
        assert error_dict["message"] == "Test error message"
        assert error_dict["details"] == {"test": "detail"}
        assert error_dict["status_code"] == 400
    
    def test_entity_not_found_error(self):
        """Test EntityNotFoundError initialization and message format."""
        # Test with ID only
        error1 = EntityNotFoundError("league", entity_id="123")
        assert "League with ID '123' not found" in str(error1)
        assert error1.status_code == 404
        
        # Test with name only
        error2 = EntityNotFoundError("team", entity_name="Test Team")
        assert "Team with name 'Test Team' not found" in str(error2)
        
        # Test with both ID and name
        error3 = EntityNotFoundError("player", entity_id="456", entity_name="John Doe")
        assert "Player with ID '456' or name 'John Doe' not found" in str(error3)
    
    def test_entity_validation_error(self):
        """Test EntityValidationError initialization and field error handling."""
        field_errors = {"name": "Name is required", "age": "Age must be positive"}
        error = EntityValidationError(
            "Validation failed", 
            entity_type="user", 
            field_errors=field_errors
        )
        
        error_dict = error.to_dict()
        assert error_dict["message"] == "Validation failed"
        assert error_dict["details"]["entity_type"] == "user"
        assert error_dict["details"]["field_errors"] == field_errors
        assert error_dict["status_code"] == 400
    
    def test_entity_relationship_error(self):
        """Test EntityRelationshipError initialization."""
        error = EntityRelationshipError(
            "Invalid relationship", 
            source_type="team", 
            target_type="league",
            source_id="123",
            target_id="456"
        )
        
        error_dict = error.to_dict()
        assert error_dict["message"] == "Invalid relationship"
        assert error_dict["details"]["source_type"] == "team"
        assert error_dict["details"]["target_type"] == "league"
        assert error_dict["details"]["source_id"] == "123"
        assert error_dict["details"]["target_id"] == "456"
        assert error_dict["status_code"] == 400
    
    def test_error_logging(self):
        """Test error logging functionality."""
        logger = MagicMock()
        error = SportsDatabaseError("Test error", {"context": "test"}, 500)
        
        # Call log_error with a mock logger
        error.log_error(logger_instance=logger, level=logging.WARNING, context={"extra": "info"})
        
        # Verify the logger was called correctly
        logger.log.assert_called_once()
        # Check the log level
        assert logger.log.call_args[0][0] == logging.WARNING
        # Check the log message
        assert logger.log.call_args[0][1] == "Test error"
        # Check that context was passed
        assert "context" in logger.log.call_args[1]["extra"]
        assert "extra" in logger.log.call_args[1]["extra"]


@pytest.mark.asyncio
class TestErrorDecorator:
    """Tests for the handle_database_errors decorator."""
    
    async def test_function_success(self):
        """Test that the decorator passes through successful function calls."""
        # Create a mock function that returns successfully
        @handle_database_errors
        async def mock_success_func(*args, **kwargs):
            return "success"
        
        # The function should execute normally
        result = await mock_success_func()
        assert result == "success"
    
    async def test_sqlalchemy_error_handling(self):
        """Test handling of SQLAlchemyError."""
        # Create a mock function that raises SQLAlchemyError
        @handle_database_errors
        async def mock_db_error_func(*args, **kwargs):
            raise SQLAlchemyError("Database error")
        
        # The decorator should convert the exception
        with pytest.raises(DatabaseOperationError) as exc_info:
            await mock_db_error_func()
        
        # Verify the error was transformed correctly
        assert "Database operation failed" in str(exc_info.value)
        assert exc_info.value.status_code == 500
        assert "original_error" in exc_info.value.details
    
    async def test_integrity_error_handling(self):
        """Test handling of IntegrityError."""
        # Create a mock function that raises IntegrityError with different messages
        @handle_database_errors
        async def mock_duplicate_key_func(*args, **kwargs):
            raise IntegrityError("statement", "params", "duplicate key value violates unique constraint")
        
        @handle_database_errors
        async def mock_foreign_key_func(*args, **kwargs):
            raise IntegrityError("statement", "params", "foreign key constraint fails")
        
        # The decorator should convert to appropriate error types
        with pytest.raises(DatabaseOperationError) as exc_info:
            await mock_duplicate_key_func()
        assert "duplicate record" in str(exc_info.value)
        
        with pytest.raises(EntityRelationshipError) as exc_info:
            await mock_foreign_key_func()
        assert "Referenced entity does not exist" in str(exc_info.value)
    
    async def test_custom_error_passthrough(self):
        """Test that our custom errors pass through unchanged."""
        # Create a mock function that raises our custom error
        @handle_database_errors
        async def mock_custom_error_func(*args, **kwargs):
            raise EntityNotFoundError("league", entity_id="123")
        
        # The decorator should let our custom errors pass through
        with pytest.raises(EntityNotFoundError) as exc_info:
            await mock_custom_error_func()
        
        # Verify the error wasn't transformed
        assert "League with ID '123' not found" in str(exc_info.value)
    
    async def test_generic_exception_handling(self):
        """Test handling of generic exceptions."""
        # Create a mock function that raises a generic exception
        @handle_database_errors
        async def mock_generic_error_func(*args, **kwargs):
            raise ValueError("Some random error")
        
        # The decorator should convert to DatabaseOperationError
        with pytest.raises(DatabaseOperationError) as exc_info:
            await mock_generic_error_func()
        
        # Verify the error was transformed correctly
        assert "Unexpected error" in str(exc_info.value)
        assert "original_error" in exc_info.value.details


class TestErrorHelpers:
    """Tests for error utility functions."""
    
    def test_error_to_api_response_custom_error(self):
        """Test conversion of custom errors to API response format."""
        error = EntityNotFoundError("league", entity_id="123")
        response = error_to_api_response(error)
        
        assert response["error"] == "EntityNotFoundError"
        assert "League with ID '123' not found" in response["message"]
        assert response["status_code"] == 404
        assert "entity_type" in response["details"]
    
    def test_error_to_api_response_standard_error(self):
        """Test conversion of standard errors to API response format."""
        error = ValueError("Invalid value")
        response = error_to_api_response(error)
        
        assert response["error"] == "ValueError"
        assert response["message"] == "Invalid value"
        assert response["status_code"] == 500
        assert response["details"] == {}