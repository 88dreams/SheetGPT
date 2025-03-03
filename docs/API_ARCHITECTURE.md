# API Architecture

## Overview

SheetGPT's API is built using FastAPI with a modular architecture:

1. **Routes**: API endpoints and HTTP request/response handling
2. **Services**: Business logic and database operations
3. **Models**: Database schema using SQLAlchemy ORM
4. **Schemas**: Request/response validation using Pydantic

## API Structure

The API is organized into modules:

- **Authentication**: User registration, login, and token management
- **Chat**: Conversation and message management
- **Data Management**: Structured data operations
- **Sports Database**: Sports entity management
- **Export**: Data export to Google Sheets
- **Admin**: Administrative functions

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

Business logic for managing sports entities:

```python
# Example League service methods
class SportsService:
    def __init__(self, db: Session):
        self.db = db
    
    async def get_leagues(self, skip: int = 0, limit: int = 100):
        return self.db.query(League).offset(skip).limit(limit).all()
    
    async def create_league(self, league_data: LeagueCreate):
        league = League(**league_data.dict())
        self.db.add(league)
        self.db.commit()
        self.db.refresh(league)
        return league
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