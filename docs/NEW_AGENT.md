# NEW AGENT INTRODUCTION

## AGENT INTRO SECTION

### Project Overview
SheetGPT is a full-stack application combining AI-powered chat with structured data management and sports database functionality. Key capabilities:
- AI chat for data extraction and structuring
- Tabular data management with column controls
- Sports entity management (leagues, teams, players, etc.)
- Google Sheets export integration
- Message repeat functionality for alternative responses
- Database maintenance and backup system
- Conversation archiving functionality

### Technical Architecture

#### Backend
- FastAPI with SQLAlchemy ORM and PostgreSQL
- JWT authentication with role-based access
- Modular design with isolated services
- Transaction management with session control
- Database backup and management system
- Scheduled task infrastructure

#### Frontend
- React with TypeScript
- React Query for data management
- Advanced DataTable component
- Fixed navigation bar with consistent layout
- Sports database interface with relationship visualization
- Admin dashboard for database management
- Table-based list components with sorting capabilities
- Contextual action buttons for improved UX

### Key Components

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
   - Change history tracking
   - Related entities display

### Current Status (March 2025)

#### Completed Features
- ✅ User authentication and management
- ✅ Chat interface with AI integration
- ✅ Structured data extraction
- ✅ Sports database with comprehensive models
- ✅ Frontend-backend integration
- ✅ Admin functionality
- ✅ Enhanced field mapping visualization
- ✅ Hybrid filtering implementation
- ✅ Bulk operations for entities
- ✅ Advanced entity editing with relationship management
- ✅ Smart dropdowns for entity relationships
- ✅ Message repeat functionality
- ✅ Entity list pagination
- ✅ Bulk delete operations
- ✅ Database management system
- ✅ Conversation archiving functionality
- ✅ Database backup and restore
- ✅ Admin statistics dashboard
- ✅ Claude API integration
- ✅ Conversation reordering
- ✅ Enhanced error handling framework
- ✅ Extraction services architecture

#### In Progress
- 🔄 Google Sheets API backend integration
- 🔄 Sports database API endpoint testing
- 🔄 Frontend component test coverage
- 🔄 Automated database maintenance schedules
- 🔄 Mobile responsive design

### Critical Information

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
   - Brands
   
   Secondary:
   - Teams (requires leagues, stadiums)
   - Stadiums (requires broadcast companies)
   - Players (requires teams)
   
   Relationship:
   - Games (requires teams, stadiums)
   - Broadcast Rights
   - Production Services
   - Brand Relationships
   
   System:
   - Archived Conversations
   - Database Backups
   - Database Statistics

3. **Recent Changes**
   - Refactored large components into modular, focused components following established patterns
   - Implemented feature-based folder structure for complex features with logical organization
     ```
     ComponentName/
     ├── components/      # Child components
     ├── hooks/           # Custom hooks
     ├── utils/           # Helper utilities
     ├── types.ts         # Type definitions
     └── index.tsx        # Main component
     ```
   - Extracted business logic into specialized custom hooks with single responsibility principle
   - Reorganized API client code into domain-specific services for better maintainability
   - Created advanced component organization patterns for consistent codebase
   - Improved type safety with dedicated type files and interfaces
   - Reduced file sizes for better maintainability (from 400-700 lines to under 100 lines per file)
   - Organized backend services into domain-specific modules:
     ```
     service_area/
     ├── specific_service1.py    # Focused responsibility
     ├── specific_service2.py    # Focused responsibility
     └── __init__.py            # Exports service API
     ```
   - Implemented Facade pattern for service coordination
   - Integrated Claude API with robust error handling
   - Implemented fixed navigation bar across the entire application
   - Added conversation sorting by name, date, and manual order
   - Redesigned conversation list with table-based layout
   - Implemented contextual action buttons for selected conversations
   - Created enhanced extraction services architecture 
   - Added structured error handling with error utilities
   - Implemented database management system with backup/restore
   - Added conversation archiving with restore capability
   - Created database statistics dashboard for administrators
   - Built CLI tools for database maintenance
   - Added message repeat functionality to chat interface
   - Implemented entity list pagination with configurable page sizes
   - Added bulk delete functionality for entity management
   - Enhanced Teams Advanced Edit functionality
   - Improved relationship field handling with smart dropdowns
   - Added comprehensive field validation
   - Enhanced edit modal organization
   - Improved type handling for all fields

### Common Issues and Solutions

1. **Database Management**
   - Use CLI tools for manual database operations
   - Schedule backups using cron jobs
   - Archive instead of delete for important data
   - Monitor database growth patterns
   - Use provided restore tools for recovery

2. **Entity Creation**
   - Use name-based references when possible
   - System handles UUID conversion
   - Automatic entity creation for missing references

3. **Validation**
   - Validation occurs before mapping
   - Support for both UUID and name fields
   - Clear error messages for debugging
   - Real-time field validation in forms

4. **Data Import**
   - Batch import with progress tracking
   - Automatic relationship resolution
   - Error aggregation and reporting

5. **Entity Editing**
   - Use AdvancedEditForm for complex entities
   - Handle relationships through dropdowns
   - Implement optimistic updates
   - Provide fallback error handling

### Required Reading
1. TECHNICAL_DESCRIPTION.md - Detailed component documentation
2. SPORTS_API_ENDPOINTS.md - API endpoint specifications
3. API_ARCHITECTURE.md - System architecture details
4. PROGRESS.md - Latest updates and status

### Next Actions
1. Complete Google Sheets integration
2. Enhance test coverage
3. Optimize performance for large datasets
4. Implement advanced search capabilities
5. Add mobile responsiveness
6. Enhance backup automation

### Communication Guidelines
1. Reference files and functions using exact paths
2. Use line numbers for specific code references
3. Follow TypeScript type definitions strictly
4. Maintain documentation consistency

### Error Handling Protocol
1. Check validation layer first
2. Verify entity relationships
3. Review transaction logs
4. Confirm client-side state
5. Validate API responses
6. Check database backup status

This document should be updated with each significant change to maintain accuracy for new agents.

## SYSTEM_STATE
```json
{
  "project_name": "SheetGPT",
  "version": "0.6.0",
  "last_updated": "2025-03-10",
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
      "DataExtraction": "Enhanced extraction services architecture"
    },
    "backend": {
      "FastAPI": "REST API framework",
      "SQLAlchemy": "ORM for database operations",
      "PostgreSQL": "Primary database",
      "Alembic": "Database migrations",
      "DatabaseManagementService": "Backup, archiving, and statistics",
      "CLITools": "Command-line tools for database management",
      "AnthropicService": "Claude API integration service",
      "LoggingConfig": "Enhanced structured logging system"
    }
  }
}
```

## CURRENT_PRIORITIES
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
        "Sample data validation",
        "Entity relationship handling",
        "Data cleanup procedures",
        "Advanced entity editing improvements",
        "Pagination optimization"
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
        "Backup failures"
      ]
    }
  ],
  "ongoing_maintenance": [
    "Documentation updates",
    "Performance optimization",
    "Data integrity checks",
    "UI/UX enhancements",
    "Fixed navigation improvements",
    "Table-based component refinements",
    "Conversation list sorting optimizations",
    "Entity edit improvements",
    "Pagination refinement",
    "Database growth monitoring",
    "Backup verification"
  ]
}
```

## ARCHITECTURE_OVERVIEW
```json
{
  "frontend": {
    "core_components": {
      "Layout": {
        "purpose": "Provides consistent application structure with fixed navigation",
        "key_files": [
          "components/Layout.tsx",
          "components/Navbar.tsx",
          "App.tsx"
        ],
        "features": [
          "Fixed top navigation bar",
          "Consistent padding for content",
          "Responsive layout handling",
          "Route management"
        ]
      },
      "SportDataMapper": {
        "purpose": "Map structured data to sports entities",
        "key_files": [
          "components/data/SportDataMapper/SportDataMapperContainer.tsx",
          "components/data/SportDataMapper/hooks/useFieldMapping.ts",
          "components/data/SportDataMapper/hooks/useDataManagement.ts"
        ]
      },
      "SportsDatabase": {
        "purpose": "Manage sports entities with validation",
        "key_files": [
          "pages/SportsDatabase.tsx",
          "components/sports/EntityList.tsx",
          "components/sports/EntityFilter.tsx",
          "components/sports/Pagination.tsx"
        ]
      },
      "DataTable": {
        "purpose": "Display and manage structured data",
        "key_files": [
          "components/data/DataTable/index.tsx",
          "components/data/DataTable/components/DataGridTable.tsx",
          "components/data/DataTable/components/Pagination.tsx",
          "components/data/DataTable/hooks/useColumnResize.ts",
          "components/data/DataTable/hooks/useDragAndDrop.ts"
        ],
        "features": [
          "Column resizing",
          "Row reordering",
          "Pagination controls",
          "Raw data viewing",
          "Grid expansion",
          "Export capabilities"
        ]
      },
      "Chat": {
        "purpose": "AI-powered chat interface with data extraction",
        "key_files": [
          "pages/ChatPage/index.tsx",
          "pages/ChatPage/components/SidebarWithResizer.tsx",
          "pages/ChatPage/components/ChatContainer.tsx",
          "pages/ChatPage/hooks/useMessages.ts",
          "pages/ChatPage/hooks/useSendMessage.ts"
        ],
        "features": [
          "Message streaming",
          "Data extraction",
          "Message repeat functionality",
          "Delete/Archive messages",
          "Conversation sorting",
          "Contextual actions",
          "Table-based conversation list",
          "Resizable sidebar"
        ]
      },
      "EntityManagement": {
        "purpose": "Advanced entity management with bulk operations",
        "key_files": [
          "components/sports/EntityList.tsx",
          "components/sports/BulkActions.tsx",
          "components/sports/AdvancedEditForm.tsx"
        ],
        "features": [
          "Bulk delete",
          "Pagination",
          "Advanced filtering",
          "Smart relationship handling"
        ]
      },
      "DatabaseManagement": {
        "purpose": "Admin interface for database maintenance",
        "key_files": [
          "pages/Settings.tsx",
          "components/admin/DatabaseStats.tsx",
          "components/admin/BackupManager.tsx"
        ],
        "features": [
          "Database statistics",
          "Backup management",
          "Archiving controls",
          "Performance metrics"
        ]
      }
    },
    "shared_components": {
      "Pagination": {
        "purpose": "Reusable pagination component",
        "key_files": [
          "components/common/Pagination.tsx"
        ],
        "features": [
          "Configurable page sizes",
          "First/last page navigation",
          "Page size selection",
          "Total count display"
        ]
      }
    }
  },
  "backend": {
    "api_routes": {
      "chat": {
        "purpose": "Handle chat operations and message management",
        "endpoints": [
          "/api/v1/chat/conversations",
          "/api/v1/chat/messages",
          "/api/v1/chat/archive"
        ]
      },
      "sports": {
        "purpose": "Manage sports entities with pagination and filtering",
        "endpoints": [
          "/api/v1/sports/entities/{entity_type}",
          "/api/v1/sports/bulk-delete"
        ]
      },
      "db_management": {
        "purpose": "Database administration functionality",
        "endpoints": [
          "/api/v1/db-management/stats",
          "/api/v1/db-management/backups",
          "/api/v1/db-management/archive"
        ]
      }
    },
    "services": {
      "chat_service": {
        "purpose": "Chat and message handling logic",
        "features": [
          "Message storage",
          "Conversation management",
          "Message repeat handling",
          "Archiving integration"
        ]
      },
      "sports_service": {
        "purpose": "Sports entity management",
        "features": [
          "Entity CRUD operations",
          "Bulk operations",
          "Pagination handling",
          "Advanced filtering"
        ]
      },
      "database_management_service": {
        "purpose": "Database maintenance and administration",
        "features": [
          "Backup and restore",
          "Conversation archiving",
          "Statistics collection",
          "Growth monitoring",
          "Performance metrics"
        ]
      }
    }
  }
}
```

## KNOWN_ISSUES
```json
{
  "critical": [
    {
      "issue": "Entity relationship validation",
      "status": "In progress",
      "files": [
        "scripts/create_sample_sports_data.py",
        "models/sports_models.py"
      ]
    },
    {
      "issue": "Test coverage gaps",
      "status": "Addressing",
      "components": [
        "DatabaseManagementService",
        "DataManagementScripts", 
        "EntityRelationshipHandler"
      ]
    }
  ],
  "monitoring": [
    {
      "issue": "Database growth patterns",
      "component": "DatabaseManagementService"
    },
    {
      "issue": "Backup scheduling optimization",
      "component": "ScheduledBackupScript"
    },
    {
      "issue": "Data cleanup procedures",
      "component": "DataManagementScripts"
    },
    {
      "issue": "Field validation performance",
      "component": "SportDataMapper"
    }
  ]
}
```

## DEVELOPMENT_WORKFLOW
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
    "testing": "npm run test",
    "documentation": "Update relevant .md files"
  },
  "deployment": {
    "ci_cd": "GitHub Actions",
    "environments": ["development", "staging", "production"]
  }
}
```

## IMMEDIATE_FOCUS
For any new agent continuing development:

1. Review recent changes in PROGRESS.md
2. Understand current architecture in TECHNICAL_DESCRIPTION.md
3. Focus on high-priority tasks:
   - Database management system monitoring
   - Entity relationship handling
   - Data management scripts
   - Field validation improvements

4. Key areas requiring attention:
   - Database growth patterns
   - Backup scheduling and verification
   - Sample data management
   - Entity relationship validation
   - Documentation maintenance
   - Test coverage expansion

5. Development guidelines:
   - Maintain data integrity
   - Update documentation
   - Add comprehensive tests
   - Follow dependency order
   - Implement proper validation
   - Use archiving instead of deletion

