# Technical Description

This document provides a technical description of the SheetGPT project architecture and implementation.

## System Architecture

### Backend (FastAPI + PostgreSQL)

#### Core Components
```
src/
├── api/              # Domain-specific endpoints
├── models/           # SQLAlchemy models
├── schemas/          # Pydantic schemas
├── services/         # Business logic
├── scripts/          # Maintenance and migration scripts
└── utils/            # Shared utilities
```

#### Key Features
1. **Authentication**
   - JWT-based system
   - Role-based access control
   - Secure token management
   - Admin privilege verification

2. **Database Management**
   - SQLAlchemy ORM with UUID primary keys
   - Isolated transaction handling
   - Direct SQL query execution with safety checks
   - Natural language to SQL conversion via Claude API
   - Query results export to CSV and Google Sheets
   - Automated backup and restore
   - Conversation archiving
   - Database statistics and monitoring
   - Order-based conversation management

3. **API Organization**
   - Domain-driven design
   - Modular routing structure with facade pattern for complex services
   - Services organized by entity type with base service inheritance
   - Standardized response formats
   - Role-based API access
   - Structured error handling
   - Enhanced logging system

### Frontend (React + TypeScript)

#### Core Structure
```
frontend/
├── api/          # API clients
├── components/   # Reusable UI
├── contexts/     # State management
├── hooks/        # Custom hooks
├── pages/        # Route components
└── services/     # Business logic
```

#### Key Features
1. **State Management**
   - React Query for server state
   - Context API for global state
   - ChatContext for optimized streaming
   - DataFlowContext for extraction pipeline

2. **Component Architecture**
   - Modular feature-based organization:
     ```
     features/FeatureName/
     ├── index.tsx                # Main container component
     ├── README.md                # Feature documentation
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
   - Custom hooks for business logic with clean separation of concerns
   - Feature-specific utility functions in dedicated modules
   - Focused components with single responsibility principle
   - Consolidated component implementations to reduce duplication
   - Unified modal components with flexible prop interfaces
   - Fixed navigation bar with consistent layout
   - Table-based components for structured data
   - Optimized rendering with React.memo and precise prop comparison
   - Memoized formatters for efficient cell value rendering
   - Efficient drag-and-drop with fingerprinting for DOM operations
   - Sorting mechanisms with dedicated hooks for data organization
   - Entity-specific field components for improved maintainability
   - Contextual action buttons for improved UX
   - UUID display toggle for relationship fields (shows names instead of IDs)
   - Consistent Names/IDs toggle behavior across all relationship fields
   - Auto-generated display names for entities without name fields
   - Smart dropdowns for relationship fields with logical organization
   - Default visibility for all columns with toggle controls
   - Domain-specific API clients with targeted functionality
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
   leagues
   ├── name, sport, country
   ├── broadcast_dates
   └── → broadcast_companies
   
   division_conferences
   ├── name, nickname, type (division/conference)
   ├── region, description
   └── → leagues
   
   teams
   ├── name, city, state
   ├── → leagues
   ├── → division_conferences
   └── → stadiums
   
   stadiums
   ├── name, capacity
   └── → host_broadcaster
   
   players
   ├── name, position
   └── → teams
   ```

2. **Relationship Tables**
   ```
   games
   ├── date, time, status
   ├── → home_team
   ├── → away_team
   └── → stadium
   
   broadcast_rights
   ├── territory, dates
   └── → broadcast_company
   
   production_services
   ├── service_type, dates
   └── → production_company
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
   User Question → Schema Analysis → Claude AI Processing →
   SQL Generation → Query Execution → Result Display → Export Options
   ```
   
4. **Database Maintenance**
   ```
   Scheduled Job → Transaction Audit → Database Backup →
   Statistics Collection → Admin Dashboard Update
   ```

5. **Entity Name Resolution**
   ```
   Entity Reference → Type Detection → Database Lookup →
   Name/ID Resolution → Nickname Resolution → Relationship Validation → UI Display
   ```

6. **UUID Display System**
   ```
   Data Retrieval → UUID Detection → Default Hiding →
   Column Visibility Control → Related Entity Lookup →
   Display Format Selection (Names/IDs) → Conditional Rendering
   ```

7. **Column Drag and Drop System**
   ```
   User Interaction → Visual Feedback → State Update →
   Persistent Storage → UI Rerendering → Browser Survival
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
- Architecture: Container/Hooks pattern
- Features:
  - Auto entity detection
  - Smart field mapping with name-to-ID resolution
  - Intelligent relationship handling with lookup by name
  - Advanced date formatting with year-to-date conversion
  - Smart entity search with exact and partial matching
  - Flexible entity reference system for hierarchical relationships
  - Entity ID derivation from relationship fields
  - Context-sensitive help text for complex fields
  - Batch processing with validation
  - Progress tracking with error reporting

### DatabaseQuery
- Purpose: Enable users to query the database directly or using natural language
- Architecture: Frontend component with backend API integration
- Features:
  - Direct SQL query execution with safety filtering
  - Natural language to SQL conversion using Claude AI
  - Interactive side-by-side view of natural language query and SQL
  - Syntax-highlighted, editable SQL with one-click execution
  - Query translation without execution through "Translate" button
  - Query saving and management with localStorage persistence
  - Column drag-and-drop reordering with visual feedback
  - UUID columns hidden by default for improved readability
  - Long-term column order persistence through localStorage
  - Hash-based storage keys for different query types
  - Session-based state persistence when navigating away from the page
  - Results display with sorting, column visibility, and row selection
  - Entity relationship display with UUID-to-name resolution
  - Smart entity name resolution for relationship fields
  - Automatic column reordering for related fields (e.g., entity_id next to entity_name)
  - Toggle between UUID and human-readable name display
  - Direct client-side CSV export with proper file formatting
  - Google Sheets export with authentication flow

### Chat System
- Purpose: AI interaction and data extraction
- Features:
  - Message streaming with real-time processing
  - Structured data extraction and validation
  - Conversation management with history and reordering
  - File import with CSV parsing and data structure detection
  - Direct text and CSV file uploads with automatic formatting
  - Error handling and recovery with fallbacks
  - Background task processing
  - Rate limiting and timeout handling
  - Automatic message persistence

Components:
1. **ChatService**
   - Handles conversation and message management
   - Integrates with Claude API via AnthropicService
   - Handles streaming responses with buffer management
   - Processes structured data extraction
   - Manages conversation archiving and reordering

2. **AnthropicService**
   - Manages Claude API connections
   - Handles API key management
   - Processes streaming responses
   - Implements retry mechanisms
   - Handles rate limits and timeouts

3. **Extraction Services**
   - DataDetectionService for entity identification
   - DataParserService for schema validation
   - DataExtractionService for workflow coordination
   - Session storage fallback mechanism

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
   - Constraint violations
   - Transaction failures
   - Deadlock handling
   - Connection issues
   - Backup failures

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