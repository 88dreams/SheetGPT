"""
Tests for BaseEntityService with error handling functionality.
"""
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch, create_autospec
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import Column, String, select, delete

from src.services.sports.base_service import BaseEntityService
from src.utils.errors import EntityNotFoundError, DatabaseOperationError, ValidationError
from src.services.sports.utils import normalize_entity_type


# Create a better mock for SQLAlchemy models
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
    
    # Add class attributes to mimic SQLAlchemy model columns
    id = Column(String, primary_key=True)
    name = Column(String)


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
        
        # Patch the critical SQLAlchemy functions
        self.select_patcher = patch('src.services.sports.base_service.select')
        self.mock_select = self.select_patcher.start()
        self.mock_select.return_value = MagicMock()
        self.mock_select.side_effect = lambda *args: MagicMock()
        
        self.or_patcher = patch('src.services.sports.base_service.or_')
        self.mock_or = self.or_patcher.start()
        
        self.func_patcher = patch('src.services.sports.base_service.func')
        self.mock_func = self.func_patcher.start()
        
        self.update_patcher = patch('src.services.sports.base_service.update')
        self.mock_update = self.update_patcher.start()

        # Now initialize the service
        self.service = BaseEntityService(self.model_class)
        self.mock_db = AsyncMock(spec=AsyncSession)
        self.entity_id = str(uuid.uuid4())
    
    def teardown_method(self):
        """Clean up patches."""
        self.select_patcher.stop()
        self.or_patcher.stop()
        self.func_patcher.stop()
        self.update_patcher.stop()
    
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
        
    async def test_find_entity_by_id(self):
        """Test finding an entity by ID string."""
        # Arrange
        mock_entity = MockModel(id=self.entity_id, name="Test Entity")
        self.mock_db.execute.return_value = MockQueryResult(mock_entity)
        
        # Act
        result = await self.service.find_entity(self.mock_db, str(self.entity_id))
        
        # Assert
        assert result == mock_entity
        
    async def test_find_entity_by_name(self):
        """Test finding an entity by name."""
        # Arrange
        entity_name = "Test Entity"
        mock_entity = MockModel(id=self.entity_id, name=entity_name)
        
        # First query returns no results (exact match fails)
        first_result = MockQueryResult(None)
        # Second query returns results (partial match)
        second_result = MockQueryResult(entities=[mock_entity])
        
        self.mock_db.execute.side_effect = [first_result, second_result]
        
        # Act
        result = await self.service.find_entity(self.mock_db, "Test")
        
        # Assert
        assert result == mock_entity
        assert self.mock_db.execute.call_count == 2
        
    async def test_find_entity_not_found(self):
        """Test finding an entity that doesn't exist."""
        # Arrange
        # Both exact and partial match queries return no results
        self.mock_db.execute.side_effect = [
            MockQueryResult(None),  # ID lookup fails
            MockQueryResult(None),  # Exact name match fails
            MockQueryResult(entities=[])  # Partial match fails
        ]
        
        # Act
        result = await self.service.find_entity(self.mock_db, "Nonexistent", raise_not_found=False)
        
        # Assert
        assert result is None
        
        # Test with raise_not_found=True
        self.mock_db.execute.side_effect = [
            MockQueryResult(None),  # ID lookup fails
            MockQueryResult(None),  # Exact name match fails
            MockQueryResult(entities=[])  # Partial match fails
        ]
        
        with pytest.raises(EntityNotFoundError):
            await self.service.find_entity(self.mock_db, "Nonexistent", raise_not_found=True)
            
    async def test_bulk_create(self):
        """Test bulk creation of entities."""
        # Arrange
        entities_data = [
            {"name": "Entity 1"},
            {"name": "Entity 2"}
        ]
        
        # Mock the create_entity method to return mock entities
        with patch.object(self.service, 'create_entity') as mock_create:
            mock_create.side_effect = [
                MockModel(name="Entity 1"),
                MockModel(name="Entity 2")
            ]
            
            # Act
            results = await self.service.bulk_create(self.mock_db, entities_data)
            
            # Assert
            assert len(results) == 2
            assert results[0].name == "Entity 1"
            assert results[1].name == "Entity 2"
            assert mock_create.call_count == 2
            
    async def test_normalize_entity_type(self):
        """Test entity type normalization function."""
        # Test cases for normalize_entity_type function
        assert normalize_entity_type("TEAM") == "team"
        assert normalize_entity_type("teams") == "team"
        assert normalize_entity_type("division") == "division_conference"
        assert normalize_entity_type("conference") == "division_conference"
        assert normalize_entity_type("broadcast") == "broadcast_rights"
        assert normalize_entity_type("production") == "production_services"
        assert normalize_entity_type("championship") == "championship"  # Special case preserved
        assert normalize_entity_type("tournament") == "tournament"  # Special case preserved
        
    async def test_get_entity_type_from_model(self):
        """Test deriving entity type from model class."""
        assert self.service._get_entity_type_from_model() == "mockmodel"
        
    async def test_prepare_filters(self):
        """Test converting filter dict to SQLAlchemy conditions."""
        # Add attributes to test filtering
        self.model_class.name = MagicMock()
        self.model_class.type = MagicMock()
        self.model_class.status = MagicMock()
        
        # Test various filter types
        filters = {
            "name": "Test",
            "type": "Type",
            "status": "active"
        }
        
        conditions = self.service._prepare_filters(filters)
        assert len(conditions) == 3