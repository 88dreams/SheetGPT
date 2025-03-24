"""
Unit tests for BrandService.
"""
import uuid
import pytest
import unittest
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime

# Import the service to test
from src.services.sports.brand_service import BrandService
from src.models.sports_models import Brand, BrandRelationship
from src.schemas.sports import BrandCreate, BrandUpdate, BrandResponse


class TestBrandService(unittest.TestCase):
    """Test cases for the BrandService class."""
    
    def setUp(self):
        """Set up test dependencies."""
        # Create mock dependencies
        self.mock_session = MagicMock(spec=AsyncSession)
        self.mock_validator = MagicMock()
        self.mock_logger = MagicMock()
        
        # Set up result for query executions
        self.mock_result = MagicMock()
        self.mock_session.execute.return_value = self.mock_result
        
        # Set up the service with mock dependencies
        self.service = BrandService(
            session=self.mock_session,
            validator=self.mock_validator,
            logger=self.mock_logger
        )
        
        # Set up sample test data
        self.sample_brand_id = str(uuid.uuid4())
        self.sample_brand = Brand(
            id=self.sample_brand_id,
            name="Test Brand",
            description="Test Description",
            logo_url="https://example.com/logo.png",
            website="https://example.com",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Set up related sample data for relationships
        self.sample_relationship_id = str(uuid.uuid4())
        self.sample_relationship = BrandRelationship(
            id=self.sample_relationship_id,
            brand_id=self.sample_brand_id,
            entity_id=str(uuid.uuid4()),
            entity_type="league",
            relationship_type="sponsor",
            start_date=datetime(2023, 1, 1),
            end_date=datetime(2024, 1, 1),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    @patch('src.services.sports.brand_service.select')
    async def test_get_brand_by_id_success(self, mock_select):
        """Test successful retrieval of a brand by ID."""
        # Arrange
        mock_select.return_value = select([Brand])
        self.mock_result.scalar_one_or_none.return_value = self.sample_brand
        
        # Act
        result = await self.service.get_by_id(self.sample_brand_id)
        
        # Assert
        self.assertEqual(result.id, self.sample_brand_id)
        self.assertEqual(result.name, "Test Brand")
        self.mock_session.execute.assert_called_once()
    
    @patch('src.services.sports.brand_service.select')
    async def test_get_brand_by_id_not_found(self, mock_select):
        """Test case where brand is not found."""
        # Arrange
        mock_select.return_value = select([Brand])
        self.mock_result.scalar_one_or_none.return_value = None
        
        # Act
        result = await self.service.get_by_id("non-existent-id")
        
        # Assert
        self.assertIsNone(result)
        self.mock_session.execute.assert_called_once()
    
    @patch('src.services.sports.brand_service.select')
    async def test_get_brands_with_filters(self, mock_select):
        """Test retrieval of brands with filters."""
        # Arrange
        mock_select.return_value = select([Brand])
        self.mock_result.scalars.return_value.all.return_value = [self.sample_brand]
        
        # Act
        filters = {"name": "Test"}
        result = await self.service.get_all(filters=filters)
        
        # Assert
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].id, self.sample_brand_id)
        self.mock_session.execute.assert_called_once()
    
    async def test_create_brand_success(self):
        """Test successful brand creation."""
        # Arrange
        brand_data = BrandCreate(
            name="New Brand",
            description="New Description",
            logo_url="https://example.com/newlogo.png",
            website="https://newexample.com"
        )
        
        # Mock the session.add and commit methods
        self.mock_session.add = AsyncMock()
        self.mock_session.commit = AsyncMock()
        self.mock_session.refresh = AsyncMock()
        
        # Mock uuid generation for predictable testing
        new_id = str(uuid.uuid4())
        with patch('uuid.uuid4', return_value=uuid.UUID(new_id)):
            # Act
            result = await self.service.create(brand_data)
            
            # Assert
            self.assertEqual(result.name, "New Brand")
            self.assertEqual(result.description, "New Description")
            self.mock_session.add.assert_called_once()
            self.mock_session.commit.assert_called_once()
            self.mock_session.refresh.assert_called_once()
    
    @patch('src.services.sports.brand_service.select')
    async def test_update_brand_success(self, mock_select):
        """Test successful brand update."""
        # Arrange
        mock_select.return_value = select([Brand])
        self.mock_result.scalar_one_or_none.return_value = self.sample_brand
        
        update_data = BrandUpdate(
            name="Updated Brand",
            description="Updated Description"
        )
        
        # Mock commit and refresh
        self.mock_session.commit = AsyncMock()
        self.mock_session.refresh = AsyncMock()
        
        # Act
        result = await self.service.update(self.sample_brand_id, update_data)
        
        # Assert
        self.assertEqual(result.name, "Updated Brand")
        self.assertEqual(result.description, "Updated Description")
        self.mock_session.commit.assert_called_once()
        self.mock_session.refresh.assert_called_once()
    
    @patch('src.services.sports.brand_service.select')
    async def test_update_brand_not_found(self, mock_select):
        """Test update when brand not found."""
        # Arrange
        mock_select.return_value = select([Brand])
        self.mock_result.scalar_one_or_none.return_value = None
        
        update_data = BrandUpdate(
            name="Updated Brand",
            description="Updated Description"
        )
        
        # Act
        result = await self.service.update("non-existent-id", update_data)
        
        # Assert
        self.assertIsNone(result)
        self.mock_session.commit.assert_not_called()
    
    @patch('src.services.sports.brand_service.select')
    async def test_delete_brand_success(self, mock_select):
        """Test successful brand deletion."""
        # Arrange
        mock_select.return_value = select([Brand])
        self.mock_result.scalar_one_or_none.return_value = self.sample_brand
        
        # Mock commit
        self.mock_session.commit = AsyncMock()
        
        # Act
        result = await self.service.delete(self.sample_brand_id)
        
        # Assert
        self.assertTrue(result)
        self.mock_session.delete.assert_called_once_with(self.sample_brand)
        self.mock_session.commit.assert_called_once()
    
    @patch('src.services.sports.brand_service.select')
    async def test_delete_brand_not_found(self, mock_select):
        """Test deletion when brand not found."""
        # Arrange
        mock_select.return_value = select([Brand])
        self.mock_result.scalar_one_or_none.return_value = None
        
        # Act
        result = await self.service.delete("non-existent-id")
        
        # Assert
        self.assertFalse(result)
        self.mock_session.delete.assert_not_called()
        self.mock_session.commit.assert_not_called()
    
    @patch('src.services.sports.brand_service.select')
    async def test_get_brand_relationships(self, mock_select):
        """Test retrieval of brand relationships."""
        # Arrange
        mock_select.return_value = select([BrandRelationship])
        self.mock_result.scalars.return_value.all.return_value = [self.sample_relationship]
        
        # Act
        result = await self.service.get_relationships(self.sample_brand_id)
        
        # Assert
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].id, self.sample_relationship_id)
        self.assertEqual(result[0].brand_id, self.sample_brand_id)
        self.mock_session.execute.assert_called_once()
    
    @patch('src.services.sports.brand_service.select')
    async def test_get_brand_by_name(self, mock_select):
        """Test retrieval of brand by name."""
        # Arrange
        mock_select.return_value = select([Brand])
        self.mock_result.scalar_one_or_none.return_value = self.sample_brand
        
        # Act
        result = await self.service.get_by_name("Test Brand")
        
        # Assert
        self.assertEqual(result.id, self.sample_brand_id)
        self.assertEqual(result.name, "Test Brand")
        self.mock_session.execute.assert_called_once()
    
    @patch('src.services.sports.brand_service.select')
    async def test_brand_exists_true(self, mock_select):
        """Test checking if brand exists (true case)."""
        # Arrange
        mock_select.return_value = select([Brand])
        self.mock_result.scalar_one_or_none.return_value = self.sample_brand
        
        # Act
        result = await self.service.exists(self.sample_brand_id)
        
        # Assert
        self.assertTrue(result)
        self.mock_session.execute.assert_called_once()
    
    @patch('src.services.sports.brand_service.select')
    async def test_brand_exists_false(self, mock_select):
        """Test checking if brand exists (false case)."""
        # Arrange
        mock_select.return_value = select([Brand])
        self.mock_result.scalar_one_or_none.return_value = None
        
        # Act
        result = await self.service.exists("non-existent-id")
        
        # Assert
        self.assertFalse(result)
        self.mock_session.execute.assert_called_once()


if __name__ == '__main__':
    unittest.main()