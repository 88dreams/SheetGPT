"""
Simple integration test for the refactored sports service.
This can be executed directly in the backend container.
"""
import sys
import os
from backend.app.services.sports_service import SportsDatabaseService

def test_service():
    """Basic tests to ensure the refactored service works."""
    print("Creating SportsDatabaseService...")
    service = SportsDatabaseService(debug_enabled=True)
    
    # Test entity type validation
    print("\nTesting entity type validation:")
    print(f"'league' is valid: {service._is_valid_entity_type('league')}")
    print(f"'invalid' is valid: {service._is_valid_entity_type('invalid')}")
    
    # Test column generation
    print("\nTesting column generation for league:")
    columns = service._get_entity_columns('league')
    print(f"Columns: {columns}")
    
    # Test query building (without executing)
    print("\nTesting SQL query building:")
    print("Creating query for leagues with sport='Soccer'")
    filters = [{"field": "sport", "operator": "=", "value": "Soccer"}]
    offset = 0
    limit = 5
    
    # Build SQL query
    from backend.app.services.sports_service import SQLQueryBuilder
    query_builder = SQLQueryBuilder('league', columns, service.logger)
    query_builder.add_filters(filters)
    query_builder.add_order_by('name', 'asc')
    query_builder.add_pagination(limit, offset)
    
    query = query_builder.get_query()
    params = query_builder.get_params()
    
    print(f"Generated query: {query}")
    print(f"Query parameters: {params}")
    
    print("\nTest completed successfully!")

if __name__ == "__main__":
    test_service()