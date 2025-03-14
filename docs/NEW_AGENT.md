# NEW AGENT INTRODUCTION

## Project Overview
SheetGPT is a full-stack application combining AI-powered chat with structured data management and sports database functionality. Key capabilities:
- AI chat for data extraction and structuring
- Tabular data management with column controls
- Sports entity management (leagues, teams, players, etc.)
- Advanced database query system with SQL and natural language support
- Google Sheets integration for data export
- Database maintenance and backup system
- Conversation archiving functionality

## Technical Architecture

### Backend
- FastAPI with SQLAlchemy ORM and PostgreSQL
- JWT authentication with role-based access
- Modular design with isolated services
- Transaction management with session control
- Database backup and management system
- Scheduled task infrastructure

### Frontend
- React with TypeScript
- React Query for data management
- Advanced DataTable component
- Fixed navigation bar with consistent layout
- Sports database interface with relationship visualization
- Admin dashboard for database management
- Table-based list components with sorting capabilities
- Contextual action buttons for improved UX

## Key Components

1. **Database Management System**
   - Comprehensive backup and restore functionality
   - Conversation archiving system
   - Database statistics collection and reporting
   - Admin management interface
   - CLI tools for database operations
   - Scheduled tasks for automated maintenance

2. **Entity Reference Resolution System**
   - Flexible reference system (UUID/name-based)
   - Validation layer (`validationUtils.ts`)
   - Mapping layer (`mappingUtils.ts`)
   - Automatic entity creation and lookup

3. **SportDataMapper**
   - Field mapping with drag-and-drop
   - Entity type detection
   - Batch import capabilities
   - Progress tracking
   - Record navigation

4. **Advanced Filtering**
   - Hybrid approach (backend/client-side)
   - Multiple filter types and operators
   - Filter persistence
   - Dynamic query building

5. **Entity Edit System**
   - Modular form components per entity type
   - Smart field type detection and rendering
   - Relationship field handling with dropdowns
   - Real-time validation and error handling
   - Related entities display

6. **Bulk Update System**
   - Comprehensive interface for updating multiple entity records at once
   - Works across all entity types (teams, leagues, players, etc.)
   - Smart field organization by category
   - Intelligent field type detection with appropriate inputs
   - Empty field handling with preservation of existing values
   - Batch processing with progress indication
   - Performance optimization with request batching
   - Success/failure reporting with detailed results

7. **Database Query System**
   - Natural language to SQL conversion using Claude AI
   - Direct SQL query execution with safety checks
   - Side-by-side view of natural language and SQL
   - Query translation without execution 
   - Results display with sorting and column controls
   - Client-side CSV export and Google Sheets export

## Current Status (March 2025)

### Completed Features
- ✅ User authentication and management
- ✅ Chat interface with AI integration
- ✅ Structured data extraction
- ✅ Sports database with comprehensive models
- ✅ Division/Conference model with hierarchical relationships
- ✅ Frontend-backend integration
- ✅ Admin functionality
- ✅ Enhanced field mapping visualization
- ✅ Hybrid filtering implementation
- ✅ Bulk operations for entities
- ✅ Advanced entity editing with relationship management
- ✅ Message repeat functionality
- ✅ Entity list pagination
- ✅ Database management system
- ✅ Conversation archiving functionality
- ✅ Database backup and restore
- ✅ Admin statistics dashboard
- ✅ Claude API integration
- ✅ Conversation reordering
- ✅ Enhanced error handling framework
- ✅ Extraction services architecture
- ✅ Database Query system with natural language support

### In Progress
- 🔄 Google Sheets API integration reliability
- 🔄 Sports database API endpoint testing
- 🔄 Frontend component test coverage
- 🔄 Automated database maintenance schedules
- 🔄 Mobile responsive design

## Critical Information

1. **Database Schema**
   - All entities use UUID primary keys
   - Strict referential integrity
   - Required fields enforced at database level
   - Relationship tables for many-to-many
   - System tables for archiving and backups

2. **Entity Dependencies**
   Primary:
   - Leagues
   - Broadcast Companies
   - Production Companies
   
   Secondary:
   - Division/Conferences (requires leagues)
   - Teams (requires leagues, division/conferences, stadiums)
   - Stadiums (requires broadcast companies)
   - Players (requires teams)
   
   Relationship:
   - Games (requires teams, stadiums)
   - Broadcast Rights
   - Production Services
   
   System:
   - Archived Conversations
   - Database Backups
   - Database Statistics

3. **Recent Changes**
   - Added DivisionConference model as sub-unit of Leagues
   - Created hierarchical relationship: League → Division/Conference → Team
   - Refactored large components into modular, focused components
   - Implemented feature-based folder structure for complex features
   - Extracted business logic into specialized custom hooks
   - Reorganized API client code into domain-specific services
   - Improved type safety with dedicated type files and interfaces
   - Enhanced Teams Advanced Edit functionality with proper relationship handling
   - Integrated Claude API with robust error handling
   - Implemented fixed navigation bar across the application
   - Enhanced extraction services architecture
   - Added conversation archiving with restore capability
   - Created database statistics dashboard for administrators

## Common Issues and Solutions

1. **Database Management**
   - Use CLI tools for database operations: `python src/scripts/db_management.py [command]`
   - Schedule backups using cron jobs
   - Archive instead of delete for important data
   - Monitor database growth patterns
   - Use provided restore tools for recovery

2. **Entity Creation**
   - Use name-based references when possible
   - System handles UUID conversion
   - Automatic entity creation for missing references
   - Ensure EntityType definitions are consistent across the codebase
   - Use dynamic field generation for consistent column handling

3. **Validation**
   - Validation occurs before mapping
   - Support for both UUID and name fields
   - Clear error messages for debugging
   - Real-time field validation in forms
   - Add proper error handling for undefined values
   - Use null checks before accessing properties
   - Extract context functions before using them

4. **Data Import**
   - Batch import with progress tracking
   - Automatic relationship resolution
   - Error aggregation and reporting
   - Ensure context data is available before use
   - Handle field mapping consistently across views

5. **Entity Editing**
   - Use AdvancedEditForm for complex entities
   - Handle relationships through dropdowns
   - Implement optimistic updates
   - Provide fallback error handling
   - Structure components to fetch context data before rendering
   - Add defensive programming for potential undefined values
   - Use unified column visibility controls
   - Generate UI elements dynamically from schema

6. **Component Rendering**
   - Access context data at the beginning of components
   - Provide safe fallbacks for missing or undefined values
   - Add conditional rendering for potentially missing data
   - Handle loading states explicitly
   - Create consistent error displays for data issues
   - Standardize column visibility between entity and query views
   - Extract reusable rendering logic for different components

## Required Reading
1. TECHNICAL_DESCRIPTION.md - Detailed component documentation
2. SPORTS_API_ENDPOINTS.md - API endpoint specifications
3. API_ARCHITECTURE.md - System architecture details
4. PROGRESS.md - Latest updates and status

## Error Handling Protocol
1. Check validation layer first
2. Verify entity relationships
3. Review transaction logs
4. Confirm client-side state
5. Validate API responses
6. Check database backup status

## Recent Features
1. **UUID Display Toggle & Division/Conference Dropdowns** (March 15, 2025)
   - Added toggle between showing full UUIDs and human-readable names across app
   - Fixed Division/Conference dropdown selection in bulk edit operations 
   - Organized Division/Conference dropdowns by league for better selection
   - Made all table columns visible by default for better data discoverability

2. **Global Bulk Update Feature** (March 14, 2025)
   - Comprehensive bulk update system for all entity types
   - Modal-based interface with field categorization
   - Smart field input detection with appropriate controls
   - Foreign key resolution with dropdown selection

3. **Division/Conference Model Addition** (March 13, 2025)
   - Added DivisionConference model as sub-unit of Leagues 
   - Created hierarchical relationship: League → Division/Conference → Team
   - Modified Team model to require division/conference assignment

## System State
```json
{
  "project_name": "SheetGPT",
  "version": "0.7.1",
  "last_updated": "2025-03-15",
  "environment": {
    "development": "Docker-based",
    "services": ["frontend", "backend", "db"],
    "documentation": ["README.md", "PROGRESS.md", "TECHNICAL_DESCRIPTION.md", "API_ARCHITECTURE.md"]
  },
  "key_components": {
    "frontend": {
      "SportDataMapper": "Maps structured data to sports entities",
      "SportsDatabase": "Manages sports entities with validation",
      "DataTable": "Displays structured data",
      "EntityFilter": "Advanced filtering system",
      "AdvancedEditForm": "Smart entity editing with relationship handling",
      "MessageRepeat": "Allows resending of previous messages",
      "DatabaseStats": "Admin dashboard for database statistics",
      "ChatContext": "Manages chat state with optimized streaming",
      "DataExtraction": "Enhanced extraction services architecture",
      "DatabaseQuery": "Natural language and SQL database querying"
    },
    "backend": {
      "FastAPI": "REST API framework",
      "SQLAlchemy": "ORM for database operations",
      "PostgreSQL": "Primary database",
      "Alembic": "Database migrations",
      "DatabaseManagementService": "Backup, archiving, and statistics",
      "CLITools": "Command-line tools for database management",
      "AnthropicService": "Claude API integration service",
      "LoggingConfig": "Enhanced structured logging system",
      "DatabaseQuerySystem": "SQL and natural language query processing"
    }
  }
}
```

## Current Priorities
```json
{
  "high_priority": [
    {
      "task": "Database Management",
      "focus": [
        "Automated backup scheduling",
        "Backup retention policies",
        "Growth monitoring",
        "Recovery testing",
        "Performance metrics collection"
      ]
    },
    {
      "task": "Data Management",
      "focus": [
        "Entity relationship validation",
        "Data cleanup procedures",
        "Advanced editing improvements",
        "Pagination optimization",
        "Google Sheets export reliability"
      ]
    },
    {
      "task": "Testing Coverage",
      "focus": [
        "Database management features",
        "Message repeat functionality",
        "Pagination implementation",
        "Bulk operations",
        "Entity edit components"
      ]
    },
    {
      "task": "Error Handling",
      "focus": [
        "Field validation",
        "Relationship constraints",
        "User-friendly error messages",
        "Edit form validation",
        "Bulk operation failures",
        "Export functionality fallbacks"
      ]
    }
  ],
  "ongoing_maintenance": [
    "Documentation updates",
    "Performance optimization",
    "Data integrity checks",
    "UI/UX enhancements",
    "Table-based component refinements",
    "Conversation list sorting optimizations",
    "Entity edit improvements",
    "Pagination refinement",
    "Database growth monitoring",
    "Backup verification"
  ]
}
```

## Development Workflow
```json
{
  "setup": {
    "initial": "docker-compose up --build -d",
    "database": "python src/scripts/alembic_wrapper.py upgrade",
    "sample_data": "docker-compose exec backend python src/scripts/create_sample_sports_data.py"
  },
  "database_management": {
    "backup": "python src/scripts/db_management.py backup",
    "stats": "python src/scripts/db_management.py stats",
    "cleanup": "python src/scripts/db_management.py cleanup --older-than=30d"
  },
  "development": {
    "branch_strategy": "feature/{component-name}/{feature-description}",
    "testing": "./run-tests.sh or docker-compose run --rm frontend-test",
    "documentation": "Update relevant .md files"
  }
}
```

## Immediate Focus

For any new agent continuing development:

1. Review current architecture in TECHNICAL_DESCRIPTION.md
2. Focus on high-priority tasks:
   - Database management system monitoring
   - Entity relationship handling
   - Data management scripts
   - Field validation improvements

3. Key areas requiring attention:
   - Database growth patterns
   - Backup scheduling and verification
   - Entity relationship validation
   - Documentation maintenance
   - Test coverage expansion

4. Development guidelines:
   - Maintain data integrity
   - Update documentation
   - Add comprehensive tests
   - Follow dependency order
   - Implement proper validation
   - Use archiving instead of deletion