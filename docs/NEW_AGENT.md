# NEW AGENT QUICK START

## Project Overview

SheetGPT combines AI-powered chat with structured data management and sports database capabilities:

- Claude AI integration for data extraction and natural language database queries
- Comprehensive sports entity management with relationship handling
- Interactive data mapping and transformation tools
- Multi-format export with Google Sheets integration
- Database management with backup and archiving

> **PRODUCTION ENVIRONMENT**: The application is deployed at [88gpts.com/sheetgpt](https://88gpts.com/sheetgpt) with the API at [api.88gpts.com](https://api.88gpts.com)

## Architecture Overview

### Production Architecture

- **Frontend**: Netlify-hosted React application at 88gpts.com/sheetgpt
- **Backend**: Digital Ocean App Platform at api.88gpts.com 
- **Database**: PostgreSQL with SSL on Digital Ocean
- **Authentication**: Cross-domain JWT with CORS configuration
- **Communication**: HTTPS for all endpoints with proper SSL

### Backend

- **Core Stack**: FastAPI + PostgreSQL + SQLAlchemy ORM
- **API Design**: Domain-driven modules with facade pattern
- **Data Layer**: UUID primary keys with comprehensive relationships
- **AI Integration**: Claude 3.7 with streaming responses and sentence-based chunking
- **Services**: Specialized entity services with inheritance hierarchy

### Frontend

- **Core Stack**: React + TypeScript + Custom Hooks
- **Organization**: Feature-focused folder structure with clear boundaries
- **State Management**: Single-responsibility hooks for focused concerns
- **UI Components**: Advanced data grid with persistent column management
- **Performance**: Optimized rendering with strategic memoization
- **Dependency Management**: Circular dependency prevention with conditional updates

## Key Features

### Data Management

- **Universal Brand Entity**: Central model for all company relationships
- **Entity Resolution**: Name-to-UUID mapping with special character handling
- **Virtual Entities**: Championships/Playoffs without dedicated database tables
- **Smart Date Handling**: Year-only date detection with contextual defaults
- **Nickname Field Support**: Color-coded badges with inline editing

### UI Components

- **Data Tables**: Column persistence across sessions with dual storage
- **Bulk Operations**: Mass entity updates with field categorization
- **Entity Editing**: Relationship-aware forms with parent entity organization
- **Entity Display**: Toggle between UUIDs and human-readable names
- **Field Selection**: Intelligent field mapping with drag-and-drop

### API Capabilities

- **Natural Language Queries**: Translating questions to SQL with schema awareness
- **Entity Type Support**: Comprehensive sports domain model with relationships
- **Streaming Responses**: Real-time updates with optimized buffer management
- **Export Options**: Google Sheets and CSV with templating
- **Entity Name Resolution**: Human-readable display for relationships

## Essential Information

### Entity Relationships

```
1. Primary Entities:
   - Leagues (with nickname)
   - Brands (universal company entity)

2. Secondary Entities:
   - Division/Conferences (require league_id)
   - Teams (require division_conference_id)
   - Stadiums (may have broadcaster)

3. Relationship Entities:
   - Broadcast Rights (polymorphic entity_type/entity_id)
   - Production Services (use Brand directly)
   - Games (link teams and stadiums)
```

### Column Persistence

The system now implements dual localStorage/sessionStorage for UI preferences:

```javascript
// Save settings to both for maximum resilience
localStorage.setItem(storageKey, JSON.stringify(settings));
sessionStorage.setItem(storageKey, JSON.stringify(settings));

// Load with fallback strategy
let savedSettings = sessionStorage.getItem(storageKey);
if (!savedSettings) {
  savedSettings = localStorage.getItem(storageKey);
}
```

### Recent Fixes

- **Column Persistence**: Fixed visibility/order issues in Broadcast Rights and Production Services
- **Company Name Display**: Removed "(Brand)" suffix from company names
- **Entity Name Columns**: Implemented consistent handling for entity_name and entity_type
- **Storage Key Consistency**: Improved keys for user preference persistence
- **Race Condition Resolution**: Fixed visibility state management timing issues

## Development Workflow

```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up frontend

# Run tests
docker-compose run --rm backend pytest
./run-tests.sh

# Apply migrations
docker-compose run --rm backend python src/scripts/alembic_wrapper.py upgrade

# Database operations
python src/scripts/db_management.py backup
python src/scripts/db_management.py stats
```

## Essential Documentation

- **TECHNICAL_DESCRIPTION.md**: Architecture and implementation details
- **API_ARCHITECTURE.md**: API endpoints and backend structure
- **CLAUDE.md**: AI integration and streaming implementation
- **PROGRESS.md**: Recent changes and current focus

## Development Guidelines

### React Best Practices

- Extract context variables at the start of components
- Add null checks before accessing nested properties
- Use conditional state updates to break circular dependencies
- Create stable object references with proper memoization
- Implement dependency tracking in hooks with explicit exclusions when needed
- Validate prop types for all components
- Use the project's modular architecture patterns

### Entity Management

- Respect entity creation order: Primary → Secondary → Relationship
- Use name-based references rather than UUIDs when creating relationships
- Maintain column consistency between entity and query views
- Keep UI preferences synchronized using the dual storage pattern
- Handle special characters in entity names with proper resolution

### Testing Strategy

- Create unit tests for individual hooks and utilities
- Implement component tests with appropriate mocks
- Test entity operations with validation scenarios
- Verify column persistence and state management
- Ensure export functionality with fallback options

## Production Environment

The application is now deployed in a production environment:

```
User → 88gpts.com/sheetgpt (Netlify) → Frontend React Application
                  ↓
                  API Requests with JWT auth
                  ↓
User → api.88gpts.com (Digital Ocean) → Backend FastAPI → PostgreSQL Database
```

### Production-Specific Guidelines

- Access the application at [88gpts.com/sheetgpt](https://88gpts.com/sheetgpt)
- API endpoints are available at [api.88gpts.com/api/v1](https://api.88gpts.com/api/v1)
- Authentication works across domains with JWT
- CORS is configured to allow specific origins
- All data is stored in a PostgreSQL database on Digital Ocean
- SSL is enabled for all communications
- Login at 88gpts.com/sheetgpt/login with your production credentials

### Local vs Production Environment

| Feature | Local (Docker) | Production |
|---------|------------|-----------|
| Frontend URL | localhost:5173 | 88gpts.com/sheetgpt |
| API URL | localhost:8000 | api.88gpts.com |
| Database | PostgreSQL container | Digital Ocean managed PostgreSQL |
| Environment | Development | Production |
| File storage | Local volume | Digital Ocean storage |
| Authentication | Same-domain JWT | Cross-domain JWT |

## Current Focus (April 18, 2025)

1. **Production Deployment Stability** ✅
   - Cross-domain authentication reliability
   - Documentation browser fixes for production
   - WebSocket configuration for Docker development

2. **SQL Validation System**
   - Automatic correction of SQL syntax errors
   - PostgreSQL-specific validation rules
   - Visual feedback for query corrections

3. **Documentation**
   - Updated production deployment documentation
   - Component reference documentation

This document is updated with each significant change. Last update: April 18, 2025.