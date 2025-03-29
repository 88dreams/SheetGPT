"""
Tests for BaseEntityService with error handling functionality.
"""
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from src.services.sports.base_service import BaseEntityService
from src.utils.errors import EntityNotFoundError, DatabaseOperationError


# Create a simple model class for testing
class MockModel:
    __tablename__ = "mock_models"
    
    def __init__(self, id=None, name=None, **kwargs):
        self.id = id or str(uuid.uuid4())
        self.name = name
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    # Add a __table__ attribute with columns for _model_to_dict
    __table__ = MagicMock()
    __table__.columns = [MagicMock(name="id"), MagicMock(name="name")]


class MockQueryResult:
    """Mock for SQLAlchemy query result."""
    def __init__(self, entity=None, entities=None):
        self.entity = entity
        self.entities = entities or []
    
    def scalars(self):
        """Return a mock scalars result"""
        return self
    
    def first(self):
        """Return the entity or None"""
        return self.entity
    
    def all(self):
        """Return all entities"""
        return self.entities


@pytest.mark.asyncio
class TestBaseEntityService:
    """Test cases for the BaseEntityService class."""
    
    def setup_method(self):
        """Set up test dependencies."""
        self.model_class = MockModel
        self.service = BaseEntityService(self.model_class)
        self.mock_db = AsyncMock(spec=AsyncSession)
        self.entity_id = str(uuid.uuid4())
    
    async def test_get_entity_success(self):
        """Test successful entity retrieval."""
        # Arrange
        mock_entity = MockModel(id=self.entity_id, name="Test Entity")
        self.mock_db.execute.return_value = MockQueryResult(mock_entity)
        
        # Act
        result = await self.service.get_entity(self.mock_db, self.entity_id)
        
        # Assert
        assert result == mock_entity
        self.mock_db.execute.assert_called_once()
    
    async def test_get_entity_not_found(self):
        """Test entity not found error."""
        # Arrange
        self.mock_db.execute.return_value = MockQueryResult(None)
        
        # Act & Assert
        with pytest.raises(EntityNotFoundError) as exc_info:
            await self.service.get_entity(self.mock_db, self.entity_id)
        
        # Verify the error details
        assert self.entity_id in str(exc_info.value)
        assert "mockmodel" in str(exc_info.value).lower()  # Entity type derived from class name
    
    async def test_get_entity_by_name_success(self):
        """Test successful entity retrieval by name."""
        # Arrange
        entity_name = "Test Entity"
        mock_entity = MockModel(id=self.entity_id, name=entity_name)
        self.mock_db.execute.return_value = MockQueryResult(mock_entity)
        
        # Act
        result = await self.service.get_entity_by_name(self.mock_db, entity_name)
        
        # Assert
        assert result == mock_entity
        self.mock_db.execute.assert_called_once()
    
    async def test_get_entity_by_name_not_found(self):
        """Test entity not found by name error."""
        # Arrange
        entity_name = "Nonexistent Entity"
        self.mock_db.execute.return_value = MockQueryResult(None)
        
        # Act & Assert
        with pytest.raises(EntityNotFoundError) as exc_info:
            await self.service.get_entity_by_name(self.mock_db, entity_name)
        
        # Verify the error details
        assert entity_name in str(exc_info.value)
        assert "mockmodel" in str(exc_info.value).lower()
    
    async def test_create_entity_success(self):
        """Test successful entity creation."""
        # Arrange
        entity_data = {"name": "New Entity"}
        
        # Mock the add, commit, and refresh methods
        self.mock_db.add = AsyncMock()
        self.mock_db.commit = AsyncMock()
        self.mock_db.refresh = AsyncMock()
        
        # Act
        result = await self.service.create_entity(self.mock_db, entity_data)
        
        # Assert
        assert result is not None
        assert result.name == "New Entity"
        self.mock_db.add.assert_called_once()
        self.mock_db.commit.assert_called_once()
        self.mock_db.refresh.assert_called_once()
    
    async def test_create_entity_database_error(self):
        """Test database error during entity creation."""
        # Arrange
        entity_data = {"name": "New Entity"}
        
        # Mock the add method
        self.mock_db.add = AsyncMock()
        # Make commit raise an error
        self.mock_db.commit = AsyncMock(side_effect=SQLAlchemyError("Database error"))
        self.mock_db.rollback = AsyncMock()
        
        # Act & Assert
        with pytest.raises(DatabaseOperationError) as exc_info:
            await self.service.create_entity(self.mock_db, entity_data)
        
        # Verify error handling
        assert "Database operation failed" in str(exc_info.value)
        self.mock_db.rollback.assert_called_once()
    
    async def test_update_entity_success(self):
        """Test successful entity update."""
        # Arrange
        update_data = {"name": "Updated Name"}
        mock_entity = MockModel(id=self.entity_id, name="Original Name")
        self.mock_db.execute.return_value = MockQueryResult(mock_entity)
        self.mock_db.commit = AsyncMock()
        self.mock_db.refresh = AsyncMock()
        
        # Act
        result = await self.service.update_entity(self.mock_db, self.entity_id, update_data)
        
        # Assert
        assert result == mock_entity
        assert result.name == "Updated Name"  # Value was updated
        self.mock_db.commit.assert_called_once()
        self.mock_db.refresh.assert_called_once()
    
    async def test_update_entity_not_found(self):
        """Test entity not found during update."""
        # Arrange
        update_data = {"name": "Updated Name"}
        self.mock_db.execute.return_value = MockQueryResult(None)
        
        # Act & Assert
        with pytest.raises(EntityNotFoundError) as exc_info:
            await self.service.update_entity(self.mock_db, self.entity_id, update_data)
        
        # Verify error details
        assert self.entity_id in str(exc_info.value)
    
    async def test_delete_entity_success(self):
        """Test successful entity deletion."""
        # Arrange
        mock_entity = MockModel(id=self.entity_id, name="Test Entity")
        self.mock_db.execute.return_value = MockQueryResult(mock_entity)
        self.mock_db.delete = AsyncMock()
        self.mock_db.commit = AsyncMock()
        
        # Act
        result = await self.service.delete_entity(self.mock_db, self.entity_id)
        
        # Assert
        assert result is True
        self.mock_db.delete.assert_called_once_with(mock_entity)
        self.mock_db.commit.assert_called_once()
    
    async def test_delete_entity_not_found(self):
        """Test entity not found during deletion."""
        # Arrange
        self.mock_db.execute.return_value = MockQueryResult(None)
        
        # Act & Assert
        with pytest.raises(EntityNotFoundError) as exc_info:
            await self.service.delete_entity(self.mock_db, self.entity_id)
        
        # Verify error details
        assert self.entity_id in str(exc_info.value)
    
    async def test_delete_entity_database_error(self):
        """Test database error during entity deletion."""
        # Arrange
        mock_entity = MockModel(id=self.entity_id, name="Test Entity")
        self.mock_db.execute.return_value = MockQueryResult(mock_entity)
        self.mock_db.delete = AsyncMock()
        # Make commit raise an error
        self.mock_db.commit = AsyncMock(side_effect=SQLAlchemyError("Database error"))
        self.mock_db.rollback = AsyncMock()
        
        # Act & Assert
        with pytest.raises(DatabaseOperationError) as exc_info:
            await self.service.delete_entity(self.mock_db, self.entity_id)
        
        # Verify error handling
        assert "Database operation failed" in str(exc_info.value)
        self.mock_db.rollback.assert_called_once()