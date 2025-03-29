"""
Tests for error handling middleware.
"""
import pytest
from fastapi import FastAPI, Depends, HTTPException
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from src.api.middleware.error_handlers import setup_error_handlers
from src.utils.errors import (
    EntityNotFoundError,
    EntityValidationError,
    DatabaseOperationError
)


# Create a test FastAPI app
def create_test_app():
    """Create a FastAPI app for testing error handling."""
    app = FastAPI()
    
    # Setup error handlers
    setup_error_handlers(app)
    
    # Add test routes to trigger different errors
    @app.get("/test/entity-not-found")
    async def test_entity_not_found():
        raise EntityNotFoundError("test_entity", entity_id="123")
    
    @app.get("/test/validation-error")
    async def test_validation_error():
        raise EntityValidationError(
            message="Test validation error",
            entity_type="test_entity",
            field_errors={"field1": "Error in field1", "field2": "Error in field2"}
        )
    
    @app.get("/test/database-error")
    async def test_database_error():
        raise DatabaseOperationError(
            message="Test database error",
            operation="test_operation",
            entity_type="test_entity"
        )
    
    @app.get("/test/http-exception")
    async def test_http_exception():
        raise HTTPException(status_code=403, detail="Forbidden")
    
    @app.get("/test/generic-exception")
    async def test_generic_exception():
        raise ValueError("Test generic error")
    
    return app


class TestErrorMiddleware:
    """Tests for error handling middleware."""
    
    @pytest.fixture
    def client(self):
        """Get a test client."""
        app = create_test_app()
        return TestClient(app)
    
    def test_entity_not_found_response(self, client):
        """Test response format for EntityNotFoundError."""
        # Make a request that triggers an EntityNotFoundError
        response = client.get("/test/entity-not-found")
        
        # Verify the response
        assert response.status_code == 404
        data = response.json()
        assert data["error"] == "EntityNotFoundError"
        assert "test_entity" in data["message"]
        assert "123" in data["message"]
        assert data["details"]["entity_type"] == "test_entity"
        assert data["details"]["entity_id"] == "123"
    
    def test_validation_error_response(self, client):
        """Test response format for EntityValidationError."""
        # Make a request that triggers an EntityValidationError
        response = client.get("/test/validation-error")
        
        # Verify the response
        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "EntityValidationError"
        assert data["message"] == "Test validation error"
        assert data["details"]["entity_type"] == "test_entity"
        assert data["details"]["field_errors"]["field1"] == "Error in field1"
        assert data["details"]["field_errors"]["field2"] == "Error in field2"
    
    def test_database_error_response(self, client):
        """Test response format for DatabaseOperationError."""
        # Make a request that triggers a DatabaseOperationError
        response = client.get("/test/database-error")
        
        # Verify the response
        assert response.status_code == 500
        data = response.json()
        assert data["error"] == "DatabaseOperationError"
        assert data["message"] == "Test database error"
        assert data["details"]["operation"] == "test_operation"
        assert data["details"]["entity_type"] == "test_entity"
    
    def test_http_exception_response(self, client):
        """Test response format for HTTPException."""
        # Make a request that triggers an HTTPException
        response = client.get("/test/http-exception")
        
        # Verify the response
        assert response.status_code == 403
        data = response.json()
        assert data["error"] == "HTTPException"
        assert data["message"] == "Forbidden"
    
    def test_generic_exception_response(self, client):
        """Test response format for unhandled exceptions."""
        # Make a request that triggers a generic exception
        response = client.get("/test/generic-exception")
        
        # Verify the response
        assert response.status_code == 500
        data = response.json()
        assert data["error"] == "ValueError"
        assert data["message"] == "Test generic error"
    
    @patch("src.api.middleware.error_handlers.logger")
    def test_exception_logging(self, mock_logger, client):
        """Test that exceptions are properly logged."""
        # Configure the mock logger
        mock_logger.error = MagicMock()
        
        # Make a request that triggers an error
        client.get("/test/database-error")
        
        # Verify that the error was logged
        mock_logger.error.assert_called()
        # Check that the error message was logged
        call_args = mock_logger.error.call_args[0][0]
        assert "database error" in call_args.lower()