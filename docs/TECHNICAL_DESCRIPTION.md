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
   - Single-responsibility hooks
   - Feature-focused organization
   - Component directory structure with clear boundaries
   - Consistent dual storage persistence

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
└── service_type
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
   Consistent Reference → No Table Storage Required
   ```

## Recent Enhancements

### UI Component Improvements
- Implemented descriptive browser page titles
- Created usePageTitle hook for navigation context
- Fixed column visibility/ordering persistence for all entity types
- Implemented consistent entity name display
- Removed "(Brand)" suffix from company names
- Enhanced column persistence with dual storage

### Data Management
- Universal Brand entity for all company relationships
- Virtual entity support for Championships and Playoffs
- Deterministic UUID generation for special entities
- Enhanced name resolution with parentheses support

### Performance Optimizations
- Optimized useDragAndDrop hook
- Fixed race conditions in visibility state
- Improved storage key consistency
- Enhanced circular dependency resolution

## Current Focus

1. **Data Export Enhancement**
   - Google Sheets export reliability
   - CSV fallback implementation

2. **Quality Improvements**
   - Test coverage expansion
   - Error handling enhancements
   - Field validation improvements

3. **UI Refinements**
   - Relationship constraint messaging
   - Mobile responsive adjustments
   - Large dataset performance
   - Further navigation context improvements

Updated: April 2, 2025