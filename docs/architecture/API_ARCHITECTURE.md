# API Architecture

## Overview

SheetGPT's API implements a modular domain-driven architecture with FastAPI and PostgreSQL:

```
src/
├── api/              # Endpoint definitions by domain
├── models/           # SQLAlchemy database models
├── schemas/          # Pydantic request/response schemas
├── services/         # Business logic layer with facade pattern
│   ├── sports/       # Sports domain services
│   ├── chat/         # Claude integration and messaging
│   └── export/       # Sheets and CSV generation
├── scripts/          # Database maintenance utilities
└── utils/            # Shared helper functions
```

### Key API Modules

- **Authentication**: JWT-based auth with refresh tokens and role-based access
- **Chat**: Claude-powered conversations with streaming responses
- **Sports Database**: Entity management with relationship handling
- **Data Management**: Structured data operations and transformation
- **Export**: Google Sheets and CSV export with templating, folder support, and column filtering
- **Database Query**: Natural language to SQL translation

### Request Flow

```
HTTP Request → FastAPI Router → Pydantic Validation → 
Service Layer (Facade) → Specialized Services → 
SQLAlchemy ORM → PostgreSQL → Response Formatting
```

## Core API Features

### Entity Management

- **Universal Brand Entity**: Central model for all company relationships
- **Secondary Brand Relationships**: Hierarchical brand associations for production services
- **Virtual Entity Support**: Special types (Championships, Playoffs, Tournaments) without dedicated tables
- **Entity Type Detection**: Pattern-based classification from entity names
- **Entity Name Resolution**: Automatic name-to-UUID mapping with cross-entity type search
- **Schema Validation**: Strict typing with relationship verification
- **Batch Operations**: Multi-entity creation and update

### Export System

- **Column Filtering**: Export only selected visible columns
- **Google Drive Integration**: Support for user-specified folders
- **Authentication Detection**: Automatic detection of Google Sheets authentication
- **CSV Fallback**: Automatic fallback to CSV when Google authentication fails
- **Folder Management**: Auto-creation of folders that don't exist
- **Async SQLAlchemy**: Proper async database operations for exports
- **Complete Entity Export**: Export all entities regardless of pagination

### Natural Language Queries

- **Claude AI Translation**: Convert questions to SQL with context awareness 
- **Schema-Aware Generation**: Foreign key relationship handling
- **Security Validation**: Restricted operations with injection prevention
- **Entity Name Enhancement**: Human-readable relationship display
- **Template Specialization**: Optimized queries for common patterns

### Streaming Response System

- **Server-Sent Events**: Real-time updates with chunked delivery
- **Sentence-Based Buffering**: Smooth progressive rendering
- **Retry Mechanisms**: Exponential backoff for rate limits
- **Phase Markers**: Client-side processing indicators
- **Error Recovery**: Graceful failure handling with session preservation

## Implementation Highlights

### Enhanced Google Sheets Export

```python
async def export_sports_entities(
    self, 
    db: AsyncSession, 
    entity_type: str, 
    entity_ids: List[UUID],
    include_relationships: bool,
    user_id: UUID,
    visible_columns: Optional[List[str]] = None,
    target_folder: Optional[str] = None
) -> Dict[str, Any]:
    """Export sports entities to Google Sheets with folder and column filtering support."""
    # Initialize Google Sheets service with authentication check
    is_initialized = await self.sheets_service.initialize_from_token(
        token_path=self.sheets_config.TOKEN_PATH
    )
    
    if not is_initialized:
        # Return CSV fallback response when not authenticated
        return {
            "csv_export": True,
            "message": "Google Sheets service is not initialized. Please authenticate first.",
            "entity_count": len(entity_ids)
        }
    
    # Get entities from database using async SQLAlchemy
    stmt = select(model).where(model.id.in_(entity_ids))
    result = await db.execute(stmt)
    entities = result.scalars().all()
    
    # Format data with visible columns filtering
    headers, rows = self._format_for_sheet(entity_dicts, visible_columns)
    
    # Create spreadsheet with optional folder
    spreadsheet_id, spreadsheet_url, folder_id, folder_url = await self.sheets_service.create_spreadsheet(
        title=f"{entity_type.capitalize()} Export", 
        user_id=user_id,
        folder_name=target_folder
    )
    
    # Return comprehensive response with folder information
    return {
        "spreadsheet_id": spreadsheet_id,
        "spreadsheet_url": spreadsheet_url,
        "entity_count": len(entities),
        "folder_id": folder_id,
        "folder_url": folder_url
    }
```

### Natural Language to SQL Translation

```python
async def translate_query(self, question: str) -> str:
    """Convert natural language to SQL with schema awareness."""
    # Get schema with relationships
    schema_context = await self._get_schema_with_foreign_keys()
    
    # Detect entities and customize prompt
    detected_entities = self._identify_entities(question)
    specialized_guidance = self._create_entity_specific_guidance(detected_entities)
    
    # Generate SQL using Claude
    prompt = f"""Convert this question to PostgreSQL SQL with proper joins:
                Schema: {schema_context}
                Question: {question}
                {specialized_guidance}"""
                
    sql = await self.ai_service.generate_sql(prompt, temperature=0.2)
    
    # Validate for security
    self._validate_sql_safety(sql)
    return sql
```

### Service Layer Architecture

The API uses a facade pattern to coordinate specialized services:

```python
# Facade service for unified API
class SportsService:
    def __init__(self):
        # Initialize on-demand to prevent circular imports
        self._team_service = None
        self._league_service = None
        
    @property
    def team_service(self):
        if not self._team_service:
            from .team_service import TeamService
            self._team_service = TeamService()
        return self._team_service

    async def get_entities(self, db, entity_type, filters=None):
        """Route to appropriate service based on entity type."""
        if entity_type == "team":
            return await self.team_service.get_teams(db, filters)
        elif entity_type == "league":
            return await self.league_service.get_leagues(db, filters)
        # Other entity types...
```

### Streaming Response Implementation

```python
async def get_streaming_response(self, conversation_id, message):
    """Process message and return streaming response."""
    try:
        # Record message
        await self._save_message(conversation_id, "user", message)
        
        # Get conversation history
        history = await self._get_conversation_history(conversation_id)
        
        # Stream response from Claude
        async for chunk in self.ai_service.get_streaming_response(history, message):
            yield self._format_sse_event(chunk)
            
        # Mark completion
        yield self._format_sse_event("[STREAM_END]")
            
    except Exception as e:
        yield self._format_sse_event(f"Error: {str(e)}")
        yield self._format_sse_event("[STREAM_END]")
```

## Key API Endpoints

### Authentication

```
POST /api/v1/auth/register - Create new user account
POST /api/v1/auth/login - Authenticate and get JWT tokens  
GET /api/v1/auth/me - Get current user profile
POST /api/v1/auth/refresh - Refresh access token
```

### Entity Management

```
GET /api/v1/sports/entities/{entity_type} - List entities with filtering
POST /api/v1/sports/entities/{entity_type} - Create new entity
GET /api/v1/sports/entities/{entity_type}/{id} - Get entity by ID
PUT /api/v1/sports/entities/{entity_type}/{id} - Update entity
DELETE /api/v1/sports/entities/{entity_type}/{id} - Delete entity

# Batch operations
POST /api/v1/sports/batch/import - Import multiple entities
GET /api/v1/sports/fields/{entity_type} - Get field definitions
```

### Chat System

```
GET /api/v1/chat/conversations - List user conversations
POST /api/v1/chat/conversations - Create new conversation
GET /api/v1/chat/conversations/{id} - Get single conversation
POST /api/v1/chat/conversations/{id}/messages - Send message (streaming)
PUT /api/v1/chat/conversations/order - Update conversation order
POST /api/v1/chat/conversations/{id}/upload - Upload file to conversation
```

### Database Management

```
POST /api/v1/db/query - Execute SQL or natural language query
POST /api/v1/db/query/translate - Translate question to SQL only
POST /api/v1/db/export - Export query results to CSV or Sheets
POST /api/v1/db/backup - Create database backup
GET /api/v1/db/stats - Get database statistics
```

### Export Functionality

```
POST /api/v1/sports/export - Export entities to Google Sheets
  Parameters:
    - entity_type: Type of entity to export
    - entity_ids: List of UUID strings to export
    - include_relationships: Whether to include related data
    - visible_columns: List of column names to include (omitted columns not exported)
    - target_folder: Optional Google Drive folder for export destination
  Response:
    - spreadsheet_id: Google Sheet identifier
    - spreadsheet_url: Direct URL to the created sheet
    - entity_count: Number of exported entities
    - folder_id: ID of the Google Drive folder (if provided)
    - folder_url: URL to the Google Drive folder (if provided)
```

## Schema System

The API uses Pydantic for request/response validation with inheritance patterns:

```python
# Base entity schema with common fields
class EntityBase(BaseModel):
    name: str
    
    class Config:
        orm_mode = True

# Entity creation schema
class EntityCreate(EntityBase):
    # Additional fields for creation
    pass

# Entity response schema
class EntityResponse(EntityBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    # Dynamically added related entity names during response processing
```

## Error Handling

The API implements standardized error responses:

```python
@app.exception_handler(EntityNotFoundError)
async def entity_not_found_handler(request: Request, exc: EntityNotFoundError):
    return JSONResponse(
        status_code=404,
        content={"detail": str(exc), "error_type": "entity_not_found"}
    )

@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "error_type": "validation_error"}
    )
```

## Transaction Management

```python
async def update_entity(self, db: AsyncSession, entity_id: UUID, data: dict) -> Entity:
    """Update entity with transaction management."""
    try:
        # Get existing entity
        entity = await self.get_by_id(db, entity_id)
        if not entity:
            raise EntityNotFoundError(f"Entity with ID {entity_id} not found")
            
        # Update attributes
        for key, value in data.items():
            setattr(entity, key, value)
            
        # Commit changes
        await db.commit()
        await db.refresh(entity)
        return entity
    except SQLAlchemyError as e:
        # Rollback on error
        await db.rollback()
        raise self._handle_db_error(e)
```

Updated: April 9, 2025