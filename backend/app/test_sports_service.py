"""
Unit tests for the refactored SportsDatabaseService.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy import text

from backend.app.services.sports_service import SportsDatabaseService, SQLQueryBuilder, DatabaseExecutor, Logger


class TestSportsDatabaseService(unittest.TestCase):
    """Test cases for the SportsDatabaseService class."""
    
    def setUp(self):
        """Set up test dependencies."""
        self.service = SportsDatabaseService(debug_enabled=False)
    
    def test_is_valid_entity_type(self):
        """Test entity type validation."""
        self.assertTrue(self.service._is_valid_entity_type('league'))
        self.assertTrue(self.service._is_valid_entity_type('team'))
        self.assertTrue(self.service._is_valid_entity_type('player'))
        self.assertFalse(self.service._is_valid_entity_type('invalid_type'))
    
    def test_get_entity_fields(self):
        """Test getting entity fields."""
        # Test league fields
        league_fields = self.service._get_entity_fields('league')
        self.assertIn('name', league_fields)
        self.assertIn('sport', league_fields)
        self.assertIn('country', league_fields)
        
        # Test team fields
        team_fields = self.service._get_entity_fields('team')
        self.assertIn('name', team_fields)
        self.assertIn('city', team_fields)
        self.assertIn('league_id', team_fields)
        
        # Test fallback for unknown entity type
        unknown_fields = self.service._get_entity_fields('unknown_type')
        self.assertIsNone(unknown_fields)
    
    def test_filter_entity_fields(self):
        """Test filtering entity fields."""
        entity = {
            'id': '123',
            'name': 'Test League',
            'sport': 'Soccer',
            'country': 'USA',
            'extra_field': 'should be filtered out'
        }
        
        filtered = self.service._filter_entity_fields(entity, 'league')
        self.assertIn('name', filtered)
        self.assertIn('sport', filtered)
        self.assertIn('country', filtered)
        self.assertNotIn('extra_field', filtered)
        
        # Test with None fields (no filtering)
        with patch.object(self.service, '_get_entity_fields', return_value=None):
            unfiltered = self.service._filter_entity_fields(entity, 'unknown')
            self.assertEqual(entity, unfiltered)


class TestSQLQueryBuilder(unittest.TestCase):
    """Test cases for the SQLQueryBuilder class."""
    
    def setUp(self):
        """Set up test dependencies."""
        self.logger = Logger(debug_enabled=False)
        
    def test_init_query(self):
        """Test query initialization."""
        # With columns
        builder = SQLQueryBuilder('league', 'id, name, sport', self.logger)
        self.assertEqual(builder.query, 'SELECT id, name, sport FROM league')
        
        # Without columns (should use *)
        builder = SQLQueryBuilder('team', '', self.logger)
        self.assertEqual(builder.query, 'SELECT * FROM team')
    
    def test_add_filters(self):
        """Test adding filters to the query."""
        builder = SQLQueryBuilder('league', 'id, name', self.logger)
        
        # Add a single filter
        filters = [{'field': 'sport', 'operator': '=', 'value': 'Soccer'}]
        builder.add_filters(filters)
        self.assertIn('WHERE sport = :param_0', builder.query)
        self.assertEqual(builder.params['param_0'], 'Soccer')
        
        # Add multiple filters
        builder = SQLQueryBuilder('team', 'id, name', self.logger)
        filters = [
            {'field': 'league_id', 'operator': '=', 'value': '123'},
            {'field': 'city', 'operator': 'LIKE', 'value': 'New%'}
        ]
        builder.add_filters(filters)
        self.assertIn('WHERE league_id = :param_0 AND LOWER(city) LIKE LOWER(:param_1)', builder.query)
        self.assertEqual(builder.params['param_0'], '123')
        self.assertEqual(builder.params['param_1'], 'New%')
    
    def test_add_order_by(self):
        """Test adding ORDER BY clause."""
        builder = SQLQueryBuilder('league', 'id, name', self.logger)
        builder.add_order_by('name', 'asc')
        self.assertIn('ORDER BY name ASC', builder.query)
        
        builder = SQLQueryBuilder('team', 'id, name', self.logger)
        builder.add_order_by('city', 'desc')
        self.assertIn('ORDER BY city DESC', builder.query)
    
    def test_add_pagination(self):
        """Test adding pagination."""
        builder = SQLQueryBuilder('league', 'id, name', self.logger)
        builder.add_pagination(10, 0)
        self.assertIn('LIMIT 10 OFFSET 0', builder.query)
        
        builder = SQLQueryBuilder('team', 'id, name', self.logger)
        builder.add_pagination(20, 40)
        self.assertIn('LIMIT 20 OFFSET 40', builder.query)


if __name__ == '__main__':
    unittest.main()