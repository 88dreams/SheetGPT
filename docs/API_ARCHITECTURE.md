# API Architecture

## Overview

SheetGPT's API is built using FastAPI with a modular architecture:

1. **Routes**: API endpoints and HTTP request/response handling
2. **Services**: Business logic and database operations
3. **Models**: Database schema using SQLAlchemy ORM
4. **Schemas**: Request/response validation using Pydantic
5. **Core**: Configuration and shared functionality
6. **Config**: Environment-specific settings

## API Structure

The API is organized into modules:

- **Authentication**: User registration, login, and token management
- **Chat**: Conversation and message management with Claude API integration
- **Data Management**: Structured data operations with extraction services
- **Sports Database**: Sports entity management with relationship handling
- **Export**: Data export to Google Sheets
- **Admin**: Administrative functions
- **DB Management**: Database maintenance, query execution, and administration tools

## Authentication System

JWT-based authentication system:

```python
# Key authentication dependency
async def get_current_user(
    current_user_id = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    user_service = UserService(db)
    user = await user_service.get_user_by_id(current_user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user
```

## Sports Database API

### Entity Models

SQLAlchemy ORM models with PostgreSQL:

```python
# Example League model
class League(Base):
    __tablename__ = "leagues"
    
    id: Mapped[UUID] = mapped_column(SQLUUID, primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sport: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=True)
    founded_year: Mapped[int] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Relationships
    teams: Mapped[List["Team"]] = relationship("Team", back_populates="league")
```

### Entity Services

Business logic for managing sports entities is organized using a modular approach with domain-driven design:

```python
# Base service with shared functionality
class BaseService:
    def __init__(self, db: AsyncSession = None):
        self.db = db
        
    async def get_by_id(self, model_class, entity_id: UUID):
        """Get entity by ID with common error handling."""
        query = select(model_class).where(model_class.id == entity_id)
        result = await self.db.execute(query)
        return result.scalars().first()
        
    async def create_entity(self, model_class, data: dict):
        """Create entity with validation and error handling."""
        entity = model_class(**data)
        self.db.add(entity)
        await self.db.commit()
        await self.db.refresh(entity)
        return entity

# Entity-specific service with domain logic
class LeagueService(BaseService):
    async def get_leagues(self, skip: int = 0, limit: int = 100):
        """Get leagues with pagination."""
        query = select(League).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def create_league(self, league_data: LeagueCreate):
        """Create league with domain-specific validation."""
        # Validate league data
        validated_data = league_data.dict()
        return await self.create_entity(League, validated_data)

# Facade service that provides a unified API
class SportsService:
    def __init__(self):
        """Initialize with specific services."""
        self.league_service = LeagueService()
        self.team_service = TeamService()
        # Other services...
    
    async def get_leagues(self, db: AsyncSession, skip: int = 0, limit: int = 100):
        """Delegate to specialized service."""
        return await self.league_service.get_leagues(db, skip, limit)
    
    async def create_league(self, db: AsyncSession, league_data: LeagueCreate):
        """Delegate to specialized service."""
        return await self.league_service.create_league(db, league_data)
```

## Entity Relationship Handling

### Automatic Entity Resolution

During batch imports, the system resolves entity relationships:

1. **Entity Lookup**: Finds entities by name or creates them if they don't exist
2. **Enhanced Field Mapping**: Processes entity references based on entity type
3. **Entity Creation**: Creates missing entities automatically when needed
4. **Referential Integrity**: Maintains database constraints during operations

### Entity Relationship Flow

1. User maps fields in the SportDataMapper interface
2. During batch import, the system:
   - Maps basic fields directly
   - Identifies relationship fields (e.g., league_id, stadium_id)
   - Resolves relationships by UUID or name lookup
   - Creates missing entities when appropriate
   - Validates final mapped data before saving

### Entity Field Management

1. **Field Filtering**:
   - Backend sports service architecture handles field filtering:
     - Base `SportsDatabaseService` provides core query handling
     - Uses specialized query builders for constructing SQL queries
     - Implements dedicated error handling with fallback strategies
     - Uses logging utilities for consistent debug output
   - Entity fields filtered to only include relevant fields by entity type
   - Uses dedicated field mapping methods to determine valid fields
   - Returns filtered entity data with appropriate fields
   - Prevents fields from one entity type showing up in another

2. **Field Display**:
   - Frontend uses data-driven approach for column generation
   - Derives column visibility and ordering directly from API response data
   - Special handling for combined fields (like broadcast rights company names and territories)
   - Smart detection and display for relationship fields with corresponding name fields
   - Provides consistent toggle between UUIDs and human-readable names

### Frontend Component Architecture

1. **Component Organization**:
   - Components organized by feature with clear boundaries
   - UI components separated from data handling logic
   - Custom hooks for business logic and API interaction
   - Utility modules for common functions:
     - Data processing utilities
     - Notification management
     - Error handling
     - Entity processing 
     - Batch handling

2. **SportDataMapper Architecture**:
   - Dialog container for standard modals
   - Entity-specific views with focused responsibilities
   - Import process with clean separation:
     - Data transformation utilities
     - Batch processing logic with retries
     - Progress tracking and reporting
     - Error handling with consistent messaging
   - Notification system with automatic management

### Bulk Update Flow

1. User selects multiple entities using checkboxes in the entity list
2. User clicks "Bulk Edit" button to open the Bulk Edit modal
3. The system:
   - Loads available fields for the selected entity type 
   - Organizes fields into logical categories
   - Fetches related entities for dropdown fields
   - Provides appropriate input controls based on field types
4. User selects fields to update by checking boxes
5. User enters values for selected fields (or leaves empty to clear)
6. System processes updates in batches with progress tracking
7. System reports success/failure statistics

### Data Management Scripts

The system includes scripts for managing test data and maintaining database integrity:

1. **Sample Data Creation**:
   ```python
   async def create_sample_data():
       """Create sample data for the sports database."""
       async with engine.begin() as conn:
           # Insert in correct order to maintain relationships
           await conn.execute(text("INSERT INTO broadcast_companies ..."))
           await conn.execute(text("INSERT INTO leagues ..."))
           # ... more inserts in dependency order
   ```

2. **Data Cleanup**:
   ```python
   async def delete_sample_data():
       """Delete sample data in reverse dependency order."""
       async with engine.begin() as conn:
           # Delete in reverse order to maintain constraints
           await conn.execute(text("DELETE FROM brand_relationships"))
           await conn.execute(text("DELETE FROM game_broadcasts"))
           # ... more deletes in reverse dependency order
   ```

### Entity Dependencies

The system maintains strict entity dependencies:

1. **Primary Entities**:
   - Leagues
   - Broadcast Companies
   - Production Companies
   - Brands

2. **Secondary Entities**:
   - Teams (depends on leagues)
   - Stadiums (depends on broadcast companies)
   - Players (depends on teams)

3. **Relationship Entities**:
   - Games (depends on teams, stadiums)
   - Broadcast Rights (depends on broadcast companies)
   - Production Services (depends on production companies)
   - Brand Relationships (depends on brands)

## Export Service

Handles exporting data to Google Sheets:

1. **Entity Selection**: Frontend selects entities to export
2. **Data Retrieval**: Service retrieves entities and related data
3. **Spreadsheet Creation**: Creates a new spreadsheet via Google Sheets API
4. **Data Writing**: Writes data to the spreadsheet
5. **Response**: Returns spreadsheet ID and URL

### Implementation Status

- [x] OAuth2 authentication flow
- [x] Spreadsheet creation and basic operations
- [x] Data writing functionality
- [x] Template application
- [x] Frontend UI for export
- [ ] Complete end-to-end testing
- [ ] Error handling and recovery

## Database Transaction Management

Two complementary approaches:

1. **FastAPI Dependency Injection**: For standard endpoints
2. **Context Manager Sessions**: For operations requiring fine-grained control

```python
# Example of isolated session pattern
for table in tables:
    try:
        async with get_db_session() as session:
            result = await session.execute(sqlalchemy.text(f"DELETE FROM {table};"))
            await session.commit()
            results[table] = "Success"
    except Exception as e:
        success = False
        results[table] = f"Error: {str(e)}"
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register`: Register a new user
- `POST /api/v1/auth/login`: Login and get access token
- `GET /api/v1/auth/me`: Get current user information

### Chat
- `GET /api/v1/chat/conversations`: Get user conversations
- `POST /api/v1/chat/conversations`: Create a new conversation
- `GET /api/v1/chat/conversations/{conversation_id}`: Get conversation details
- `POST /api/v1/chat/conversations/{conversation_id}/messages`: Send a message
- `GET /api/v1/chat/conversations/{conversation_id}/messages`: Get conversation messages

### Data Management
- `GET /api/v1/data/structured`: Get structured data
- `POST /api/v1/data/structured`: Create structured data
- `GET /api/v1/data/structured/{data_id}`: Get structured data details
- `PUT /api/v1/data/structured/{data_id}`: Update structured data
- `DELETE /api/v1/data/structured/{data_id}`: Delete structured data

### Sports Database
- `GET /api/v1/sports/entities/{entity_type}`: Get entities with filtering
- `POST /api/v1/sports/entities/{entity_type}`: Create a new entity
- `GET /api/v1/sports/entities/{entity_type}/{entity_id}`: Get entity details
- `PUT /api/v1/sports/entities/{entity_type}/{entity_id}`: Update an entity
- `DELETE /api/v1/sports/entities/{entity_type}/{entity_id}`: Delete an entity

### Batch Import
- `POST /api/v1/sports/batch/import`: Import multiple entities of the same type

### Field Mapping
- `GET /api/v1/sports/fields/{entity_type}`: Get available fields for an entity type
- `POST /api/v1/sports/validate/{entity_type}`: Validate entity data without saving

### Export
- `POST /api/v1/export/sheets`: Export data to Google Sheets
- `GET /api/v1/export/auth/url`: Get Google OAuth URL
- `GET /api/v1/export/auth/callback`: Handle Google OAuth callback

## Advanced Filtering

The `/api/v1/sports/entities/{entity_type}` endpoint supports advanced filtering:

**Query Parameters**:
- `filters`: JSON string of filter configurations
- `page`: Page number for pagination
- `limit`: Number of items per page
- `sort_by`: Field to sort by
- `sort_direction`: Sort direction ("asc" or "desc")

**Filter Format**:
```json
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
```

**Supported Operators**:
- String fields: "eq", "neq", "contains", "startswith", "endswith"
- Number fields: "eq", "neq", "gt", "lt"
- Date fields: "eq", "neq", "gt", "lt"
- Boolean fields: "eq", "neq"

## Data Flow Architecture

1. **Data Extraction**: Extract structured data from AI responses
2. **Data Storage**: Store structured data in the database
3. **Data Display**: Render structured data in a customizable grid
4. **Sports Data Mapping**: Map extracted data to sports entity fields

## SportDataMapper Component

A specialized tool for mapping structured data to sports database entities:

### Architecture

- **Main Components**: SportDataMapperContainer orchestrates functionality
- **UI Components**: Field items, selectors, navigation controls, mapping area
- **Custom Hooks**: Field mapping, record navigation, import process, UI state, data management

### Key Features

- **Automatic Entity Detection**: Recommends entity type based on field names
- **Drag-and-Drop Mapping**: Intuitive interface for mapping fields
- **Batch Import**: Efficiently imports multiple records
- **Record Navigation**: Navigate between records with exclusion capability
- **Progress Tracking**: Real-time updates during batch import

### Data Flow

1. Extract source fields and values from data
2. Recommend entity type based on field analysis
3. User maps source fields to entity fields
4. User navigates through records and excludes unwanted ones
5. Save mapped data to database (single record or batch)

## Frontend Integration

### Sports Database Module

Modular component architecture:

1. **Container Components**: Main container with context provider
2. **Context Provider**: Shared state and methods
3. **UI Components**: Entity selectors, lists, filters, and views

### Data Flow

1. User selects entity type
2. Context fetches entities of selected type
3. Entities displayed in list component
4. User can filter, export, and view entity details

## Next Steps

1. **Complete Google Sheets Integration**: Finalize testing and error handling
2. **Performance Optimization**: Implement pagination and query optimization
3. **Enhanced Batch Processing**: Add asynchronous processing for large imports
4. **Advanced Field Mapping**: Support custom transformations and templates
5. **Comprehensive Testing**: Create test suite for all endpoints

## Entity Reference Resolution System

The API implements a flexible entity reference system that balances user experience with data integrity:

### Components

1. **Validation Layer**
   - Located in `frontend/src/utils/sportDataMapper/validationUtils.ts`
   - Handles both UUID and name-based entity references
   - Converts between reference types as needed
   - Ensures data consistency before processing

2. **Mapping Layer**
   - Located in `frontend/src/utils/sportDataMapper/mappingUtils.ts`
   - Resolves entity references to UUIDs
   - Creates new entities when needed
   - Maintains referential integrity

3. **Database Layer**
   - Stores all references as UUIDs
   - Enforces referential integrity constraints
   - Maintains clean data structure

### Design Decisions

1. **Flexible Input**
   - Accept both UUIDs and names for entity references
   - Automatically handle conversion and entity creation
   - Reduce friction in data entry process

2. **Data Integrity**
   - All database references use UUIDs
   - Automatic entity creation with sensible defaults
   - Strong validation at all layers

3. **Error Handling**
   - Clear error messages for validation issues
   - Graceful handling of missing references
   - Detailed logging for debugging

## Chat System Architecture

### Chat Service Implementation

The chat service is implemented with the following key features:

```python
class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.anthropic_service = AnthropicService()  # Claude API integration
        self.model = "claude-3-sonnet-20240229"
```

```python
class AnthropicService:
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=config.API_KEY_ANTHROPIC
        )
        self.default_model = "claude-3-sonnet-20240229"
        self.logger = logging.getLogger("anthropic_service")
```

#### Key Components:

1. **Claude API Integration**
   - AnthropicService for API management
   - Model selection and configuration
   - Streaming response handling
   - Buffer management for efficient streaming
   - Structured error handling

2. **Message Streaming**
   - Real-time response streaming
   - Chunked message processing
   - Custom buffer management
   - Rate limit handling
   - Connection error recovery

3. **Structured Data Processing**
   - Enhanced schema validation
   - Modular extraction services
   - JSON parsing and validation
   - Database persistence with session fallbacks
   - Error recovery mechanisms

4. **Conversation Management**
   - Message history tracking
   - Conversation reordering
   - Context maintenance
   - User session management
   - Metadata handling
   - Order-based conversation sorting

### API Endpoints

#### Chat Routes
```python
@router.post("/conversations/{conversation_id}/messages")
async def create_message(
    conversation_id: UUID,
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
) -> StreamingResponse:
    return StreamingResponse(
        chat_service.get_chat_response(conversation_id, message.content),
        media_type="text/event-stream"
    )
```

### Error Handling

1. **API Errors**
   - Standardized error utilities
   - Retry mechanism with backoff
   - Timeout handling with configurable limits
   - Clear error messages with context
   - Session storage fallbacks
   - User-friendly error states

2. **Stream Processing**
   - Enhanced buffer management
   - Connection monitoring and recovery
   - State preservation with optimistic UI
   - Error recovery with fallback mechanisms
   - Graceful degradation of features

3. **Data Validation**
   - Schema verification with strict typing
   - Type checking with coercion rules
   - Required fields validation
   - Relationship validation with entity resolution
   - Comprehensive extraction validation

### Performance Considerations

1. **Streaming Optimization**
   - Chunked processing with variable buffer sizes
   - Memory-efficient buffer management
   - Connection pooling with health checks
   - Progressive rendering patterns
   - Background processing for extraction tasks

2. **API Performance**
   - Configurable retry strategies
   - Dynamic timeout management
   - Response caching where appropriate
   - Request batching and prioritization
   - Rate limit awareness and backoff strategies

3. **Database Operations**
   - Optimized async processing
   - Enhanced transaction management
   - Connection pooling with connection verification
   - Query optimization with PostgreSQL-specific features
   - Specialized JSONB handling for conversation data
   - Order-based query optimizations

## Database Query System

### Architecture

The database query system enables both direct SQL and natural language queries with a secure execution environment:

1. **Query Processing**
   - SQL validation and safety checks
   - Natural language to SQL conversion using Claude API
   - Schema-aware query generation
   - Export capability to CSV and Google Sheets
   - Query history and management

2. **API Endpoints**
```python
@router.post("/query", response_model=Dict[str, Any])
async def execute_database_query(
    query_data: Dict[str, Any],
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Execute database query (SQL or natural language)."""
    # Query execution with safety checks
    # Result formatting
    # Optional export processing
```

3. **Integration with Claude API**
```python
async def execute_natural_language_query(self, nl_query: str) -> List[Dict[str, Any]]:
    """Convert natural language to SQL and execute it."""
    # Get database schema for context
    # Generate SQL query using Claude
    # Execute with safety checks
    # Return formatted results
```

4. **Safety Considerations**
   - SQL injection prevention
   - Operation whitelisting (SELECT only)
   - Pattern-based security checks
   - User permission verification
   - Schema information protection
   - Result size limits