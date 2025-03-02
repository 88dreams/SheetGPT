from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
import json
from app.models.user import User
from app.api.deps import get_current_user
from app.services.sports_service import SportsDatabaseService
from app.schemas.sports import EntityCreate, EntityUpdate, EntityResponse
from app.schemas.common import PaginatedResponse
from sqlalchemy.sql import text
from app.db.session import get_db

router = APIRouter()
sports_service = SportsDatabaseService()

# Define filter operator mappings
FILTER_OPERATORS = {
    'eq': '=',
    'neq': '!=',
    'gt': '>',
    'lt': '<',
    'contains': 'LIKE',
    'startswith': 'LIKE',
    'endswith': 'LIKE'
}

@router.get("/entities/{entity_type}", response_model=List[Dict[str, Any]])
async def get_entities(
    entity_type: str,
    filters: Optional[str] = Query(None, description="JSON string of filter configurations"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("id", description="Field to sort by"),
    sort_direction: str = Query("asc", description="Sort direction (asc or desc)"),
    current_user: User = Depends(get_current_user)
):
    """
    Get entities of a specific type with advanced filtering support.
    
    Filters format:
    [
        {
            "field": "name",
            "operator": "contains",
            "value": "New York"
        },
        {
            "field": "founded_year",
            "operator": "gt",
            "value": 1980
        }
    ]
    """
    # Debug logging
    print(f"DEBUG - API: get_entities called with entity_type={entity_type}, filters={filters}")
    
    # Parse filters if provided
    parsed_filters = []
    if filters:
        try:
            print(f"DEBUG - API: Raw filters string: {filters}")
            filter_configs = json.loads(filters)
            print(f"DEBUG - API: Parsed filter_configs={filter_configs}")
            print(f"DEBUG - API: Filter configs type: {type(filter_configs)}")
            
            if not isinstance(filter_configs, list):
                print(f"DEBUG - API: filter_configs is not a list, converting to list")
                filter_configs = [filter_configs]
            
            for filter_config in filter_configs:
                field = filter_config.get('field')
                operator = filter_config.get('operator')
                value = filter_config.get('value')
                
                print(f"DEBUG - API: Processing filter: field={field}, operator={operator}, value={value}, value_type={type(value)}")
                
                if not all([field, operator, value is not None]):
                    print(f"DEBUG - API: Skipping filter due to missing field, operator, or value")
                    continue
                    
                # Map the operator to SQL syntax
                sql_operator = FILTER_OPERATORS.get(operator)
                if not sql_operator:
                    print(f"DEBUG - API: Skipping filter due to invalid operator: {operator}")
                    continue
                
                # Handle special operators
                if operator == 'contains':
                    value = f"%{value}%"
                    print(f"DEBUG - API: Modified value for 'contains' operator: {value}")
                elif operator == 'startswith':
                    value = f"{value}%"
                    print(f"DEBUG - API: Modified value for 'startswith' operator: {value}")
                elif operator == 'endswith':
                    value = f"%{value}"
                    print(f"DEBUG - API: Modified value for 'endswith' operator: {value}")
                
                # Special handling for 'sport' field in leagues
                if entity_type == 'league' and field == 'sport':
                    print(f"DEBUG - API: Special handling for league sport filter with value: {value}")
                
                parsed_filters.append({
                    "field": field,
                    "operator": sql_operator,
                    "value": value
                })
            
            print(f"DEBUG - API: Final parsed_filters={parsed_filters}")
        except json.JSONDecodeError as e:
            print(f"DEBUG - API: JSONDecodeError: {str(e)}")
            print(f"DEBUG - API: Raw filters that caused error: {filters}")
            raise HTTPException(status_code=400, detail=f"Invalid filter format: {str(e)}")
        except Exception as e:
            print(f"DEBUG - API: Unexpected error parsing filters: {str(e)}")
            print(f"DEBUG - API: Raw filters that caused error: {filters}")
            raise HTTPException(status_code=400, detail=f"Error processing filters: {str(e)}")
    
    # Get entities with filters
    try:
        entities = await sports_service.get_entities(
            entity_type=entity_type,
            filters=parsed_filters,
            page=page,
            limit=limit,
            sort_by=sort_by,
            sort_direction=sort_direction
        )
        print(f"DEBUG - API: Retrieved {len(entities)} entities")
        if len(entities) > 0:
            print(f"DEBUG - API: First entity sample: {entities[0]}")
        return entities
    except ValueError as e:
        print(f"DEBUG - API: ValueError in get_entities: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"DEBUG - API: Error in get_entities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-filter", response_model=List[Dict[str, Any]])
async def test_filter(
    current_user: User = Depends(get_current_user)
):
    """
    Test endpoint to verify filter functionality.
    """
    try:
        # Get a database connection
        db = next(get_db())
        
        # Execute a direct SQL query to get soccer leagues
        print("DEBUG - API: Executing direct SQL query for soccer leagues")
        result = db.execute(text("SELECT * FROM league WHERE sport = 'Soccer'"))
        entities = [dict(row) for row in result]
        print(f"DEBUG - API: Direct query found {len(entities)} soccer leagues")
        
        return entities
    except Exception as e:
        print(f"DEBUG - API: Error in test_filter: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/direct-filter", response_model=List[Dict[str, Any]])
async def direct_filter(
    field: str = Query(..., description="Field to filter on"),
    value: str = Query(..., description="Value to filter for"),
    current_user: User = Depends(get_current_user)
):
    """
    Test endpoint to directly filter entities using SQL parameters.
    """
    try:
        # Get a database connection
        db = next(get_db())
        
        # Execute a direct SQL query with parameters
        print(f"DEBUG - API: Executing direct SQL query with field={field}, value={value}")
        query = f"SELECT * FROM league WHERE {field} = :value"
        result = db.execute(text(query), {"value": value})
        entities = [dict(row) for row in result]
        print(f"DEBUG - API: Direct query found {len(entities)} matching leagues")
        
        return entities
    except Exception as e:
        print(f"DEBUG - API: Error in direct_filter: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ... existing code ... 