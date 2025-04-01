# Technical Description

This document provides a concise overview of SheetGPT's architecture and implementation.

## System Architecture

### Backend (FastAPI + PostgreSQL)

#### Core Organization
```
src/
├── api/               # Domain-specific endpoints
├── models/            # SQLAlchemy models
├── schemas/           # Pydantic schemas
├── services/          # Business logic
│   ├── sports/        # Sports domain services
│   │   ├── facade.py              # Unified API coordination
│   │   ├── entity_name_resolver.py # Reference resolution
│   │   ├── brand_service.py       # Universal company handling
│   └── chat/          # Claude API integration
├── scripts/           # Maintenance and migrations 
└── utils/             # Shared utilities
```

#### Key Features

1. **API Design**
   - Domain-driven modules with facade pattern
   - Standardized responses with comprehensive error handling
   - Streaming support for chat interactions

2. **Database Architecture**
   - SQLAlchemy ORM with UUID primary keys
   - Natural language to SQL translation via Claude
   - Universal Brand entity for all company relationships
   - Virtual entity support with deterministic UUIDs
   - Smart date handling with contextual defaults

3. **Authentication**
   - JWT with refresh tokens
   - Role-based access control

### Frontend (React + TypeScript)

#### Core Structure
```
frontend/
├── components/          # UI components by domain
│   ├── chat/            # Chat interface
│   ├── common/          # Shared UI elements
│   ├── data/            # Data management
│   │   ├── DataTable/   # Advanced table with persistence
│   │   ├── EntityUpdate/ # Edit interfaces
│   │   └── SportDataMapper/ # Data mapping tools
│   └── sports/          # Sports database interface
├── contexts/            # Global state management
├── features/            # Feature-based modules
├── hooks/               # Custom hooks by functionality
│   ├── useAuth.ts       # Authentication management
│   ├── useDataManagement.ts # Data operations
│   ├── usePageTitle.ts  # Browser title management
│   └── ...              # Other specialized hooks
├── pages/               # Route components
└── services/            # API client services
```

#### Key Features

1. **Component Architecture**
   - Single-responsibility hooks with focused concerns
   - Feature-focused organization with modular components
   - Component directory structure with proper separation:
     ```
     ComponentName/
     ├── index.tsx          # Main component
     ├── components/        # UI elements
     ├── hooks/             # State management
     └── utils/             # Helper functions
     ```
   - Consistent dual storage persistence (localStorage/sessionStorage)
   - Decomposition of large components into manageable pieces

2. **State Management**
   - Custom hooks for focused concerns
   - Optimized contexts with memoization
   - Session-resilient state persistence

3. **UI Enhancements**
   - Descriptive page titles for navigation/history
   - Column persistence for all entity types
   - Toggle between UUIDs and human-readable names
   - Circular record navigation
   - Color-coded nickname badges with inline editing
   - Entity display without "(Brand)" suffix

4. **Performance Optimizations**
   - Strategic memoization and caching
   - Dependency tracking in hooks
   - Circular dependency resolution
   - Conditional state updates

## Data Architecture

### Key Database Tables

```
brands                   # Universal company entity
├── id (UUID)
├── name (String)
├── company_type
└── country

leagues
├── id (UUID)
├── name, nickname
└── sport, country

divisions_conferences
├── id (UUID)
├── league_id (→ leagues)
├── name, nickname
└── type (division/conference)

broadcast_rights
├── id (UUID)
├── entity_type, entity_id (polymorphic)
├── broadcast_company_id (→ brands)
└── division_conference_id (→ divisions_conferences)

production_services
├── id (UUID)
├── entity_type, entity_id (polymorphic)
├── production_company_id (→ brands)
├── secondary_brand_id (→ brands) # Optional employing brand
├── service_type
└── start_date, end_date
```

### Data Flow Patterns

1. **Natural Language Database Queries**
   ```
   Question → Schema Context → Claude AI → SQL Generation → 
   Validation → Execution → Name Resolution → Display
   ```

2. **Entity Resolution System**
   ```
   Reference → Type Detection → Exact/Partial Name Lookup → 
   Cross-Entity Type Search → Smart Fallback → 
   Brand Lookup → UUID Resolution → Relationship Traversal
   ```

3. **Universal Brand System**
   ```
   Company Detection → Brand Lookup/Creation → 
   Type Classification → Direct Entity Relationships
   ```

4. **Virtual Entity Support**
   ```
   Special Entity Detection → Deterministic UUID Generation →
   Consistent Reference → Multi-Type Resolution →
   No Table Storage Required
   ```

## Recent Enhancements

### SQL Validation and Query Execution Improvements (June 2025)
- Implemented comprehensive SQL validation system:
  - Created validation service using Claude API for intelligent error detection
  - Enhanced user experience with automatic SQL correction
  - Implemented detailed validation for complex PostgreSQL-specific issues:
    - ORDER BY with SELECT DISTINCT validation
    - Aggregation function ordering validation
    - CTE syntax verification with UNION compatibility
    - JOIN condition verification
    - Window function validation
    - Invalid column reference detection
  - Added SQL query pre-validation to prevent runtime errors
  - Enhanced natural language to SQL generation with specific PostgreSQL guidance
  - Implemented seamless frontend integration with automatic fix application
  - Added visual feedback for automatic SQL corrections with notifications
  
- Created intelligent SQL query validation workflow:
  ```
  SQL Query → Claude API Validation → Error Detection →
  Syntax Correction → Query Rewriting → Frontend Update →
  Automatic Execution → Results Display
  ```
  
- Fixed SQLAlchemy relationship configuration:
  - Resolved overlapping relationship warnings between Brand and BroadcastCompany
  - Enhanced bidirectional relationship configuration with proper overlaps parameter
  - Improved relationship declaration with explicit foreign key specifications

### React State Management Improvements (May 2025)
- Identified and documented complex React state management patterns:
  - Discovered circular dependencies in component and hook interactions
  - Analyzed state synchronization issues in pagination components
  - Identified order-dependent state updates causing UI inconsistencies
  - Documented patterns that lead to maximum update depth errors
  - Created defensive programming patterns to prevent state update loops
  - Implemented best practices for hook dependency management

- Added comprehensive React state management guidelines:
  - Detailed patterns for dependent state value updates
  - Techniques for tracking previous values with useRef
  - Approaches for memoizing complex objects in dependencies
  - Methods for breaking circular update cycles
  - Strategies for managing interrelated state values
  - Testing patterns for state transition edge cases
  - Recommendations for component structure to prevent update issues

- Specific component improvements:
  - Enhanced useEntityPagination with better state handling
  - Fixed BulkEditModal infinite update loop
  - Improved SportsDatabaseContext state synchronization
  - Optimized Pagination component with defensive state updates
  - Implemented defensive state handling in modals with complex state

- React architecture recommendations:
  - Simplified component hierarchies to reduce prop drilling
  - Applied useRef for tracking previous values across renders
  - Implemented explicit change detection before updating state
  - Added conditional state updates to prevent unnecessary renders
  - Created clearer patterns for component interaction design
  - Enhanced TypeScript typing for React state management

### Database Maintenance Improvements (May 2025)
- Enhanced database maintenance workflow with flexible step execution:
  - Redesigned workflow to allow steps to be run in any order with warning dialogs
  - Implemented informative warnings for potentially risky operations
  - Added ability to rerun the Fix Duplicate Records step after completion
  - Created immediate visual feedback when steps are triggered
  - Fixed state transitions with proactive status updates
  - Enhanced button styling for better visibility and accessibility
  - Improved error handling during maintenance operations
  
- Fixed critical regex replacement bug in entity name standardization:
  - Corrected Python regex replacement syntax in db_cleanup.py
  - Changed JavaScript-style backreferences (`$1`) to Python-style (`\1`)
  - Implemented automated recovery script for affected NCAA league names
  - Added entity name verification and validation tools
  - Created more reliable UI state tracking for maintenance workflow
  - Improved transaction handling with isolated operations
  - Optimized system_metadata storage with TEXT vs JSONB type handling

### Component Refactoring (March 2025)
- Refactored EntityList component from 1300+ lines into modular structure
- Implemented clean separation of concerns:
  - 7 focused UI components (EntityListHeader, ColumnSelector, EntityTable, etc.)
  - 3 custom hooks for specific functionalities (column visibility, export, inline editing)
  - Utility modules for CSV export and data formatting
- Improved maintainability with single-responsibility pattern
- Enhanced performance with better state isolation
- Preserved 100% of existing functionality and UI appearance
- Followed component organization best practices for consistency

### Export Functionality Improvements (April 2025)
- Enhanced Google Sheets export to use visible columns only
- Added Google Drive folder selection and creation
- Fixed async SQLAlchemy issues in export service
- Implemented Google Sheets authentication detection
- Added CSV export fallback when Sheets is unauthenticated
- Modified backend response structure to include folder information
- Redesigned export UI with simplified direct action buttons
- Standardized export dialog across application contexts
- Eliminated format toggle in favor of direct export actions
- Preserved all rows in exports regardless of pagination
- Enhanced error messaging with more user-friendly feedback
- Added column name filtering based on visibility state
- Improved button styling with consistent size and color coding
- Added visual icons to export buttons for better recognition
- Implemented OS-level save-as dialog for CSV exports using File System Access API
- Created fallback download mechanism for browsers without modern file API support
- Fixed race conditions in export type selection with direct mutation calls
- Enhanced TypeScript definitions for File System Access API
- Improved async/await usage in export click handlers for proper error handling
- Standardized CSV export behavior across all application contexts

### Production Services Improvements (April 2025)
- Added secondary brand relationship for employing companies
- Implemented intelligent entity type detection from entity names
- Added automatic date defaults (2000-01-01 to 2100-01-01)
- Added name-to-ID resolution for secondary brands
- Enhanced field visibility in SportDataMapper and Entity List
- Improved data validation for relationship fields
- Added cross-entity type resolution for entity names
- Implemented smart fallback search across entity types
- Added support for tournament as a special entity type
- Improved entity name resolution with multi-type search

### Chat System Improvements
- Fixed conversation history to display both user and assistant messages
- Enhanced metadata handling for message rendering
- Fixed file attachment display in message threads
- Improved scrolling behavior in conversation history
- Enhanced message threading with proper role identification

### UI Component Improvements
- Implemented descriptive browser page titles
- Created usePageTitle hook for navigation context
- Fixed column visibility/ordering persistence for all entity types
- Implemented consistent entity name display
- Removed "(Brand)" suffix from company names
- Enhanced column persistence with dual storage

### Data Management
- Universal Brand entity for all company relationships
- Virtual entity support for Championships, Playoffs, and Tournaments
- Deterministic UUID generation for special entities
- Enhanced name resolution with parentheses support
- Cross-entity type resolution with intelligent fallback
- Automatic entity type correction based on name matches

## Testing Architecture

The testing framework is organized into three main categories to ensure comprehensive coverage:

### Frontend Testing
```
tests/frontend/
├── components/       # Component tests with render + interaction validation
├── hooks/            # Custom React hook tests
├── contexts/         # Context provider tests  
├── services/         # Frontend service tests
└── utils/            # Utility function tests
```

Key features:
- Jest + React Testing Library for component testing
- Custom Jest configurations for specific component suites
- Specialized coverage reporting and thresholds
- Mocking strategies for external dependencies
- Component-specific test suites with dedicated configs

### Backend Testing
```
tests/backend/
├── routes/           # API endpoint tests
├── services/         # Business logic tests
├── models/           # Database model tests
├── schemas/          # Validation schema tests
└── utils/            # Helper function tests
```

Key features:
- Pytest with asyncio support
- Database transaction isolation
- Service layer mocking
- Comprehensive validation testing
- Error scenario coverage

### Integration Testing
```
tests/integration/
├── data_flow/        # End-to-end data workflow tests
├── authentication/   # User authentication flows
└── exports/          # Export feature validations
```

Key features:
- Cross-component workflow validation
- Authentication flow testing
- API client testing with realistic scenarios
- Export functionality validation
- Database interaction verification

### Testing Infrastructure

- Containerized testing environment with Docker
- GitHub Actions workflow for automated testing
- Coverage reporting with thresholds
- Specialized test configurations for component suites
- Mock implementations for external dependencies
- Test data factories for consistent test scenarios
- Custom Jest transformers for TypeScript and assets

## Current Focus

1. **Performance Optimization**
   - Large dataset handling
   - Query execution efficiency 
   - Pagination improvements
   - Virtualization for long lists

2. **UI Refinements**
   - Relationship constraint messaging
   - Mobile responsive adjustments
   - Further navigation context improvements
   - Accessibility enhancements

3. **Data Visualization**
   - Charting capabilities for analytics
   - Interactive data exploration
   - Visual relationship mapping
   - Timeline visualization for historical data

Updated: May 7, 2025