# API Architecture

## Overview

SheetGPT's API is built using FastAPI with a modular architecture:

1. **Routes**: API endpoints and HTTP request/response handling
2. **Services**: Business logic and database operations with facade pattern
3. **Models**: Database schema using SQLAlchemy ORM with relationship mapping
4. **Schemas**: Request/response validation using Pydantic
5. **Core**: Configuration and shared functionality
6. **Config**: Environment-specific settings

## API Structure

The API is organized into feature-focused modules:

- **Authentication**: User registration, login, and token management
- **Chat**: Conversation and message management with Claude API integration and streaming responses
- **Data Management**: Structured data operations with extraction services
- **Sports Database**: Sports entity management with comprehensive relationship handling
  - Support for standard entity types (League, Team, Player, etc.)
  - Special entity handling for Championship and Playoffs without dedicated tables
  - Virtual entity resolution with deterministic UUID generation
- **Export**: Data export to Google Sheets and CSV
- **Admin**: Administrative functions and monitoring capabilities
- **DB Management**: Database maintenance, natural language queries, and administration tools

## Database Management API

The Database Management API provides advanced database operations including natural language to SQL translation:

### Key Features

1. **Natural Language Query Translation**
   - Schema-aware SQL generation with foreign key relationship understanding
   - Entity detection for query customization with specialized templates
   - Foreign key relationship documentation in schema context
   - Safety validation with whitelisted operations

2. **Query Execution**
   - Secure execution with restricted operations
   - SQL injection prevention
   - Result normalization for consistent client display
   - Export options for query results (CSV and Google Sheets)

3. **Database Administration**
   - Backup and restore operations
   - Conversation archiving with JSON preservation
   - Database statistics collection
   - Entity relationship integrity verification

### Implementation

```python
# Natural language to SQL translation
async def translate_natural_language_to_sql(self, nl_query: str) -> str:
    """Convert a natural language query to SQL without executing it."""
    # Get the database schema with foreign key relationships
    schema_info = await self._get_schema_info()
    
    # Analyze the query to identify entities mentioned
    sports_entities = self._detect_entities(nl_query)
    
    # Add specialized guidance based on detected entities
    specialized_guidance = self._generate_entity_guidance(sports_entities)
    
    # Build a prompt for Claude to convert natural language to SQL
    prompt = f"""You are an expert SQL developer. Convert the following natural language query 
                 to PostgreSQL SQL that handles entity relationships correctly.
                 
                 Schema: {schema_info}
                 Query: {nl_query}{specialized_guidance}
                 
                 Rules: [safety instructions, relationship guidelines]"""
    
    # Get SQL from Claude with foreign key awareness
    sql_query = await self.anthropic_service.generate_code(prompt, temperature=0.2)
    return sql_query
```

### Special Template Handling

For common query patterns like NCAA sports broadcast rights, specialized templates are used:

```python
def _is_ncaa_broadcast_query(self, query: str) -> bool:
    """Check if the query appears to be about NCAA broadcast rights."""
    ncaa_terms = ['ncaa', 'college', 'collegiate']
    broadcast_terms = ['broadcast', 'rights', 'tv', 'television']
    sport_terms = ['basketball', 'football', 'baseball', 'hockey', 'sport']
    
    has_ncaa = any(term in query.lower() for term in ncaa_terms)
    has_broadcast = any(term in query.lower() for term in broadcast_terms)
    has_sport = any(term in query.lower() for term in sport_terms)
    
    return has_ncaa and has_broadcast

def _get_ncaa_broadcast_template(self, query: str) -> str:
    """Return an optimized template for NCAA broadcast rights queries."""
    # Extract sports from the query if mentioned
    sports_filter = ""
    common_sports = {
        'basketball': "parent_league.sport ILIKE '%Basketball%'",
        'football': "parent_league.sport ILIKE '%Football%'",
        'baseball': "parent_league.sport ILIKE '%Baseball%'",
        'hockey': "parent_league.sport ILIKE '%Hockey%'"
    }
    
    for sport, condition in common_sports.items():
        if sport in query.lower():
            sports_filter = f"AND {condition}"
            break
            
    # Comprehensive template with proper joins for both direct and indirect relationships
    template = f"""
    SELECT 
        br.id, br.entity_type,
        COALESCE(l.name, parent_league.name) AS league_name,
        CASE WHEN dc.id IS NOT NULL THEN dc.name ELSE 'League-wide' END AS entity_name,
        bc.name AS broadcaster, br.territory, br.start_date, br.end_date
    FROM broadcast_rights br
    LEFT JOIN leagues l ON br.entity_type = 'league' AND br.entity_id = l.id
    LEFT JOIN divisions_conferences dc ON br.division_conference_id = dc.id
    LEFT JOIN leagues parent_league ON dc.league_id = parent_league.id
    JOIN broadcast_companies bc ON br.broadcast_company_id = bc.id
    WHERE (
        (br.entity_type = 'league' AND l.name ILIKE '%NCAA%')
        OR
        (br.division_conference_id IS NOT NULL AND parent_league.name ILIKE '%NCAA%')
    )
    {sports_filter}
    AND br.deleted_at IS NULL
    AND COALESCE(l.deleted_at, parent_league.deleted_at) IS NULL
    """
    return template
```

### Enhanced Schema Information

The schema information includes foreign key relationships for better query generation:

```python
async def _get_schema_info(self) -> str:
    """Get comprehensive database schema information including foreign keys."""
    # Query PostgreSQL information schema to get table and column data
    schema_query = text("""
        SELECT 
            t.table_name, c.column_name, c.data_type,
            c.is_nullable,
            pg_catalog.obj_description(...) as table_description
        FROM information_schema.tables t
        JOIN information_schema.columns c 
            ON t.table_schema = c.table_schema 
            AND t.table_name = c.table_name
        WHERE t.table_schema = 'public'
              AND t.table_type = 'BASE TABLE'
    """)
    
    # Query to get foreign key relationships
    fk_query = text("""
        SELECT
            kcu.table_name, kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    """)
    
    # Add explicit relationship documentation
    schema_info = []
    schema_info.append("# Important Entity Relationships:")
    schema_info.append("1. broadcast_rights can be associated with leagues directly OR with divisions/conferences")
    schema_info.append("2. divisions_conferences belong to leagues via league_id")
    schema_info.append("3. When querying NCAA sports, check both direct leagues AND division relationships")
    
    # Add detailed table schemas with foreign keys
    # ... table schema processing with foreign key mappings ...
    
    return "\n".join(schema_info)
```

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

SQLAlchemy ORM models with PostgreSQL implement a rich domain model with comprehensive relationships:

```python
# League model with nickname field
class League(TimestampedBase):
    __tablename__ = "leagues"
    __table_args__ = (
        UniqueConstraint('name', name='uq_leagues_name'),
        Index('ix_leagues_name', 'name'),
    )

    id: Mapped[UUID] = mapped_column(SQLUUID, primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    nickname: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    sport: Mapped[str] = mapped_column(String(50), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    broadcast_start_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    broadcast_end_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)

    # Relationships
    divisions_conferences: Mapped[List["DivisionConference"]] = relationship(
        back_populates="league", cascade="all, delete-orphan"
    )
    teams: Mapped[List["Team"]] = relationship(back_populates="league")
    games: Mapped[List["Game"]] = relationship(back_populates="league", cascade="all, delete-orphan")
    executives: Mapped[List["LeagueExecutive"]] = relationship(
        back_populates="league", cascade="all, delete-orphan"
    )

# DivisionConference model - new addition
class DivisionConference(TimestampedBase):
    __tablename__ = "divisions_conferences"
    __table_args__ = (
        UniqueConstraint('league_id', 'name', name='uq_division_conference_name_per_league'),
        Index('ix_divisions_conferences_name', 'name'),
    )

    id: Mapped[UUID] = mapped_column(SQLUUID, primary_key=True, default=uuid4)
    league_id: Mapped[UUID] = mapped_column(ForeignKey("leagues.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    nickname: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    league: Mapped["League"] = relationship(back_populates="divisions_conferences")
    teams: Mapped[List["Team"]] = relationship(back_populates="division_conference", cascade="all, delete-orphan")
    broadcast_rights: Mapped[List["BroadcastRights"]] = relationship(
        back_populates="division_conference", cascade="all, delete-orphan"
    )
```

### Entity Services Architecture

Business logic is organized using a sophisticated service layer with domain-driven design and the facade pattern:

```python
# Generic base service with common functionality
class BaseEntityService(Generic[T]):
    """Base service class for entity operations."""
    
    def __init__(self, model_class: Type[T]):
        self.model_class = model_class
        
    async def get_by_id(self, db: AsyncSession, entity_id: UUID) -> Optional[T]:
        """Get entity by ID with common error handling."""
        query = select(self.model_class).where(self.model_class.id == entity_id)
        result = await db.execute(query)
        return result.scalars().first()
        
    async def create(self, db: AsyncSession, data: dict) -> T:
        """Create entity with validation and error handling."""
        try:
            entity = self.model_class(**data)
            db.add(entity)
            await db.commit()
            await db.refresh(entity)
            return entity
        except SQLAlchemyError as e:
            await db.rollback()
            # Error handling with human-readable messages
            raise self._handle_db_error(e)

# Entity-specific service with domain logic
class DivisionConferenceService(BaseEntityService[DivisionConference]):
    """Service for DivisionConference entity operations."""
    
    def __init__(self):
        super().__init__(DivisionConference)
    
    async def get_divisions_conferences(
        self, db: AsyncSession, filters: Optional[dict] = None, 
        skip: int = 0, limit: int = 100
    ) -> List[DivisionConference]:
        """Get divisions/conferences with filtering and pagination."""
        query = select(DivisionConference)
        
        # Apply filters
        if filters:
            if league_id := filters.get("league_id"):
                query = query.where(DivisionConference.league_id == league_id)
            if type_filter := filters.get("type"):
                query = query.where(DivisionConference.type == type_filter)
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    
    async def update_nickname(self, db: AsyncSession, entity_id: UUID, nickname: Optional[str]) -> DivisionConference:
        """Update nickname with specialized logic."""
        entity = await self.get_by_id(db, entity_id)
        if not entity:
            raise EntityNotFoundError(f"Division/Conference with ID {entity_id} not found")
        
        entity.nickname = nickname
        await db.commit()
        await db.refresh(entity)
        return entity

# Facade service that provides a unified API
class SportsService:
    """Facade service that coordinates all sports entity operations."""
    
    def __init__(self):
        """Initialize with frequently used services."""
        self.league_service = LeagueService()
        self.team_service = TeamService()
        self.division_conference_service = DivisionConferenceService()
        # Other services initialized on-demand to prevent circular imports
    
    async def get_entities(
        self, db: AsyncSession, entity_type: str, 
        filters: Optional[dict] = None, skip: int = 0, limit: int = 100
    ) -> List[Any]:
        """Generic method to get entities of any type with filtering."""
        # Map entity type to appropriate service method
        if entity_type == "league":
            return await self.league_service.get_leagues(db, filters, skip, limit)
        elif entity_type == "division_conference":
            return await self.division_conference_service.get_divisions_conferences(db, filters, skip, limit)
        elif entity_type == "team":
            return await self.team_service.get_teams(db, filters, skip, limit)
        # ... other entity types
        
        raise ValueError(f"Unsupported entity type: {entity_type}")
        
    async def update_entity_nickname(self, db: AsyncSession, entity_type: str, entity_id: UUID, nickname: Optional[str]) -> Any:
        """Update nickname for any entity type that supports it."""
        if entity_type == "league":
            return await self.league_service.update_nickname(db, entity_id, nickname)
        elif entity_type == "division_conference":
            return await self.division_conference_service.update_nickname(db, entity_id, nickname)
            
        raise ValueError(f"Nickname not supported for entity type: {entity_type}")
```

## Entity Relationship Handling

### Entity Name Resolution

The system implements a sophisticated entity name resolution system:

```python
class EntityNameResolver:
    """Resolves entity references and adds human-readable names to database entities."""
    
    async def resolve_entity_names(self, db: AsyncSession, entity_type: str, entities: List[Dict]) -> List[Dict]:
        """Add human-readable names to entities based on relationship IDs."""
        if not entities:
            return []
            
        # Process each entity to add related names
        result = []
        for entity in entities:
            # Copy to avoid modifying original
            entity_copy = dict(entity)
            
            # Add related names based on entity type
            if entity_type == "team":
                await self._add_team_related_names(db, entity_copy)
            elif entity_type == "broadcast_rights":
                await self._add_broadcast_rights_related_names(db, entity_copy)
            elif entity_type == "division_conference":
                await self._add_division_conference_related_names(db, entity_copy)
            # ... other entity types
            
            result.append(entity_copy)
            
        return result
        
    async def _add_broadcast_rights_related_names(self, db: AsyncSession, entity: Dict) -> None:
        """Add related names for broadcast rights, including division/conference if present."""
        # Add broadcast company name
        if company_id := entity.get("broadcast_company_id"):
            company = await self._get_entity_by_id(db, BroadcastCompany, company_id)
            if company:
                entity["broadcast_company_name"] = company.name
                
        # Add division/conference name if present (optional relationship)
        if div_conf_id := entity.get("division_conference_id"):
            div_conf = await self._get_entity_by_id(db, DivisionConference, div_conf_id)
            if div_conf:
                entity["division_conference_name"] = div_conf.name
                
        # Generate descriptive display name based on entity type
        entity_type = entity.get("entity_type")
        entity_id = entity.get("entity_id")
        if entity_type and entity_id:
            display_name = await self._generate_entity_display_name(db, entity_type, entity_id)
            entity["entity_display_name"] = display_name
```

### Entity Relationship Flow

1. User maps fields in the SportDataMapper interface
2. During batch import, the system:
   - Maps basic fields directly
   - Identifies relationship fields (e.g., league_id, division_conference_id)
   - Resolves relationships by UUID or name lookup with intelligent entity type detection
   - Creates missing entities when appropriate with default values
   - Handles special naming patterns for broadcast rights
   - Validates data with proper constraint checking and user-friendly error messages
   - Processes imports in batches with progress tracking
   - Provides detailed success/failure reporting
   
### Service Layer Architecture

1. **Specialized Entity Services**:
   - Each entity type has a dedicated service class (TeamService, LeagueService, etc.)
   - Services implement CRUD operations with domain-specific logic
   - Services handle validation rules specific to the entity type
   - Each service follows a consistent interface pattern

2. **Facade Pattern Implementation**:
   - SportsService facade provides a unified API for client code
   - Delegates operations to specialized service classes
   - Handles initialization of services on-demand to prevent circular imports
   - Ensures complete API coverage for all entity operations:
     - Each entity operation in routes must have a corresponding facade method
     - Facade methods delegate to specialized services
     - Direct service access is avoided outside the facade
     - Services are instantiated when needed rather than all at initialization
   - Special Cases:
     - For missing facade methods (like create_production_service), routes can directly use the specialized service
     - This approach allows for immediate fixes without requiring complex code changes

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
   - Entity-specific field components with standardized rendering
   - Optimized rendering with strategic memoization:
     - TeamFields, StadiumFields, LeagueFields, etc.
     - Reusable FormField component for consistent UI
     - Entity relationship components with context-aware rendering
   - Hook-based architecture with focused responsibilities:
     - useEntityData for data fetching
     - useEntitySelection for selection management
     - useFiltering for filter operations
     - useSorting for sorting functionality
     - useEntityPagination for pagination controls
     - useEntitySchema for field information
     - useEntityRelationships for related entity data
   - Utility modules for common functions:
     - Data processing utilities
     - Notification management
     - Error handling
     - Entity processing
     - Batch handling

2. **Context Refactoring with Hook Architecture**:
   - Main contexts split into focused custom hooks
   - Clean separation between UI rendering and data logic 
   - Explicit memoization pattern to prevent unnecessary re-renders
   - Performance-optimized hooks for common operations:
     - useSorting: Type-aware sorting with comprehensive data handling
     - useSelection: Efficient selection state management
     - useDragAndDrop: Optimized DOM operations with fingerprinting
     - useDataTransformer: Memoized data transformation
     - useFieldManagement: Field selection, categorization, and values
     - useRelationships: Relationship data loading with lifecycle awareness
     - useFieldDetection: Field pattern detection and recommendations
     - useBulkUpdate: Batch processing with progress tracking
     - useModalLifecycle: Component lifecycle management for safe state updates
   - State and action separation for better maintainability
   - Proper dependency tracking in useEffect hooks
   - Explicit lifecycle management to prevent infinite render loops
   - Reference stability with useCallback and useMemo
   - Comprehensive typings for all functions and state
   - Data fetching logic isolated from component state management
   - Safety checks to prevent state updates after component unmounting

3. **SportDataMapper Architecture**:
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

### Refactored and Simplified BulkEditModal Architecture

The BulkEditModal has been completely refactored to follow best practices and avoid render loop issues:

1. **Original Component Directory Structure**:
   ```
   BulkEditModal/
   ├── components/         # Sub-components
   │   ├── FieldInput.tsx      # Input controls for different field types
   │   ├── FieldSelector.tsx   # Field selection and display
   │   ├── ProcessingStatus.tsx # Processing and results UI
   │   └── index.ts           # Component exports
   ├── hooks/               # Focused custom hooks
   │   ├── useFieldManagement.ts # Field state and categorization
   │   ├── useRelationships.ts   # Relationship data loading
   │   ├── useFieldDetection.ts  # Field detection from data
   │   ├── useBulkUpdate.ts      # Update processing
   │   ├── useModalLifecycle.ts  # Component lifecycle management
   │   └── index.ts             # Hook exports
   ├── utils/               # Helper functions
   │   ├── modalUtils.ts        # Utility functions
   │   └── index.ts             # Utility exports
   ├── types.ts             # Type definitions
   └── index.tsx            # Main component with minimal logic
   ```

2. **Simplified Component Implementation**:
   After discovering React Hooks rule violations in the complex implementation, a simplified direct implementation was created:
   ```typescript
   const BulkEditModal: React.FC<BulkEditModalProps> = ({
     visible,
     onCancel,
     entityType,
     selectedIds = [],
     queryResults = [],
     selectedIndexes = new Set<number>(),
     onSuccess,
   }) => {
     // Directly implemented hooks
     const [form] = Form.useForm();
     const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
     const [isProcessing, setIsProcessing] = useState(false);
     const [isComplete, setIsComplete] = useState(false);
     
     // Field grouping and detection
     const fields = useMemo(() => {
       // Direct field detection from data
     }, [queryResults, selectedIndexes]);
     
     // Clean lifecycle handling
     useEffect(() => {
       if (!visible) {
         // Reset state when modal closes
         form.resetFields();
         setSelectedFields(new Set());
         setIsProcessing(false);
         setIsComplete(false);
       }
     }, [visible, form]);
     
     // ... Other simplified implementations
   };
   ```

This simplified approach maintains the same functionality while avoiding the lifecycle and hook rule issues of the more complex implementation.

2. **Key Hook Implementations**:
   - `useFieldManagement`: Manages field selection, values, and categorization
   - `useRelationships`: Handles loading related entities with lifecycle awareness
   - `useFieldDetection`: Detects fields from query results with entity type inference
   - `useBulkUpdate`: Processes updates with batch handling and progress tracking
   - `useModalLifecycle`: Manages component lifecycle for safe state updates

3. **Lifecycle Management**:
   - Uses `useRef` to track component mounting state
   - Prevents state updates after unmounting with safety checks
   - Implements controlled initialization sequence
   - Adds timeouts to break potential render cycles
   - Ensures clean dependency tracking in all effects

4. **Entity Type Detection**:
   - Automatically identifies likely team entities based on field patterns
   - Ensures division_conference_id is available for teams
   - Recommends appropriate fields for different entity types
   - Handles field categorization for logical organization

5. **Field Categorization**:
   - Organizes fields into logical groups:
     - Basic Information (name, nickname, description)
     - Relationships (fields ending with _id)
     - Dates & Numbers (date/time/number fields)
     - Other (remaining fields)
   - Provides consistent UI across all entity types
   - Renders appropriate inputs based on field type

6. **Update Processing**:
   - Implements batch processing with configurable batch size
   - Shows real-time progress with percentage indicator
   - Provides detailed success/failure statistics
   - Implements proper error handling for both entity and query modes

## React Dependency Management

The frontend architecture includes specific patterns to prevent dependency cycles:

1. **Circular Dependency Prevention**
   ```typescript
   // Use a stable reference with useMemo to prevent dependency cycles
   const dragDropItems = useMemo(() => ({
     items: columnOrder
   }), [JSON.stringify(columnOrder)]); // Only re-create when columnOrder changes meaningfully
   
   // Use this stable reference in the hook
   const { reorderedItems, handleDrop } = useDragAndDrop<string>(dragDropItems);
   
   // Update with conditional state updates to break cycles
   useEffect(() => {
     if (reorderedItems.length > 0) {
       // Only update if the order is actually different
       const currentOrder = JSON.stringify(columnOrder);
       const newOrder = JSON.stringify(reorderedItems);
       
       if (currentOrder !== newOrder) {
         setColumnOrder(reorderedItems);
       }
     }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [reorderedItems]); // Intentionally exclude columnOrder
   ```

2. **Conditional State Updates**
   ```typescript
   // When initializing column visibility, only update if needed
   useEffect(() => {
     if (queryResults.length > 0) {
       const columns = Object.keys(queryResults[0]);
       const visibleColsObj = {};
       
       columns.forEach(col => {
         visibleColsObj[col] = visibleColumns[col] !== undefined 
           ? visibleColumns[col] 
           : true;
       });
       
       // Only update if visibility has actually changed
       const hasChanged = columns.some(col => visibleColumns[col] === undefined);
       if (hasChanged) {
         setVisibleColumns(visibleColsObj);
       }
     }
   }, [queryResults, visibleColumns]);
   ```

These patterns ensure components remain stable and prevent the infinite render loops that can occur with complex state management and drag-and-drop functionality.

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
   - Production Services (depends on production companies/brands) - Note: Unlike most entities, Production Services don't have a name field
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

### Component Organization

1. **Feature-Based Organization**:
   - Components organized into feature directories:
     ```
     features/FeatureName/
     ├── index.tsx                # Main container component
     ├── README.md                # Feature documentation
     ├── components/              # UI components
     │   ├── ComponentA.tsx
     │   ├── ComponentB.tsx
     │   └── index.ts             # Component exports
     ├── hooks/                   # Custom hooks
     │   ├── useFeatureData.ts
     │   ├── useFeatureState.ts
     │   └── index.ts             # Hook exports
     └── types.ts                 # Feature-specific types
     ```
   - Example implementations:
     - `features/DataManagement/` - Structured data management with optimized hooks
     - `features/EntityManagement/` (planned) - Entity management with relationship handling

2. **Component Design**:
   - UI components separated from data handling logic
   - Custom hooks for business logic and API interaction
   - Entity-specific field components with standardized rendering
   - Optimized rendering with strategic memoization
   - Consolidated modal components with unified interfaces and advanced directory structure:
     ```
     BulkEditModal/
     ├── components/         # Sub-components
     │   ├── FieldInput.tsx      # Input controls for different field types
     │   ├── FieldSelector.tsx   # Field selection and display
     │   ├── ProcessingStatus.tsx # Processing and results UI
     │   └── index.ts           # Component exports
     ├── hooks/               # Focused custom hooks
     │   ├── useFieldManagement.ts # Field state and categorization
     │   ├── useRelationships.ts   # Relationship data loading
     │   ├── useFieldDetection.ts  # Field detection from data
     │   ├── useBulkUpdate.ts      # Update processing
     │   ├── useModalLifecycle.ts  # Component lifecycle management
     │   └── index.ts             # Hook exports
     ├── utils/               # Helper functions
     │   ├── modalUtils.ts        # Utility functions
     │   └── index.ts             # Utility exports
     ├── types.ts             # Type definitions
     └── index.tsx            # Main component with minimal logic
     ```
     - Type-safe implementations with proper interfaces
     - Consistent UI patterns across different use cases
     - Clean separation of concerns with single-responsibility principles

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

The chat service features sophisticated streaming response handling and Claude API integration:

```python
class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.anthropic_service = AnthropicService()  # Claude API integration
        self.model = "claude-3-sonnet-20240229"
        self.logger = logging.getLogger("chat_service")
        
    async def get_chat_response(self, conversation_id: UUID, message_content: str) -> AsyncGenerator[str, None]:
        """Process chat message and stream response with proper event formatting."""
        try:
            # Record user message
            user_message = await self._save_message(conversation_id, "user", message_content)
            
            # Get conversation history for context
            history = await self._get_conversation_history(conversation_id)
            
            # Special handling for search operations
            if message_content.strip().startswith("[SEARCH]"):
                # Process search request (detects keyword queries)
                async for chunk in self._handle_search_request(message_content, history):
                    yield self._format_sse_message(chunk)
                return
                
            # Stream response from Claude API
            async for chunk in self.anthropic_service.get_streaming_response(history, message_content):
                # Process each chunk
                yield self._format_sse_message(chunk)
                
            # Ensure completion marker is sent
            yield self._format_sse_message("[STREAM_END]")
            
            # Record complete assistant response
            await self._process_complete_response(conversation_id)
            
        except Exception as e:
            self.logger.error(f"Chat response error: {str(e)}")
            yield self._format_sse_message(f"Error: {str(e)}")
            yield self._format_sse_message("[STREAM_END]")
        
    def _format_sse_message(self, data: str) -> str:
        """Format string as Server-Sent Events message."""
        return f"data: {data}\n\n"
```

```python
class AnthropicService:
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=config.API_KEY_ANTHROPIC
        )
        self.default_model = "claude-3-sonnet-20240229"
        self.logger = logging.getLogger("anthropic_service")
        self.max_retries = 3
        
    async def get_streaming_response(
        self, 
        history: List[Dict[str, str]], 
        message: str
    ) -> AsyncGenerator[str, None]:
        """Get streaming response from Claude API with retry logic."""
        retry_count = 0
        buffer = ""
        
        while retry_count <= self.max_retries:
            try:
                # Format history into messages array
                messages = self._format_messages(history, message)
                
                # Create streaming completion
                with self.client.messages.stream(
                    model=self.default_model,
                    max_tokens=4000,
                    messages=messages,
                    temperature=0.7,
                ) as stream:
                    for chunk in stream:
                        if chunk.type == "content_block_delta" and chunk.delta.text:
                            # Process content chunk
                            buffer += chunk.delta.text
                            
                            # Yield complete sentences when available
                            while "." in buffer or "\n" in buffer:
                                idx = max(buffer.find("."), buffer.find("\n"))
                                if idx == -1:
                                    break
                                    
                                # Yield complete sentence or line
                                yield buffer[:idx+1]
                                buffer = buffer[idx+1:]
                            
                    # Yield any remaining content
                    if buffer:
                        yield buffer
                        
                # Successful completion
                return
                
            except anthropic.APIError as e:
                # Handle rate limits with exponential backoff
                if e.status_code == 429 and retry_count < self.max_retries:
                    retry_count += 1
                    wait_time = (2 ** retry_count) * 0.5  # Exponential backoff
                    self.logger.warning(f"Rate limited. Retrying in {wait_time}s. Attempt {retry_count}/{self.max_retries}")
                    await asyncio.sleep(wait_time)
                else:
                    # Non-recoverable error
                    self.logger.error(f"Claude API error: {str(e)}")
                    yield f"Error communicating with Claude: {str(e)}"
                    return
            except Exception as e:
                self.logger.error(f"Unexpected error: {str(e)}")
                yield f"Unexpected error: {str(e)}"
                return
```

### Key Chat System Features

1. **Streaming Response Architecture**
   - Server-Sent Events (SSE) format for real-time updates
   - Proper event formatting with data prefixes
   - Chunk processing for sentence-based streaming
   - Special handling for search operations
   - Graceful error handling with informative messages
   - Stream completion markers for client notification
   - Buffer management for optimal chunk delivery

2. **File Upload and Processing**
   - Support for CSV and text file uploads
   - Automatic data structure detection
   - CSV parsing with intelligent column mapping
   - Data extraction for structured information
   - Fallback to manual data organization

3. **Conversation Management**
   - Order-based conversation organization
   - Support for manual reordering through API
   - Conversation archiving capabilities
   - Message history context management
   - Efficient PostgreSQL JSONB storage for messages

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
    """Send a message and get streaming response."""
    # Verify user owns the conversation
    if not await chat_service.user_owns_conversation(conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
        
    return StreamingResponse(
        chat_service.get_chat_response(conversation_id, message.content),
        media_type="text/event-stream"
    )

@router.put("/conversations/order")
async def update_conversation_order(
    order_data: ConversationOrderUpdate,
    current_user: User = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
) -> List[ConversationResponse]:
    """Update the order of user conversations."""
    return await chat_service.update_conversation_order(
        current_user.id, 
        order_data.conversation_ids
    )
    
@router.post("/conversations/{conversation_id}/upload")
async def upload_file(
    conversation_id: UUID,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
) -> Dict[str, Any]:
    """Upload a file to a conversation for processing."""
    # Verify user owns the conversation
    if not await chat_service.user_owns_conversation(conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
    
    # Process uploaded file
    result = await chat_service.process_uploaded_file(conversation_id, file)
    return {"success": True, "file_data": result}
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

The database query system enables both direct SQL and natural language queries with a secure execution environment and entity name resolution:

1. **Natural Language Query Processing**
   ```python
   class DatabaseQueryService:
       async def process_natural_language_query(
           self, 
           nl_query: str, 
           translate_only: bool = False
       ) -> Dict[str, Any]:
           """Convert natural language to SQL using Claude API."""
           try:
               # Prepare schema context for Claude
               schema_context = await self._get_database_schema_context()
               
               # Generate SQL query using Claude
               prompt = self._create_nl_to_sql_prompt(nl_query, schema_context)
               sql_query = await self.anthropic_service.generate_sql(prompt)
               
               result = {
                   "original_query": nl_query,
                   "generated_sql": sql_query,
                   "results": None
               }
               
               # Execute query if requested
               if not translate_only:
                   # Validate and execute the query with safety checks
                   query_results = await self._execute_sql_query(sql_query)
                   result["results"] = await self.entity_resolver.resolve_query_results(query_results)
               
               return result
               
           except Exception as e:
               self.logger.error(f"Natural language query error: {str(e)}")
               raise DBQueryError(f"Error processing natural language query: {str(e)}")
   ```

2. **Entity Name Resolution for Query Results**
   ```python
   class EntityNameResolver:
       async def resolve_query_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
           """Add human-readable names to database query results."""
           if not results:
               return []
               
           # Process each result row
           enhanced_results = []
           for row in results:
               enhanced_row = dict(row)
               await self._process_query_result_row(enhanced_row)
               enhanced_results.append(enhanced_row)
               
           return enhanced_results
           
       async def _process_query_result_row(self, row: Dict[str, Any]) -> None:
           """Process a single query result row to add human-readable names."""
           # Detect entity ID columns (uuid-looking fields with _id suffix)
           for key, value in list(row.items()):
               if key.endswith('_id') and isinstance(value, UUID):
                   # Extract entity type from column name
                   entity_type = key[:-3]  # Remove '_id' suffix
                   
                   # Handle special cases
                   if entity_type == "league":
                       await self._add_league_name(row, value)
                   elif entity_type == "division_conference":
                       await self._add_division_conference_name(row, value)
                   elif entity_type == "team":
                       await self._add_team_name(row, value)
                   # ... other entity types
   ```

3. **API Endpoints**
   ```python
   @router.post("/query", response_model=Dict[str, Any])
   async def execute_database_query(
       query_data: DatabaseQueryRequest,
       current_user: User = Depends(get_current_admin_user),
       db: AsyncSession = Depends(get_db)
   ) -> Dict[str, Any]:
       """Execute database query (SQL or natural language) with entity name resolution."""
       db_query_service = DatabaseQueryService(db)
       
       if query_data.query_type == "sql":
           # Direct SQL execution with safety checks
           sql_results = await db_query_service.execute_sql_query(query_data.query)
           
           # Enhance results with entity name resolution
           results = await db_query_service.entity_resolver.resolve_query_results(sql_results)
           
           return {
               "query": query_data.query,
               "results": results
           }
       elif query_data.query_type == "natural_language":
           # Process natural language query
           nl_result = await db_query_service.process_natural_language_query(
               query_data.query, 
               translate_only=query_data.translate_only
           )
           return nl_result
       else:
           raise HTTPException(
               status_code=400, 
               detail=f"Unsupported query type: {query_data.query_type}"
           )
   
   @router.post("/query/save", response_model=SavedQueryResponse)
   async def save_query(
       query_data: SaveQueryRequest,
       current_user: User = Depends(get_current_user),
       db: AsyncSession = Depends(get_db)
   ) -> SavedQueryResponse:
       """Save a query for future use."""
       db_query_service = DatabaseQueryService(db)
       saved_query = await db_query_service.save_query(
           user_id=current_user.id,
           name=query_data.name,
           query_type=query_data.query_type,
           query=query_data.query,
           description=query_data.description
       )
       return SavedQueryResponse.from_orm(saved_query)
   
   @router.post("/query/export", response_model=Dict[str, Any])
   async def export_query_results(
       export_data: ExportQueryRequest,
       current_user: User = Depends(get_current_user),
       db: AsyncSession = Depends(get_db)
   ) -> Dict[str, Any]:
       """Export query results to CSV or Google Sheets."""
       db_query_service = DatabaseQueryService(db)
       export_service = ExportService(db)
       
       # Execute query to get results
       results = await db_query_service.execute_query(
           query_type=export_data.query_type,
           query=export_data.query
       )
       
       # Export based on requested format
       if export_data.export_format == "csv":
           csv_data = export_service.generate_csv(results)
           return {"format": "csv", "data": csv_data}
       elif export_data.export_format == "sheets":
           sheet_url = await export_service.export_to_sheets(
               current_user.id,
               export_data.sheet_name or "Query Results",
               results
           )
           return {"format": "sheets", "url": sheet_url}
       else:
           raise HTTPException(
               status_code=400, 
               detail=f"Unsupported export format: {export_data.export_format}"
           )
   ```

4. **Claude API Integration for SQL Generation**
   ```python
   class AnthropicService:
       async def generate_sql(self, prompt: str) -> str:
           """Generate SQL from natural language using Claude."""
           try:
               response = await self.client.messages.create(
                   model=self.default_model,
                   max_tokens=1000,
                   messages=[
                       {"role": "user", "content": prompt}
                   ],
                   temperature=0.2  # Lower temperature for more deterministic SQL generation
               )
               
               # Extract SQL from response
               sql = self._extract_sql_from_response(response.content[0].text)
               return sql
               
           except Exception as e:
               self.logger.error(f"SQL generation error: {str(e)}")
               raise SQLGenerationError(f"Failed to generate SQL: {str(e)}")
       
       def _extract_sql_from_response(self, response_text: str) -> str:
           """Extract SQL query from Claude's response."""
           # Look for SQL between triple backticks
           sql_pattern = r"```sql\s*(.*?)\s*```"
           match = re.search(sql_pattern, response_text, re.DOTALL)
           
           if match:
               return match.group(1).strip()
           
           # Fallback to any text between triple backticks
           code_pattern = r"```\s*(.*?)\s*```"
           match = re.search(code_pattern, response_text, re.DOTALL)
           
           if match:
               return match.group(1).strip()
               
           # Last resort - try to find anything that looks like SQL
           if "SELECT" in response_text.upper():
               # Extract from SELECT to end or next paragraph
               select_idx = response_text.upper().find("SELECT")
               end_idx = len(response_text)
               
               # Look for end markers
               for marker in ["\n\n", "\r\n\r\n"]:
                   marker_idx = response_text.find(marker, select_idx)
                   if marker_idx > 0:
                       end_idx = min(end_idx, marker_idx)
                       
               return response_text[select_idx:end_idx].strip()
               
           # No SQL found
           raise SQLGenerationError("Could not extract SQL from Claude's response")
   ```

5. **Safety Implementation**
   ```python
   class DatabaseQueryService:
       def _validate_sql_query(self, sql: str) -> None:
           """Validate SQL query for safety."""
           # Check if query is SELECT only
           sql_upper = sql.upper()
           if not sql_upper.strip().startswith("SELECT"):
               raise SQLValidationError("Only SELECT queries are allowed")
               
           # Check for unauthorized operations
           for forbidden in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "GRANT"]:
               if forbidden in sql_upper:
                   raise SQLValidationError(f"Forbidden operation detected: {forbidden}")
                   
           # Check for multiple statements
           if ";" in sql[:-1]:  # Allow semicolon at the end
               raise SQLValidationError("Multiple SQL statements are not allowed")
               
           # Check for SQL injection patterns
           suspicious_patterns = ["--", "/*", "*/", "UNION ALL", "UNION SELECT", "INTO OUTFILE"]
           for pattern in suspicious_patterns:
               if pattern in sql_upper:
                   raise SQLValidationError(f"Suspicious pattern detected: {pattern}")
   ```

6. **Entity Type Handling with Enhanced Features**
   - Support for division_conference entities in query results
   - Proper handling of broadcast rights with division/conference relationships
   - Comprehensive entity name resolution for query outputs
   - Intelligent column ordering based on relationship fields
   - Toggle between UUID and human-readable name display
   - Support for nickname fields in relevant entities