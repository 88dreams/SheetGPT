# Technical Description

This document provides a technical description of the SheetGPT project architecture and implementation.

## System Architecture

### Backend (FastAPI + PostgreSQL)

#### Core Components
```
src/
├── api/                  # Domain-specific endpoints
│   └── routes/           # Feature-focused route modules
├── models/               # SQLAlchemy models
├── schemas/              # Pydantic schemas
├── services/             # Business logic
│   ├── sports/           # Sports domain services
│   │   ├── base_service.py           # Generic service functionality
│   │   ├── league_service.py         # League-specific operations
│   │   ├── division_conference_service.py # Division/Conference operations
│   │   ├── entity_name_resolver.py   # Entity reference resolution
│   │   ├── facade.py                 # Unified API facade
│   │   ├── validators.py             # Domain validation rules
│   │   └── utils.py                  # Shared utilities
│   └── chat/             # Chat and AI services
├── scripts/              # Maintenance and migration scripts
└── utils/                # Shared utilities
```

#### Key Features
1. **Authentication**
   - JWT-based system
   - Role-based access control
   - Secure token management
   - Admin privilege verification
   - Token refresh mechanism

2. **Database Management**
   - SQLAlchemy ORM with UUID primary keys and comprehensive relationships
   - Isolated transaction handling with proper error recovery
   - Natural language to SQL translation using Claude API
   - Schema-aware query generation with relationship understanding
   - Template-based query handling for common entity patterns
   - Direct SQL query execution with robust safety checks
   - Natural language to SQL conversion via Claude API with regex extraction
   - Query results export to CSV and Google Sheets with fallback mechanisms
   - Automated backup and restore using pg_dump
   - Conversation archiving with JSON blob storage
   - Database statistics and monitoring with dashboard integration
   - Order-based conversation management with manual reordering support
   - Support for nickname fields with specialized UI components
   - Brand-broadcast company dual-ID integration with automated placeholder creation
   - Intelligent league association resolution based on entity relationships
   - Smart date handling with year-only input formatting
   - Virtual entity support (Championship, Playoffs) with deterministic UUID generation
   - Flexible entity validation with special case handling for non-table entity types

3. **API Organization**
   - Domain-driven design with feature-focused modules
   - Modular routing structure with organized prefixes
   - Facade pattern implementation with specialized service delegation
   - Generic type support for base services with inheritance
   - Standardized response formats with comprehensive error handling
   - Role-based API access with permission verification
   - Structured error handling with user-friendly messages
   - Enhanced logging system with configurable verbosity
   - Streaming response support for chat interactions

### Frontend (React + TypeScript)

#### Core Structure
```
frontend/
├── api/                   # API clients
├── components/            # Reusable UI components
│   ├── chat/              # Chat-related components
│   ├── common/            # Shared UI elements
│   ├── data/              # Data management components
│   │   ├── DataTable/     # Enhanced data grid implementation
│   │   │   ├── components/# Table sub-components
│   │   │   ├── hooks/     # Table-specific hooks
│   │   │   └── index.tsx  # Main component
│   │   ├── EntityUpdate/  # Entity edit components
│   │   │   ├── fields/    # Entity-specific field components
│   │   │   │   ├── TeamFields.tsx  
│   │   │   │   ├── LeagueFields.tsx
│   │   │   │   ├── DivisionConferenceFields.tsx
│   │   │   │   └── ... other entity fields
│   │   │   └── ... entity edit components
│   │   └── SportDataMapper/ # Data mapping components
│   └── sports/            # Sports database components
├── contexts/              # Global state management
├── features/              # Feature-based modules
│   └── DataManagement/    # Modular feature implementation
│       ├── components/    # Feature-specific components 
│       ├── hooks/         # Feature-specific hooks
│       └── index.tsx      # Feature entry point
├── hooks/                 # Shared custom hooks
├── pages/                 # Route components
├── services/              # Business logic services
└── utils/                 # Shared utilities
```

#### Key Features
1. **State Management**
   - Custom hook-based state management for focused concerns
   - Refactored context pattern with hook composition
   - ChatContext for optimized streaming with buffer management
   - DataFlowContext for structured data extraction pipeline
   - Enhanced error handling for database constraint violations
   - User-friendly notifications with severity-based display
   - Persistent state across page navigation with session storage
   - Optimized hooks for selection, sorting, and filtering operations

2. **Component Architecture**
   - Modular feature-based organization:
     ```
     features/FeatureName/
     ├── index.tsx                # Main container component
     ├── README.md                # Feature documentation
     ├── MIGRATION.md             # Migration guidelines
     ├── components/              # UI components
     │   ├── SubComponentA.tsx
     │   ├── SubComponentB.tsx
     │   └── index.ts             # Component exports
     ├── hooks/                   # Custom hooks
     │   ├── useFeatureData.ts
     │   ├── useFeatureState.ts
     │   └── index.ts             # Hook exports
     └── types.ts                 # Feature-specific types
     ```
   - Single-responsibility hooks with focused concerns:
     - useEntityData for data fetching and retrieval
     - useEntitySelection for selection management
     - useFiltering for filter operations
     - useSorting for type-aware sorting operations
     - useEntityPagination for pagination controls
     - useEntityView for view state management
     - useEntitySchema for field definitions
     - useDragAndDrop for column reordering with persistent storage
   - Consolidated component implementations:
     - Advanced component architecture with directory-based organization:
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
     - Standardized entity field components with common patterns
     - Reusable FormField component for consistent rendering
     - Common validation and error handling patterns
   - UI Enhancement Features:
     - Fixed navigation bar with consistent application layout
     - Standardized table styling across all data views
     - Consistent cell padding and grid lines for all tables
     - Interactive hover effects for both rows and column headers
     - Color-coded nickname badges (indigo for League, blue for DivisionConference)
     - Inline nickname editing with optimistic updates
     - Column drag-and-drop with visual feedback during operations
     - Persistent column ordering across application restarts
     - Toggle between UUID and human-readable names for relationship fields
     - Entity dropdown organization by parent entity (divisions by league)
     - Descriptive labels and help text for complex fields
     - Circular record navigation in SportDataMapper
   - Performance Optimizations:
     - React.memo with custom equality checks for expensive components
     - Strategic use of useMemo and useCallback with proper dependencies
     - Optimized value comparison for different data types
     - Reference stability patterns for complex objects
     - Fingerprinting for efficient collection comparison
     - Breaking circular dependency chains to prevent render loops
     - Local storage for persisting UI preferences
     - Prevention of maximum update depth errors:
       - Proper dependency tracking in all effect hooks
       - Avoiding hook calls inside other hooks or effects
       - Consistent React hooks usage following Rules of Hooks
       - Clean component unmounting with proper state cleanup
       - Breaking circular dependency chains with explicit memoization
       - Stable reference generation with JSON.stringify for complex objects
       - Conditional state updates to prevent infinite update loops
       - Careful observation of component update lifecycles
       - Intentional dependency exclusion with eslint comments when necessary
     - Simplified implementations for critical UI components:
       - Direct implementations for complex modal components to avoid hook rule violations
       - Fallback to standard React patterns when hook architectures cause issues
       - Clean props interface to maintain API compatibility
       - Streamlined lifecycle management with proper cleanup
   - Feature-focused folder structure:
     ```
     FeatureName/
     ├── components/      # UI components
     │   ├── SubComponentA.tsx
     │   ├── SubComponentB.tsx
     │   └── index.ts     # Exports all components
     ├── fields/          # Entity-specific form fields
     │   ├── TeamFields.tsx
     │   ├── LeagueFields.tsx
     │   ├── FormField.tsx    # Reusable form field component
     │   └── index.ts     # Exports all field components
     ├── hooks/           # Custom hooks
     │   ├── useEntityData.ts       # Data fetching logic
     │   ├── useEntitySelection.ts  # Selection management
     │   ├── useFiltering.ts        # Filter operations
     │   ├── useSorting.ts          # Sorting operations with optimized comparisons
     │   ├── useSelection.ts        # Selection management with efficient state updates
     │   ├── useEntityPagination.ts # Pagination controls
     │   └── index.ts     # Exports all hooks
     ├── utils/           # Helper functions
     │   ├── featureUtils.ts
     │   ├── notificationManager.ts
     │   ├── dataProcessor.ts
     │   └── index.ts     # Exports all utilities
     ├── types.ts         # Feature-specific type definitions
     └── index.tsx        # Main component with minimal logic
     ```
   - UI logic separated from data processing and state management
   - Custom form fields with standardized rendering pattern
   - Comprehensive memoization to prevent unnecessary renders
   - Explicit dependency tracking in useEffect hooks
   - Component optimization strategies:
     - Stable reference patterns for complex data structures
     - Fingerprinting techniques for object comparison
     - Breaking circular dependency chains
     - Simplified component implementation for critical UI elements
     - Careful management of component rerender cycles
   - Specialized utility modules for focused concerns:
     - Data transformation utilities
     - Entity processing utilities 
     - Error handling utilities
     - Notification management
     - Batch processing logic
   - Backend services follow similar modular organization:
     ```
     service_area/
     ├── base_service.py      # Shared functionality
     ├── entity_service.py    # Entity-specific implementation
     ├── validators.py        # Validation logic
     ├── utils.py             # Helper functions
     ├── facade.py            # Unified API with delegation
     └── __init__.py          # Exports facade
     ```

## Performance Optimization

### Key Strategies
1. **Memoization**
   - Strategic use of useMemo and useCallback for expensive operations
   - Memoization of expensive formatters and cell value rendering
   - Fingerprinting techniques for efficient collection comparison
   - Component memoization with React.memo and custom equality checks

2. **Dependency Optimization**
   - Proper dependency array management in hooks
   - Comprehensive prop comparison in memoized components
   - Deep equality checks only when necessary

3. **Rendering Efficiency**
   - Fine-grained component updates
   - DOM operations batching
   - Efficient drag-and-drop implementations
   - Smart re-rendering prevention
   - Type-specific value comparisons (dates, strings, numbers, UUIDs)

4. **Hook Specialization**
   - Dedicated hooks for sorting, selection, and data transformation
   - Proper memoization patterns within hooks
   - Clean separation of UI rendering and data processing logic

## Data Architecture

### Feature-Based Organization

The frontend is organized into feature-focused modules:

```
src/
├── features/              # Feature-based modules
│   ├── DataManagement/    # Structured data management
│   │   ├── index.tsx      # Main container component
│   │   ├── README.md      # Feature documentation
│   │   ├── MIGRATION.md   # Migration notes
│   │   ├── components/    # UI components
│   │   │   ├── DataList.tsx
│   │   │   ├── DataPreview.tsx
│   │   │   ├── NoDataView.tsx
│   │   │   └── index.ts
│   │   ├── hooks/         # Custom hooks
│   │   │   ├── useDataFlow.ts
│   │   │   ├── useDataSelection.ts
│   │   │   ├── useExtractedData.ts
│   │   │   └── index.ts
│   │   └── types.ts
│   └── /* other features */
├── components/            # Shared components
├── contexts/              # Global contexts
├── hooks/                 # Shared hooks
├── pages/                 # Route components
└── utils/                 # Shared utilities
```

### Database Schema

#### Core Entities
1. **Primary Tables**
   ```
   brands
   ├── id (UUID)
   ├── name (String, indexed)
   ├── industry (String, indexed)
   ├── company_type (String, nullable, indexed)
   ├── country (String, nullable)
   └── → brand_relationships, production_services, broadcast_rights
   
   leagues
   ├── id (UUID)
   ├── name (String, unique, indexed)
   ├── nickname (String(20), nullable, indexed)
   ├── sport, country
   ├── broadcast_start_date, broadcast_end_date
   └── → divisions_conferences, teams, games, executives
   
   divisions_conferences
   ├── id (UUID)
   ├── league_id (→ leagues)
   ├── name (String, unique per league, indexed)
   ├── nickname (String(20), nullable, indexed)
   ├── type (division/conference)
   ├── region, description
   └── → teams, broadcast_rights
   
   teams
   ├── id (UUID)
   ├── name (String, unique, indexed)
   ├── city, state, country
   ├── league_id (→ leagues)
   ├── division_conference_id (→ divisions_conferences)
   ├── stadium_id (→ stadiums)
   └── → players, home_games, away_games, records, ownerships
   
   stadiums
   ├── id (UUID)
   ├── name (String, unique, indexed)
   ├── city, state, country, capacity
   ├── owner, naming_rights_holder
   ├── host_broadcaster (String)
   ├── host_broadcaster_id (→ broadcast_companies/brands)
   └── → teams, games
   
   players
   ├── id (UUID)
   ├── name, position, jersey_number
   ├── college
   └── team_id (→ teams)
   ```

2. **Relationship Tables**
   ```
   games
   ├── id (UUID)
   ├── league_id (→ leagues)
   ├── home_team_id, away_team_id (→ teams)
   ├── stadium_id (→ stadiums)
   ├── date, time, status
   ├── home_score, away_score
   ├── season_year, season_type
   └── → broadcasts
   
   broadcast_rights
   ├── id (UUID)
   ├── entity_type, entity_id (polymorphic)
   ├── broadcast_company_id (→ broadcast_companies OR brands)
   ├── division_conference_id (→ divisions_conferences, nullable)
   ├── territory
   ├── start_date, end_date (with year-only formatting)
   ├── is_exclusive (Boolean)
   ├── league_name (derived from relationships)
   └── → broadcast_company, division_conference, derived league
   
   production_services
   ├── id (UUID)
   ├── entity_type, entity_id (polymorphic)
   ├── production_company_id (→ production_companies OR brands)
   ├── service_type
   ├── start_date, end_date (supports year-only input)
   └── → production_company/brand  
   Note: Unlike other entity types, Production Services do not have a name field.
   Supports name-to-ID resolution for both production_company_id and entity_id fields.
   Special handling for entity types like "Championship" with automatic entity creation.
   ```

3. **System Tables**
   ```
   archived_conversations
   ├── original_id, archived_date
   ├── conversation_data (JSON)
   └── metadata
   
   database_backups
   ├── timestamp, filename
   ├── size, backup_type
   └── status
   
   database_statistics
   ├── timestamp, entity_counts
   ├── storage_metrics
   └── performance_indicators
   
   conversations
   ├── id, title, created_at
   ├── user_id (foreign key)
   ├── order_index (for sorting)
   └── metadata
   ```

### Data Flow Patterns

1. **Chat to Data Pipeline**
   ```
   User Message → AI Processing → Data Extraction → 
   Validation → Storage → UI Update
   ```

2. **Sports Data Import**
   ```
   Source Data → Field Mapping → Entity Resolution →
   Validation → Batch Import → Progress Tracking
   ```

3. **Natural Language Database Query**
   ```
   User Question → Entity Detection → Schema Analysis (with FK relations) → 
   Context-Aware Template Selection → Claude AI Processing →
   SQL Generation with Relationship Guidance → Validation → 
   Query Execution → Result Display → Export Options
   ```
   
4. **Database Maintenance**
   ```
   Scheduled Job → Transaction Audit → Database Backup →
   Statistics Collection → Admin Dashboard Update
   ```

5. **Entity Name Resolution**
   ```
   Entity Reference → Type Detection → Entity Type Normalization →
   Name Processing (Handle Special Characters) → Exact Name Lookup → 
   Partial Name Fallback → Universal Brand Lookup → 
   Brand Creation (if needed) → UUID Resolution → Nickname Resolution → 
   Relationship Traversal → League Resolution → Add Related Entity Names → 
   Generate Display Names → UI Display
   ```

6. **Universal Brand System**
   ```
   Company Name Lookup → Brand Lookup → Company Type Classification →
   Brand Creation with Industry/Type → Direct Brand Usage →
   Relationship References → Form UI with FlexibleEntry →
   Company Type Suggestion → Industry Classification →
   Consistent Reference Management → Cross-Entity Resolution
   ```

6. **UUID Display System**
   ```
   Data Retrieval → UUID Field Detection → Related Entity Lookup →
   Name Field Resolution → Default Hiding of UUID-Only Columns →
   Toggle Control (Names/IDs) → Persistence of Preference →
   Conditional Rendering Based on Toggle State
   ```

7. **Column Drag and Drop System**
   ```
   User Interaction → Visual Feedback During Drag → 
   Reference-Based State Tracking → Optimized Reordering Logic →
   Storage Key Generation → LocalStorage Persistence → 
   Restore on Component Mount → Cross-Session Survival
   ```

8. **Record Navigation in SportDataMapper**
   ```
   Field Mapping → Circular Navigation Implementation →
   Bounds Checking → Animation Frame Transitions →
   Source Field Updates → State Synchronization →
   Field Value Preservation → Display Update
   ```

## Key Components

### Bulk Update System
- Purpose: Enable mass updates of entity fields across multiple records
- Architecture: Consolidated modal component with unified interface
- Implementation:
  - Single BulkEditModal component supporting multiple use cases:
    - Entity mode for sports database entities
    - Query mode for database query results
    - Type-safe implementation with proper interfaces
    - Smart entity type detection for query results
    - Consistent UI patterns across different modes
- Features:
  - Works with all entity types through a unified interface
  - Field categorization for logical organization (Basic Information, Relationships, etc.)
  - Smart field input detection based on data type
  - Foreign key resolution with dropdown selection
    - Division/Conference dropdowns organized by league for better selection
    - Human-readable display of relationship fields with parent context
    - Direct endpoint access for critical relationship data
    - Data-driven column display system with fields derived from API response
    - Special handling for broadcast rights field display with name/territory separation
    - Inline nickname editing for League and DivisionConference entities
    - Color-coded nickname badges (indigo for League, blue for DivisionConference)
    - Direct editing through badge click with optimistic UI updates
    - Placeholder display for entities without nicknames ("+ Add nickname")
    - Keyboard navigation support for nickname editing (Enter to save, Escape to cancel)
    - Simplified column management with data-based initialization
  - Special empty field handling to preserve or clear values as needed
  - Batch processing with real-time progress tracking
  - Detailed success/failure reporting
  - Performance optimization with request batching
  - Clear visual instructions and feedback
  - Authentication handling with direct API calls when needed

### DatabaseManagementSystem
- Purpose: Maintain database health and provide backup/restore capabilities
- Architecture: Service/CLI pattern
- Features:
  - Automated backups using pg_dump
  - Conversation archiving
  - Database statistics collection
  - Admin dashboard integration
  - CLI tools for maintenance
  - SQL query execution with safety checks
  - Natural language to SQL conversion

### SportDataMapper
- Purpose: Map structured data to sports entities
- Architecture: Container/Hooks pattern with modular implementation
- Implementation:
  - Modular component structure with clear separation of concerns:
    - SportDataMapperContainer for overall coordination
    - Dialog container for modal management
    - View-specific components for different mapping stages
    - Field mapping components for interactive drag-and-drop
    - Specialized hooks for focused responsibilities
  - Custom hooks for focused concerns:
    - useDataManagement for source data handling
    - useFieldMapping for field association logic
    - useImportProcess for record creation and batch processing
    - useRecordNavigation for record traversal
    - useUiState for interface state management
  - Utility modules for specialized functionality:
    - dataProcessor.ts for field data transformation
    - batchProcessor.ts for efficient batch operations
    - notificationManager.ts for consistent user feedback
    - importUtils.ts for entity resolution and validation
    - validationUtils.ts for data validation rules
- Features:
  - Separated workflow between mapping and "Send to Data" operations
  - Automatic entity type detection from field patterns
  - Smart entity type inference from name content (e.g., "Conference")
  - Intelligent name-to-ID resolution with special character handling
  - Fallback mechanism for entity names with parentheses
  - Advanced date formatting with flexible input (year-only → date)
  - Smart entity reference system for hierarchical relationships
  - Entity ID derivation from relationship fields
  - Context-sensitive help text with field-specific guidance
  - Batch processing with parallel operations
  - Progress tracking with detailed success/failure reporting
  - Enhanced error handling for database constraints
  - User-friendly database error messages with constraint explanation
  - Non-dismissing error notifications for critical issues
  - Circular record navigation (cycle to first after last record)
  - Record navigation persistence across page views
  - Request animation frame for smooth UI transitions
  - Default dates (April 1, 1976) when dates are missing

### DatabaseQuery
- Purpose: Enable users to query the database directly or using natural language
- Architecture: Component-based frontend with specialized backend services
- Implementation:
  - Frontend components:
    - Query editor with syntax highlighting
    - Side-by-side view for natural language and SQL
    - Results table with enhanced column management
    - Export controls with format selection
    - Query history and saved query management
  - Backend services:
    - DatabaseQueryService for query execution and validation
    - EntityNameResolver for enhancing query results with names
    - Claude API integration for natural language processing
    - Safety validation with regex pattern matching
    - Export services for CSV and Google Sheets generation
- Key Features:
  - Direct SQL query execution with comprehensive safety checks:
    - Query validation with pattern-based security rules
    - Operation whitelisting (SELECT queries only)
    - Protection against SQL injection attempts
    - Parameter sanitization and validation
  - Natural language to SQL conversion:
    - Schema-aware prompt construction for Claude API
    - Multi-level SQL extraction from AI responses:
      1. Regex extraction from SQL code blocks
      2. Fallback to general code block extraction
      3. Last resort SELECT statement pattern matching
    - Low temperature settings for deterministic SQL generation
    - Interactive query refinement capabilities
  - Enhanced result display:
    - Automatic detection of UUID relationship fields
    - Dynamic addition of human-readable entity names
    - Support for division_conference relationships in results
    - Proper handling of broadcast rights with division/conference context
    - Column drag-and-drop reordering with visual feedback
    - Long-term column order persistence with localStorage
    - Session-based state restoration when returning to the page
    - Toggle control for UUID vs. name display preference
  - Export capabilities:
    - Direct client-side CSV generation with Blob API
    - Google Sheets export with OAuth authentication
    - Configurable export options with formatting preferences
    - Fallback mechanisms when primary export fails
  - Query management:
    - Saving queries with metadata (name, description, type)
    - Query history with recent executions
    - Query categorization and filtering

### Chat System
- Purpose: AI interaction with structured data extraction
- Architecture: Streaming-focused services with modular extraction pipeline
- Implementation:
  - Backend services:
    - ChatService for conversation and message management
    - AnthropicService for Claude API integration
    - Extraction services for data processing
    - Stream formatting for real-time updates
  - Frontend components:
    - Chat interface with streaming message display
    - File upload components for CSV and text
    - Structured data preview with extraction controls
    - Conversation management UI with reordering
- Key Features:
  - Streaming response architecture:
    - Server-Sent Events (SSE) format for real-time updates
    - Optimized buffer management for sentence-based chunking
    - Special handling for search operations ([SEARCH] prefix)
    - Stream completion markers for client notification
    - Exception handling with graceful error messages
  - Advanced Claude API integration:
    - Configurable model selection (claude-3-sonnet-20240229)
    - Retry mechanism with exponential backoff
    - Rate limit awareness and handling
    - Streaming response processing with chunk aggregation
    - Context window optimization for conversation history
  - Conversation management:
    - Order-based conversation organization (order_index field)
    - Manual reordering through drag-drop or button controls
    - Conversation archiving with JSON blob storage
    - Title generation and update capabilities
    - Conversation search and filtering
  - File processing capabilities:
    - Direct file uploads (CSV, text) through API
    - Automatic data structure detection
    - CSV parsing with column mapping
    - Smart entity detection and field recognition
    - Integration with SportDataMapper for advanced mapping
  - Error handling and recovery:
    - Automatic retry for transient API errors
    - Fallback mechanisms for service interruptions
    - Session storage for preserving data during API failures
    - Clear user feedback for error states
    - Rate limit handling with appropriate delays

Components:
1. **ChatService**
   - Manages conversation lifecycle and message flow
   - Formats streaming responses with proper SSE encoding
   - Processes user messages with special command detection
   - Handles file uploads and data extraction coordination
   - Implements conversation reordering with database updates
   - Provides archiving capabilities for conversation management

2. **AnthropicService**
   - Establishes and manages Claude API connections
   - Implements configurable streaming with buffer management
   - Provides retry logic with exponential backoff
   - Handles rate limits and quota restrictions
   - Offers message formatting for different use cases
   - Implements error recovery with appropriate fallbacks

3. **Extraction Services**
   - DataDetectionService for identifying data structures
   - DataParserService for schema validation and normalization
   - DataExtractionService for coordinating the extraction pipeline
   - SessionStorageService for preserving state during API failures
   - Entity recognition for identifying sports-related data

## Data Management

### Database Management
1. **Backup System**
   - Scheduled backups with pg_dump
   - Configurable retention policy
   - JSON metadata storage
   - Restore functionality

2. **Archiving System**
   - Soft delete with archive tables
   - JSON blob storage for archived content
   - Restore capability
   - Data pruning with age-based policies

3. **Statistics Collection**
   - Entity count tracking
   - Storage usage monitoring
   - Query performance metrics
   - Admin dashboard visualization

### Validation System
1. **Entity Validation**
   - Reference integrity with name resolution
   - Required fields with smart defaults
   - Type checking with format detection
   - Relationship validation with hierarchy awareness
   - Year-to-date conversion for partial inputs
   - Intelligent entity search with exact and partial matching
   - Flexible entity reference system for complex relationships
   - Entity ID derivation from related entities

2. **Field Mapping**
   - Name-to-UUID conversion
   - Automatic entity resolution
   - Type coercion
   - Error aggregation

### Transaction Management
1. **API Endpoints**
   - FastAPI dependency injection
   - Automatic cleanup
   - Admin role verification
   - Rate limiting

2. **Batch Operations**
   - Isolated sessions
   - Rollback support
   - Progress tracking
   - Error aggregation

## Error Handling

### Frontend
1. **UI Errors**
   - Form validation
   - API error display
   - Loading states
   - Optimistic updates
   - Type definition consistency checks
   - Graceful rendering fallbacks for invalid data
   - Defensive programming for undefined values
   - Clear visual feedback for error states
   - Context function extraction validation
   - Component rendering sequence optimization
   - Dynamic field generation with fallbacks
   - Component memoization to prevent render loops
   - Circular dependency detection and prevention
   - Smart entity search optimization with fallbacks
   - Deep equality checks to prevent redundant updates
   - Enhanced constraint violation messages
   - User-friendly database error explanations
   - Prominent error notifications for critical issues
   - Persistent error displays for important messages
   - Helpful guidance text for error recovery
   - Improved error parsing for database constraints
   - Visual distinction between error types
   - Error positioning based on severity
   - Non-auto-dismissing errors for critical issues

2. **Data Errors**
   - Field validation
   - Type checking
   - Relationship verification
   - Import validation
   - EntityType standardization across the codebase
   - Context access pattern optimization
   - Order-of-operations safeguards for component rendering
   - Schema-driven column generation
   - Unified column handling across views
   - Relationship field display optimization

### Backend
1. **API Errors**
   - Standard error responses
   - Validation errors
   - Database errors
   - Authentication errors

2. **Database Errors**
   - Constraint violations with user-friendly explanations
   - Transaction failures
   - Deadlock handling
   - Connection issues
   - Backup failures
   - Duplicate entry detection with helpful recovery guidance
   - Foreign key validation with relationship context
   - Unique constraint violations with descriptive messages
   - Smart error pattern detection for common database issues

## Performance Considerations

### Frontend
- React Query caching
- Pagination implementation
- Optimistic updates
- Lazy loading
- Dashboard data polling

### Backend
- Query optimization
- Connection pooling
- Batch processing
- Cache management
- Backup compression
- Archive table indexing

## Security Measures

1. **Authentication**
   - JWT validation
   - Role-based access
   - Token refresh
   - Session management
   - Admin privilege verification

2. **Data Access**
   - Field-level permissions
   - Entity ownership
   - Admin restrictions
   - API rate limiting

3. **Database Security**
   - Backup encryption
   - Secure archive access
   - Audit logging
   - Access control for maintenance operations

## Testing Infrastructure

1. **Frontend Tests**
   - Component testing
   - Hook testing
   - Integration tests
   - E2E testing
   - Admin dashboard tests

2. **Backend Tests**
   - Unit tests
   - API tests
   - Database tests
   - Integration tests
   - Database management tests
   - Backup/restore tests

This document is maintained alongside code changes to ensure accuracy.