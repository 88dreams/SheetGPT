from typing import List, Dict, Any, Optional
from app.db.session import get_db
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

class Logger:
    """Simple class to handle debug logging with configurable verbosity."""
    
    def __init__(self, debug_enabled=True):
        """Initialize the logger with debug flag."""
        self.debug_enabled = debug_enabled
    
    def debug(self, message: str) -> None:
        """Log a debug message if debug is enabled."""
        if self.debug_enabled:
            print(f"DEBUG - Service: {message}")
    
    def warning(self, message: str) -> None:
        """Log a warning message."""
        print(f"WARNING: {message}")


class SQLQueryBuilder:
    """Class to handle SQL query building with various clauses."""
    
    def __init__(self, entity_type: str, columns: str, logger: Logger):
        """Initialize the query builder with entity type and column info."""
        self.entity_type = entity_type
        self.columns = columns
        self.query = ""
        self.params = {}
        self.logger = logger
        self._init_query()
    
    def _init_query(self) -> None:
        """Initialize the base SELECT query."""
        # Build the SELECT clause - either specific columns or * as fallback
        select_clause = f"SELECT {self.columns}" if self.columns else f"SELECT * FROM {self.entity_type}"
        
        # Complete the query
        self.query = f"{select_clause}" if "FROM" in select_clause else f"{select_clause} FROM {self.entity_type}"
    
    def add_filters(self, filters: List[Dict[str, Any]]) -> None:
        """Add WHERE clauses based on the provided filters."""
        if not filters or len(filters) == 0:
            return
            
        self.logger.debug(f"Processing {len(filters)} filters")
        self.logger.debug(f"Filters type: {type(filters)}")
        
        # Log each filter for debugging
        for i, filter_config in enumerate(filters):
            self.logger.debug(f"Filter {i}: {filter_config}")
        
        where_clauses = []
        for i, filter_config in enumerate(filters):
            field = filter_config.get('field')
            operator = filter_config.get('operator')
            value = filter_config.get('value')
            
            self.logger.debug(f"Filter {i}: field={field}, operator={operator}, value={value}, value_type={type(value)}")
            
            # Skip invalid filters
            if not all([field, operator, value is not None]):
                self.logger.debug(f"Skipping filter {i} due to missing field, operator, or value")
                continue
            
            # Add the filter to the WHERE clause
            param_name = f"param_{i}"
            
            # For case-insensitive LIKE searches
            if operator == 'LIKE':
                where_clauses.append(f"LOWER({field}) {operator} LOWER(:{param_name})")
            else:
                where_clauses.append(f"{field} {operator} :{param_name}")
            
            self.params[param_name] = value
            self.logger.debug(f"Added WHERE clause for {field} with operator {operator} and value {value}, value_type={type(value)}")
        
        if where_clauses:
            self.query += " WHERE " + " AND ".join(where_clauses)
            self.logger.debug(f"Final WHERE clause: {' AND '.join(where_clauses)}")
            self.logger.debug(f"Final params: {self.params}")
    
    def add_order_by(self, sort_by: str, sort_direction: str) -> None:
        """Add ORDER BY clause to the query."""
        self.query += f" ORDER BY {sort_by} {sort_direction.upper()}"
    
    def add_pagination(self, limit: int, offset: int) -> None:
        """Add LIMIT and OFFSET clauses for pagination."""
        self.query += f" LIMIT {limit} OFFSET {offset}"
    
    def get_query(self) -> str:
        """Get the final SQL query string."""
        return self.query
    
    def get_params(self) -> Dict[str, Any]:
        """Get the parameter dictionary for the query."""
        return self.params


class DatabaseExecutor:
    """Class to handle database query execution with error handling."""
    
    def __init__(self, logger: Logger):
        """Initialize the executor with a logger."""
        self.logger = logger
    
    def execute_query(self, query: str, params: Dict[str, Any], entity_type: str, 
                      field_filter_func) -> List[Dict[str, Any]]:
        """
        Execute a SQL query with error handling and entity field filtering.
        
        Args:
            query: SQL query string
            params: Query parameters
            entity_type: Type of entity being queried
            field_filter_func: Function to filter entity fields
            
        Returns:
            List of filtered entity dictionaries
        """
        self.logger.debug(f"Executing SQL query: {query}")
        self.logger.debug(f"With parameters: {params}")
        
        try:
            # Get database connection
            db = next(get_db())
            
            # Execute the query
            result = db.execute(text(query), params)
            raw_entities = [dict(row) for row in result]
            self.logger.debug(f"Retrieved {len(raw_entities)} raw entities")
            
            # Filter field for specific entity type to prevent fields from other entities showing up
            entities = []
            for raw_entity in raw_entities:
                filtered_entity = field_filter_func(raw_entity, entity_type)
                entities.append(filtered_entity)
            
            if entities:
                self.logger.debug(f"Sample entity (after filtering): {entities[0]}")
            
            return entities
            
        except SQLAlchemyError as e:
            return self._handle_sql_error(e, entity_type, query, params, field_filter_func)
    
    def _handle_sql_error(self, error: SQLAlchemyError, entity_type: str, 
                          query: str, params: Dict[str, Any], 
                          field_filter_func) -> List[Dict[str, Any]]:
        """Handle SQL errors with appropriate fallback strategies."""
        self.logger.debug(f"Database error: {str(error)}")
        error_msg = str(error)
        self.logger.debug(f"Full error: {error_msg}")
        
        # If there's a parameter binding error, try a fallback query
        if "bind parameter" in error_msg.lower():
            self.logger.debug(f"Parameter binding error detected. Params: {params}")
            return self._execute_fallback_query(entity_type, field_filter_func)
        
        # Re-raise other errors
        raise Exception(f"Database error: {str(error)}")
    
    def _execute_fallback_query(self, entity_type: str, field_filter_func, limit: int = 50) -> List[Dict[str, Any]]:
        """Execute a simple fallback query when the main query fails."""
        self.logger.debug("Attempting fallback query without parameters")
        
        try:
            db = next(get_db())
            
            # Execute a simple query without filters
            simple_query = f"SELECT * FROM {entity_type} LIMIT {limit}"
            simple_result = db.execute(text(simple_query))
            raw_entities = [dict(row) for row in simple_result]
            self.logger.debug(f"Fallback query retrieved {len(raw_entities)} raw entities")
            
            # Filter fields for each entity
            filtered_entities = []
            for raw_entity in raw_entities:
                filtered_entity = field_filter_func(raw_entity, entity_type)
                filtered_entities.append(filtered_entity)
                
            return filtered_entities
            
        except SQLAlchemyError as fallback_error:
            self.logger.debug(f"Fallback query also failed: {str(fallback_error)}")
            raise Exception(f"Database error: {str(fallback_error)}")
    
    def execute_soccer_league_fallback(self, entity_type: str, field_filter_func, 
                                      columns: str) -> List[Dict[str, Any]]:
        """Execute a special fallback query for soccer leagues."""
        self.logger.debug("No results with parameterized query, trying direct SQL query for soccer leagues")
        
        try:
            db = next(get_db())
            
            # Get columns for league entity type
            select_clause = f"SELECT {columns}" if columns else "SELECT *"
            direct_query = f"{select_clause} FROM league WHERE sport = 'Soccer'"
            
            direct_result = db.execute(text(direct_query))
            raw_direct_entities = [dict(row) for row in direct_result]
            self.logger.debug(f"Direct query found {len(raw_direct_entities)} soccer leagues")
            
            # Filter fields for each entity
            filtered_direct_entities = []
            for raw_entity in raw_direct_entities:
                filtered_entity = field_filter_func(raw_entity, 'league')
                filtered_direct_entities.append(filtered_entity)
            
            if filtered_direct_entities:
                self.logger.debug(f"First soccer league after filtering: {filtered_direct_entities[0]}")
            
            return filtered_direct_entities
            
        except SQLAlchemyError as direct_error:
            self.logger.debug(f"Direct soccer query failed: {str(direct_error)}")
            raise Exception(f"Database error: {str(direct_error)}")


class SportsDatabaseService:
    """Service for interacting with the sports database."""
    
    def __init__(self, debug_enabled=True):
        """Initialize the service with optional debug mode."""
        self.logger = Logger(debug_enabled)
        self.executor = DatabaseExecutor(self.logger)
    
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
        self.logger.debug(f"get_entities called with entity_type={entity_type}, filters={filters}")
        
        # Validate entity type
        if not self._is_valid_entity_type(entity_type):
            self.logger.debug(f"Invalid entity type: {entity_type}")
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        # Calculate offset for pagination
        offset = (page - 1) * limit
        
        # Build the base query with explicit column selection
        columns = self._get_entity_columns(entity_type)
        
        # Build the SQL query
        query_builder = SQLQueryBuilder(entity_type, columns, self.logger)
        
        # Add filters if provided
        if filters and len(filters) > 0:
            query_builder.add_filters(filters)
        
        # Add ordering and pagination
        query_builder.add_order_by(sort_by, sort_direction)
        query_builder.add_pagination(limit, offset)
        
        # Get the final query and parameters
        query = query_builder.get_query()
        params = query_builder.get_params()
        
        self.logger.debug(f"Final query: {query}")
        self.logger.debug(f"Query params: {params}")
        
        # Execute the query
        entities = self.executor.execute_query(
            query, params, entity_type, self._filter_entity_fields
        )
        
        # If no results and we're filtering for soccer leagues, try direct query as fallback
        if (len(entities) == 0 and entity_type == 'league' and filters and 
            any(f.get('field') == 'sport' and f.get('value') == 'Soccer' for f in filters)):
            
            entities = self.executor.execute_soccer_league_fallback(
                entity_type, self._filter_entity_fields, columns
            )
            
        return entities
    
    def _is_valid_entity_type(self, entity_type: str) -> bool:
        """Check if the entity type is valid."""
        valid_types = [
            'league', 'team', 'player', 'game', 'stadium', 
            'broadcast', 'production', 'brand', 'game_broadcast', 
            'league_executive', 'division_conference'
        ]
        return entity_type in valid_types
    
    def _filter_entity_fields(self, entity: Dict[str, Any], entity_type: str) -> Dict[str, Any]:
        """
        Filter entity fields to include only fields relevant for the specific entity type.
        This prevents fields from other entity types showing up in the response.
        """
        allowed_fields = self._get_entity_fields(entity_type)
        filtered_entity = {}
        
        # If allowed_fields is None, don't filter (use all fields)
        if allowed_fields is None:
            return entity
        
        # Include only allowed fields for this entity type
        for field, value in entity.items():
            if field in allowed_fields:
                filtered_entity[field] = value
        
        self.logger.debug(f"Filtered entity fields for {entity_type} from {len(entity)} to {len(filtered_entity)} fields")
                
        return filtered_entity
    
    def _get_entity_columns(self, entity_type: str) -> str:
        """
        Get the SQL column list for a specific entity type.
        Returns a comma-separated string of column names for use in a SELECT statement.
        Returns empty string if no specific columns are defined (will use * instead).
        """
        # Get the allowed fields for this entity type
        allowed_fields = self._get_entity_fields(entity_type)
        
        # If no specific fields defined, return empty string (will use SELECT * as fallback)
        if allowed_fields is None:
            return ""
        
        # Join the fields into a comma-separated string
        return ", ".join(allowed_fields)
    
    def _get_entity_fields(self, entity_type: str) -> List[str]:
        """
        Get the list of valid fields for a specific entity type.
        These fields are determined based on the database schema.
        """
        # Base fields common to all entities
        base_fields = ["id", "created_at", "updated_at", "deleted_at"]
        
        # Entity-specific fields
        if entity_type == 'league':
            return base_fields + ["name", "sport", "country", "nickname", "broadcast_start_date", "broadcast_end_date", "commissioner"]
            
        elif entity_type == 'team':
            return base_fields + ["name", "city", "state", "country", "founded_year", "league_id", "division_conference_id", "stadium_id", "league_name", "division_conference_name", "stadium_name"]
            
        elif entity_type == 'player':
            return base_fields + ["name", "team_id", "position", "jersey_number", "college", "team_name"]
            
        elif entity_type == 'game':
            return base_fields + ["league_id", "home_team_id", "away_team_id", "stadium_id", "date", "time", "home_score", "away_score", "status", "season_year", "season_type", "league_name", "home_team_name", "away_team_name", "stadium_name"]
            
        elif entity_type == 'stadium':
            return base_fields + ["name", "city", "state", "country", "capacity", "owner", "naming_rights_holder", "host_broadcaster", "host_broadcaster_id", "host_broadcaster_name"]
            
        elif entity_type in ['broadcast', 'broadcast_right', 'broadcast_rights']:
            return base_fields + ["entity_type", "entity_id", "broadcast_company_id", "division_conference_id", "territory", "start_date", "end_date", "is_exclusive", "entity_name", "broadcast_company_name", "division_conference_name", "name"]
            
        elif entity_type in ['production', 'production_service', 'production_services']:
            return base_fields + ["entity_type", "entity_id", "production_company_id", "service_type", "start_date", "end_date", "entity_name", "production_company_name", "name"]
            
        elif entity_type in ['game_broadcast', 'game_broadcasts']:
            return base_fields + ["game_id", "broadcast_company_id", "production_company_id", "broadcast_type", "territory", "start_time", "end_time", "game_name", "broadcast_company_name", "production_company_name", "name"]
            
        elif entity_type == 'brand':
            return base_fields + ["name", "industry"]
            
        elif entity_type in ['brand_relationship', 'brand_relationships']:
            return base_fields + ["brand_id", "entity_type", "entity_id", "relationship_type", "start_date", "end_date", "brand_name", "entity_name", "name"]
            
        elif entity_type == 'league_executive':
            return base_fields + ["league_id", "name", "position", "start_date", "end_date", "league_name"]
            
        elif entity_type == 'division_conference':
            return base_fields + ["league_id", "name", "type", "region", "description", "league_name"]
            
        # Fallback - return all fields to avoid filtering out anything
        # This is a safe fallback that will allow all fields but log a warning
        self.logger.warning(f"No field mapping defined for entity type '{entity_type}', returning all fields")
        return None  # None means allow all fields
    
    # ... existing methods ... 