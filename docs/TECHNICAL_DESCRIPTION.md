# Technical Description

This document provides a concise technical description of the SheetGPT project architecture and implementation, focusing on current features and implementation.

## System Architecture

### Backend (FastAPI + PostgreSQL)

#### Core Components
```
src/
├── api/                  # Domain-specific endpoints
├── models/               # SQLAlchemy models
├── schemas/              # Pydantic schemas
├── services/             # Business logic
│   ├── sports/           # Sports domain services
│   │   ├── base_service.py           # Generic service functionality
│   │   ├── entity_name_resolver.py   # Entity reference resolution
│   │   ├── facade.py                 # Unified API facade
│   │   ├── validators.py             # Domain validation rules
│   └── chat/             # Chat and AI services
├── scripts/              # Maintenance and migration scripts
└── utils/                # Shared utilities
```

#### Key Features
1. **Authentication**
   - JWT-based system with token refresh
   - Role-based access control
   - Admin privilege verification

2. **Database Management**
   - SQLAlchemy ORM with UUID primary keys
   - Natural language to SQL translation using Claude API
   - Query results export to CSV and Google Sheets
   - Automated backup and restore
   - Support for nickname fields with specialized UI
   - Universal Brand entity model for companies
   - Smart date handling with year-only input formatting
   - Virtual entity support (Championship, Playoffs) with deterministic UUID generation

3. **API Organization**
   - Domain-driven design with feature-focused modules
   - Facade pattern implementation with specialized service delegation
   - Standardized response formats with comprehensive error handling
   - Streaming response support for chat interactions

### Frontend (React + TypeScript)

#### Core Structure
```
frontend/
├── components/            # Reusable UI components
│   ├── chat/              # Chat-related components
│   ├── common/            # Shared UI elements
│   ├── data/              # Data management components
│   │   ├── DataTable/     # Enhanced data grid implementation
│   │   ├── EntityUpdate/  # Entity edit components
│   │   │   ├── fields/    # Entity-specific field components
│   │   └── SportDataMapper/ # Data mapping components
│   └── sports/            # Sports database components
├── contexts/              # Global state management
├── features/              # Feature-based modules
├── hooks/                 # Shared custom hooks
├── pages/                 # Route components
├── services/              # Business logic services
└── utils/                 # Shared utilities
```

#### Key Features
1. **State Management**
   - Custom hook-based state management for focused concerns
   - ChatContext for optimized streaming
   - DataFlowContext for structured data extraction
   - Enhanced error handling for database constraints
   - Persistent state across page navigation

2. **Component Architecture**
   - Single-responsibility hooks:
     - useEntityData (data fetching)
     - useEntitySelection (selection management)
     - useFiltering (filter operations)
     - useSorting (type-aware sorting)
     - useEntitySchema (field definitions)
     - useDragAndDrop (column reordering)
     
   - UI Enhancement Features:
     - Color-coded nickname badges (indigo for League, blue for Division/Conference)
     - Inline nickname editing with optimistic updates
     - Column drag-and-drop with visual feedback
     - Toggle between UUID and human-readable names for relationships
     - Entity dropdown organization by parent entity
     - Circular record navigation in SportDataMapper
     
   - Performance Optimizations:
     - Strategic use of React.memo, useMemo, and useCallback
     - Reference stability patterns for complex objects
     - Breaking circular dependency chains to prevent render loops
     - Conditional state updates to prevent infinite update loops

## Data Architecture

### Database Schema (Key Tables)

```
brands               # Universal company entity
├── id (UUID)
├── name (String)
├── industry
├── company_type
└── country

leagues
├── id (UUID)
├── name (String)
├── nickname (String)
└── sport, country

divisions_conferences
├── id (UUID)
├── league_id (→ leagues)
├── name (String)
├── nickname (String)
└── type (division/conference)

teams
├── id (UUID)
├── name (String)
├── league_id (→ leagues)
└── division_conference_id (→ divisions_conferences)

broadcast_rights
├── id (UUID)
├── entity_type, entity_id (polymorphic)
├── broadcast_company_id (→ brands)
└── division_conference_id (→ divisions_conferences)

production_services
├── id (UUID)
├── entity_type, entity_id (polymorphic)
├── production_company_id (→ brands)
└── service_type
```

### Key Data Flow Patterns

1. **Natural Language Database Query**
   ```
   User Question → Schema Analysis → Claude AI Processing →
   SQL Generation → Validation → Result Display → Export Options
   ```
   
2. **Entity Name Resolution**
   ```
   Entity Reference → Type Detection → Exact/Partial Name Lookup → 
   Universal Brand Lookup → UUID Resolution → Relationship Traversal
   ```

3. **Universal Brand System**
   ```
   Company Name Lookup → Brand Lookup → Company Type Classification →
   Brand Creation → Direct Brand Usage in All Related Entities
   ```

4. **Virtual Entity Support**
   ```
   Special Entity Detection (e.g., "Championship") → Deterministic UUID Generation →
   Consistent Reference Across System → No Table Storage Required
   ```

## Recent Key Features

### Special Entity Types Support
- Added support for Championship and Playoffs as recognized entity types
- Implemented deterministic UUID generation for virtual entities
- Enhanced schema validation to support both UUID and string-based entity IDs
- No dedicated database tables needed for special entity types

### Universal Company Entity
- Implemented Brand as the universal entity for all companies
- Added company_type and country fields to Brand model
- Created direct relationships between Brand and services
- Enhanced name-to-ID resolution for dynamic company creation

### Performance Optimizations
- Memoization strategies for expensive operations
- Column drag-and-drop with visual feedback and stable state
- Proper dependency tracking in useEffect hooks
- Breaking circular dependencies in complex components

### UI Enhancements
- Color-coded nickname badges with inline editing
- Toggle between UUID and human-readable names
- Persistent column ordering with drag-and-drop
- Circular record navigation in data mapper

## Current Priorities

1. Data export reliability improvements
2. Test coverage expansion
3. Error handling enhancements
4. Field validation improvements

This document is maintained alongside code changes to ensure accuracy.