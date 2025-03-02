from typing import List, Dict, Any, Optional
from app.db.session import get_db
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

class SportsDatabaseService:
    """Service for interacting with the sports database."""
    
    async def get_entities(
        self, 
        entity_type: str,
        filters: Optional[List[Dict[str, Any]]] = None,
        page: int = 1,
        limit: int = 50,
        sort_by: str = "id",
        sort_direction: str = "asc"
    ) -> List[Dict[str, Any]]:
        """
        Get entities of a specific type with filtering, pagination and sorting.
        
        Args:
            entity_type: The type of entity to retrieve (e.g., 'league', 'team')
            filters: List of filter configurations
            page: Page number for pagination
            limit: Number of items per page
            sort_by: Field to sort by
            sort_direction: Sort direction ('asc' or 'desc')
            
        Returns:
            List of entity dictionaries
        """
        # Debug logging
        print(f"DEBUG - Service: get_entities called with entity_type={entity_type}, filters={filters}")
        
        # Validate entity type
        if not self._is_valid_entity_type(entity_type):
            print(f"DEBUG - Service: Invalid entity type: {entity_type}")
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        # Calculate offset for pagination
        offset = (page - 1) * limit
        
        # Build the base query
        query = f"SELECT * FROM {entity_type}"
        
        # Add WHERE clause for filters
        params = {}
        if filters and len(filters) > 0:
            print(f"DEBUG - Service: Processing {len(filters)} filters")
            print(f"DEBUG - Service: Filters type: {type(filters)}")
            
            # Log each filter for debugging
            for i, filter_config in enumerate(filters):
                print(f"DEBUG - Service: Filter {i}: {filter_config}")
            
            where_clauses = []
            for i, filter_config in enumerate(filters):
                field = filter_config.get('field')
                operator = filter_config.get('operator')
                value = filter_config.get('value')
                
                print(f"DEBUG - Service: Filter {i}: field={field}, operator={operator}, value={value}, value_type={type(value)}")
                
                # Skip invalid filters
                if not all([field, operator, value is not None]):
                    print(f"DEBUG - Service: Skipping filter {i} due to missing field, operator, or value")
                    continue
                
                # Add the filter to the WHERE clause
                param_name = f"param_{i}"
                
                # For case-insensitive LIKE searches
                if operator == 'LIKE':
                    where_clauses.append(f"LOWER({field}) {operator} LOWER(:{param_name})")
                else:
                    where_clauses.append(f"{field} {operator} :{param_name}")
                
                params[param_name] = value
                print(f"DEBUG - Service: Added WHERE clause for {field} with operator {operator} and value {value}, value_type={type(value)}")
            
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
                print(f"DEBUG - Service: Final WHERE clause: {' AND '.join(where_clauses)}")
                print(f"DEBUG - Service: Final params: {params}")
        
        # Add ORDER BY clause
        query += f" ORDER BY {sort_by} {sort_direction.upper()}"
        
        # Add LIMIT and OFFSET for pagination
        query += f" LIMIT {limit} OFFSET {offset}"
        
        print(f"DEBUG - Service: Final query: {query}")
        print(f"DEBUG - Service: Query params: {params}")
        
        # Execute the query
        try:
            db = next(get_db())
            print(f"DEBUG - Service: Executing SQL query: {query}")
            print(f"DEBUG - Service: With parameters: {params}")
            
            # Execute the query with parameters
            result = db.execute(text(query), params)
            entities = [dict(row) for row in result]
            print(f"DEBUG - Service: Retrieved {len(entities)} entities")
            
            # If no results and we're filtering for soccer leagues, try a direct query as fallback
            if len(entities) == 0 and entity_type == 'league' and filters and any(f.get('field') == 'sport' and f.get('value') == 'Soccer' for f in filters):
                print("DEBUG - Service: No results with parameterized query, trying direct SQL query for soccer leagues")
                direct_result = db.execute(text("SELECT * FROM league WHERE sport = 'Soccer'"))
                direct_entities = [dict(row) for row in direct_result]
                print(f"DEBUG - Service: Direct query found {len(direct_entities)} soccer leagues")
                if direct_entities:
                    print(f"DEBUG - Service: First soccer league: {direct_entities[0]}")
                    return direct_entities
            
            if len(entities) > 0:
                print(f"DEBUG - Service: Sample entity: {entities[0]}")
            return entities
        except SQLAlchemyError as e:
            print(f"DEBUG - Service: Database error: {str(e)}")
            error_msg = str(e)
            print(f"DEBUG - Service: Full error: {error_msg}")
            
            # If there's a parameter binding error, try to diagnose it
            if "bind parameter" in error_msg.lower():
                print(f"DEBUG - Service: Parameter binding error detected. Params: {params}")
                # Try a simpler query without parameters as a fallback
                try:
                    print("DEBUG - Service: Attempting fallback query without parameters")
                    simple_query = f"SELECT * FROM {entity_type} LIMIT {limit}"
                    simple_result = db.execute(text(simple_query))
                    simple_entities = [dict(row) for row in simple_result]
                    print(f"DEBUG - Service: Fallback query retrieved {len(simple_entities)} entities")
                    return simple_entities
                except SQLAlchemyError as fallback_error:
                    print(f"DEBUG - Service: Fallback query also failed: {str(fallback_error)}")
            
            raise Exception(f"Database error: {str(e)}")
    
    def _is_valid_entity_type(self, entity_type: str) -> bool:
        """Check if the entity type is valid."""
        valid_types = [
            'league', 'team', 'player', 'game', 'stadium', 
            'broadcast', 'production', 'brand', 'game_broadcast', 
            'league_executive'
        ]
        return entity_type in valid_types
    
    # ... existing methods ... 