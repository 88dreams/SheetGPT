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
└── utils/            # Shared helper functions
```

### Key API Modules

- **Authentication**: JWT-based auth with refresh tokens and role-based access
- **Chat**: Claude-powered conversations with streaming responses
- **Sports Database**: Entity management with relationship handling
- **Data Management**: Structured data operations and transformation
- **Export**: Google Sheets and CSV export with templating, folder support, and column filtering
- **Database Query**: Natural language to SQL translation

### Implementation Quality
- **Fully Asynchronous**: The API is built on a fully asynchronous stack (`FastAPI`, `SQLAlchemy 2.0`, `asyncpg`), ensuring high performance and concurrency.
- **Statically Typed**: The entire backend codebase is type-hinted and validated with `pyright`, which improves code reliability and reduces runtime errors.
- **Modern Practices**: The implementation follows modern Python best practices, including the use of up-to-date API patterns for libraries like SQLAlchemy.

### Production Architecture

The API is deployed in a production environment with the following architecture:

```
Client (88gpts.com) → Netlify CDN → HTTPS Request → 
Digital Ocean App Platform (api.88gpts.com) → 
Application Container → PostgreSQL (SSL) → Response
```

#### Production Configuration

- **Digital Ocean App Platform**
  - Containerized deployment with horizontal scaling
  - Automatic HTTPS certificate management
  - PostgreSQL database with SSL connection
  - Custom environment variables for production settings
  - Health check endpoints with automated monitoring
  - CI/CD pipeline with GitHub integration
  - Resource scaling based on traffic patterns
  - Managed SSL certificate renewal
  - Database automatic backup schedule
  - Application logs with structured format

- **Cross-Domain Communication**
  - CORS with specific origin allowlist (88gpts.com)
  - Secure cookie configuration for cross-domain requests
  - Preflight response caching for OPTIONS requests
  - Authentication headers preserved across domains
  - WebSocket configuration for streaming connections
  - Production-specific error handling with sanitized responses
  - Rate limiting per client IP address
  - Request size limitations
  - Secure header configuration (CSP, HSTS, etc.)
  - Response compression for bandwidth optimization

### Request Flow

```
HTTP Request → FastAPI Router → Pydantic Validation → 
Service Layer (Facade) → Specialized Services → 
SQLAlchemy ORM → PostgreSQL → Response Formatting
```

## Core API Features

### Entity Management

- **Universal Brand Entity**: Central model for all company relationships
  - Integrated partner fields allow direct relationships to other entities
  - Smart partner resolution with cross-entity type search
  - Validation ensures partner is provided when relationship type is specified
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
- **Direct CSV Export**: Dedicated endpoint for CSV data with proper formatting
- **Client-Side File System Integration**: Support for browsers' File System Access API
- **Client-Side Fallbacks**: Graceful degradation for browsers without modern APIs

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
  Query Parameters (New/Updated for June 2025):
    - Standard pagination: `page`, `page_size` (or `limit`)
    - Sorting: `sort_by` (or `sort_field`), `sort_direction`
    - Filtering: `filters` (array of objects: `field`, `operator`, `value`).
      - Supports new multi-column search via a special filter: 
        `field`: "search_columns:colName1,colName2,...", `operator`: "contains", `value`: "searchTerm"

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
  Request Body (Updated for June 2025 - if applicable):
    - `message_text`: string
    - `llm_model_preference`: Optional[str] (e.g., "claude-3-opus", "gpt-4-turbo") - Identifier for the desired LLM.
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
GET /api/v1/db-management/schema-summary - Get a structured summary of the database schema for UI builders/helpers. Parses src/config/database_schema_for_ai.md.
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
    - file_name: Optional custom name for the export file
    - use_drive_picker: Whether to use the Google Drive Picker API (boolean)
  Response:
    - spreadsheet_id: Google Sheet identifier
    - spreadsheet_url: Direct URL to the created sheet
    - entity_count: Number of exported entities
    - folder_id: ID of the Google Drive folder (if provided)
    - folder_url: URL to the Google Drive folder (if provided)

POST /api/v1/export/csv - Export data to CSV format
  Parameters:
    - data_id: ID of the structured data to export
    - file_name: Optional custom name for the CSV file
  Response:
    - csvData: Raw CSV content as string for client-side save dialog
    - file_name: Suggested file name for the download

GET /api/v1/export/auth/token - Get OAuth token for Google Drive integration
  Response:
    - token: OAuth token for Google Drive API calls
    - expires_in: Token expiration time in seconds
```

### Contacts (New Section or Update Existing)

```
GET /api/v1/contacts/ - List contacts with filters and pagination.
  Response: PaginatedContactsResponse (contains list of ContactWithBrandsResponse)
  - ContactWithBrandsResponse includes nested Brand details via ContactBrandAssociationResponse.brand (uses BrandRead schema for nested brand).

POST /api/v1/contacts/ - Create a new contact.

GET /api/v1/contacts/{contact_id} - Get a specific contact.
  Response: Returns a detailed Contact structure including brand associations.
  *Note: Currently uses manual dictionary conversion for response; should ideally use a Pydantic response_model for consistency and auto-documentation.*

PUT /api/v1/contacts/{contact_id} - Update a contact.

DELETE /api/v1/contacts/{contact_id} - Delete a contact.

POST /api/v1/contacts/{contact_id}/brands/{brand_id} - Associate contact with a brand.

DELETE /api/v1/contacts/{contact_id}/brands/{brand_id} - Remove brand association.

POST /api/v1/contacts/import/linkedin - Import contacts from a LinkedIn CSV export file.
  - Expects 'multipart/form-data' with a 'file' field containing the CSV.
  - Query Parameters: auto_match_brands (bool, default True), match_threshold (float, default 0.6).
  - Performs matching against Brands and other entities (League, Team, Stadium, ProductionService), creating representative Brands as needed.
  Response: ContactImportStats

POST /api/v1/contacts/import/data - Import contacts from structured JSON data.
  - Same matching logic as CSV import.
  Response: ContactImportStats

POST /api/v1/contacts/rematch-brands - Re-scan contacts and sync associations.
  Request Body: { "match_threshold": float } (0.0 to 1.0)
  - Synchronizes associations based on the threshold (adds new, removes old).
  Response: { "success": bool, "stats": { ... } }

GET /api/v1/contacts/brands/{brand_id}/count - Get contact count for a specific brand.

POST /api/v1/contacts/import/record - Save a single contact record (New - stubbed for CSV "Save and Next")
  - Request Body: Contains data for a single contact, matching the structure expected by the backend for creating/updating one contact (similar to one item from `import/data` but for a single record).
  - Response: Success/failure, potentially the created/updated contact details.
  - *Note: This endpoint is proposed based on the "Save and Next" UI stub and needs backend implementation.*
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

### State Management Best Practices

The frontend implements structured state management patterns to prevent circular dependencies and update loops:

```typescript
// State management pattern with refs for tracking previous values
function useStateWithHistory<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const previousRef = useRef<T>(initialValue);
  
  const updateState = useCallback((newValue: T) => {
    // Only update if the value has actually changed
    if (JSON.stringify(newValue) !== JSON.stringify(state)) {
      previousRef.current = state;
      setState(newValue);
    }
  }, [state]);
  
  return [state, updateState, previousRef.current] as const;
}

// Breaking circular dependencies with explicit update orders
function useDependentStates() {
  const [primaryState, setPrimaryState] = useState<string>('');
  const [dependentState, setDependentState] = useState<string>('');
  
  // Handle updates that affect both states
  const updateBothStates = useCallback((newPrimary: string) => {
    // Important: Always update in the correct logical order
    setPrimaryState(newPrimary);
    // Use setTimeout to ensure state updates happen separately
    setTimeout(() => {
      setDependentState(generateDependentValue(newPrimary));
    }, 0);
  }, []);
  
  return {
    primaryState,
    dependentState,
    updateBothStates
  };
}

// Using refs to avoid excessive rerenders for values that don't affect the UI
function useOptimizedValues<T>(initialValue: T) {
  const valueRef = useRef<T>(initialValue);
  
  const setValue = useCallback((newValue: T) => {
    valueRef.current = newValue;
  }, []);
  
  return [valueRef, setValue] as const;
}
```

### Client-Side Component Architecture

The frontend follows a structured component organization pattern:

```typescript
// Modular component structure example (EntityList)
// Main component (index.tsx) - orchestration only
const EntityList: React.FC<EntityListProps> = ({ className = '' }) => {
  // Core dependencies from context
  const {
    selectedEntityType,
    entities,
    handleUpdateEntity,
    // ...other context values
  } = useSportsDatabase();

  // Specialized hooks for focused functionality
  const {
    visibleColumns,
    showColumnSelector,
    setShowColumnSelector,
    // ...other column management
  } = useColumnVisibility(selectedEntityType, entities);

  const {
    editingId,
    startEdit,
    saveEdit,
    // ...other editing functionality
  } = useInlineEdit({ selectedEntityType, handleUpdateEntity });

  // Production optimization settings - environment-specific behavior
  const isProduction = process.env.NODE_ENV === 'production';
  const searchMinChars = isProduction ? 3 : 1; // More restrictive in production
  const batchSize = isProduction ? 50 : 100; // Smaller batches in production
  
  // Environment-specific API configuration
  const apiConfig = {
    baseUrl: isProduction ? 'https://api.88gpts.com' : '/api',
    timeoutMs: isProduction ? 15000 : 30000, // Shorter timeouts in production
    retryCount: isProduction ? 2 : 1, // More retries in production
    cacheEnabled: isProduction, // Only cache in production
  };

  // Component rendering with clean separation
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <EntityListHeader 
        selectedEntityType={selectedEntityType}
        showColumnSelector={showColumnSelector}
        setShowColumnSelector={setShowColumnSelector}
        searchMinChars={searchMinChars}
        apiConfig={apiConfig}
        // ...other header props
      />
      
      {showColumnSelector && (
        <ColumnSelector
          entities={entities}
          visibleColumns={visibleColumns}
          // ...other column selector props
        />
      )}
      
      <EntityTable
        entities={entities}
        columnOrder={columnOrder}
        batchSize={batchSize}
        isProduction={isProduction}
        // ...other table props
        {...inlineEditHook} // Pass all editing functionality
      />
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        apiConfig={apiConfig}
        // ...other pagination props
      />
    </div>
  );
};
```

### Client-Side File System Access Integration

The File System Access API is implemented in reusable utility functions:

```typescript
// Modular utility implementation (csvExport.ts)
/**
 * Save data as CSV file using File System Access API with fallback
 */
export async function saveCsvFile(
  data: any[], 
  visibleColumns: string[], 
  suggestedName: string
): Promise<boolean> {
  // Generate CSV content
  const csvContent = generateCsvContent(data, visibleColumns);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName = `${suggestedName || 'export'}.csv`;
  
  // Use modern File System Access API when available
  if ('showSaveFilePicker' in window) {
    try {
      const options = {
        suggestedName: fileName,
        types: [{
          description: 'CSV Files',
          accept: { 'text/csv': ['.csv'] }
        }]
      };
      
      const fileHandle = await window.showSaveFilePicker(options);
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      return true; // Success
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // Fall back to legacy download method
        return fallbackDownload(blob, fileName);
      }
      return false; // User cancelled
    }
  }
  
  // Fallback for browsers without File System Access API
  return fallbackDownload(blob, fileName);
}

// Private helper function for legacy browsers
function fallbackDownload(blob: Blob, fileName: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true; // Success with fallback
  } catch (error) {
    console.error('Error with fallback download:', error);
    return false; // Failure
  }
}

// Production environment helper for export operations
function getExportConfigForEnvironment(): ExportConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // In production, use the dedicated export subdomain
    exportApiUrl: isProduction 
      ? 'https://api.88gpts.com/api/v1/export' 
      : '/api/v1/export',
      
    // Configure Google Drive integration differently for each environment
    googleDriveConfig: {
      apiKey: isProduction 
        ? process.env.REACT_APP_GOOGLE_API_KEY_PROD 
        : process.env.REACT_APP_GOOGLE_API_KEY_DEV,
        
      clientId: isProduction
        ? process.env.REACT_APP_GOOGLE_CLIENT_ID_PROD
        : process.env.REACT_APP_GOOGLE_CLIENT_ID_DEV,
        
      // More restrictive scopes in production
      scopes: isProduction
        ? ['https://www.googleapis.com/auth/drive.file']
        : ['https://www.googleapis.com/auth/drive'],
        
      // Approved redirect origins for OAuth flow
      redirectUri: isProduction
        ? 'https://88gpts.com/oauth/callback'
        : 'http://localhost:5173/oauth/callback'
    },
    
    // Timeouts and retries adjusted for production environment
    requestTimeoutMs: isProduction ? 20000 : 30000,
    maxRetries: isProduction ? 2 : 1,
    
    // Rate limiting settings for production
    maxRequestsPerMinute: isProduction ? 10 : 60,
    
    // Export format defaults
    defaultFormat: isProduction ? 'csv' : 'sheets',
    
    // Logging and error reporting configuration
    enableDetailedLogs: !isProduction
  };
}
```

### Pagination Component Architecture

Pagination components follow specific patterns to ensure proper state synchronization:

```typescript
// Enhanced pagination component with careful state order management
function Pagination({
  currentPage,
  setCurrentPage,
  totalPages,
  pageSize,
  setPageSize,
  totalItems
}: PaginationProps) {
  // Handle page size changes with careful state ordering
  function onPageSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // Get new size from dropdown
    const newPageSize = parseInt(e.target.value, 10);
    
    // First set page to 1, then change page size 
    // This order is critical to prevent query parameter conflicts
    setCurrentPage(1);
    setPageSize(newPageSize);
  }
  
  // Calculate range values with safeguards against edge cases
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);
  
  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing {from} to {to} of {totalItems} results
      </div>
      
      <select
        value={pageSize.toString()} // Use string value to prevent type issues
        onChange={onPageSizeChange}
        className="pagination-size-selector"
      >
        <option value="10">10 per page</option>
        <option value="25">25 per page</option>
        <option value="50">50 per page</option>
        <option value="100">100 per page</option>
      </select>
      
      <div className="pagination-controls">
        <button 
          onClick={() => setCurrentPage(1)}
          disabled={currentPage <= 1}
        >
          First
        </button>
        {/* Other pagination buttons... */}
      </div>
    </div>
  );
}
```

Updated: July 1, 2025