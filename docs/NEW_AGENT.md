# NEW AGENT INTRODUCTION

## AGENT INTRO SECTION

### Project Overview
SheetGPT is a full-stack application combining AI-powered chat with structured data management and sports database functionality. Key capabilities:
- AI chat for data extraction and structuring
- Tabular data management with column controls
- Sports entity management (leagues, teams, players, etc.)
- Google Sheets export integration

### Technical Architecture

#### Backend
- FastAPI with SQLAlchemy ORM and PostgreSQL
- JWT authentication with role-based access
- Modular design with isolated services
- Transaction management with session control

#### Frontend
- React with TypeScript
- React Query for data management
- Advanced DataTable component
- Sports database interface with relationship visualization

### Key Components

1. **Entity Reference Resolution System**
   - Flexible reference system (UUID/name-based)
   - Validation layer (`validationUtils.ts`)
   - Mapping layer (`mappingUtils.ts`)
   - Automatic entity creation and lookup

2. **SportDataMapper**
   - Field mapping with drag-and-drop
   - Entity type detection
   - Batch import capabilities
   - Progress tracking
   - Record navigation

3. **Advanced Filtering**
   - Hybrid approach (backend/client-side)
   - Multiple filter types and operators
   - Filter persistence
   - Dynamic query building

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

#### In Progress
- 🔄 Google Sheets API backend integration
- 🔄 Sports database API endpoint testing
- 🔄 Error handling improvements
- 🔄 Frontend component test coverage

### Critical Information

1. **Database Schema**
   - All entities use UUID primary keys
   - Strict referential integrity
   - Required fields enforced at database level
   - Relationship tables for many-to-many

2. **Entity Dependencies**
   Primary:
   - Leagues
   - Broadcast Companies
   - Production Companies
   - Brands
   
   Secondary:
   - Teams (requires leagues)
   - Stadiums (requires broadcast companies)
   - Players (requires teams)
   
   Relationship:
   - Games (requires teams, stadiums)
   - Broadcast Rights
   - Production Services
   - Brand Relationships

3. **Recent Changes**
   - Enhanced name-based entity references
   - Improved validation order
   - Fixed bulk operations
   - Updated field mapping visualization

### Common Issues and Solutions

1. **Entity Creation**
   - Use name-based references when possible
   - System handles UUID conversion
   - Automatic entity creation for missing references

2. **Validation**
   - Validation occurs before mapping
   - Support for both UUID and name fields
   - Clear error messages for debugging

3. **Data Import**
   - Batch import with progress tracking
   - Automatic relationship resolution
   - Error aggregation and reporting

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

This document should be updated with each significant change to maintain accuracy for new agents.

## SYSTEM_STATE
```json
{
  "project_name": "SheetGPT",
  "version": "0.3.8",
  "last_updated": "2025-03-03",
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
      "EntityFilter": "Advanced filtering system"
    },
    "backend": {
      "FastAPI": "REST API framework",
      "SQLAlchemy": "ORM for database operations",
      "PostgreSQL": "Primary database",
      "Alembic": "Database migrations"
    }
  }
}
```

## CURRENT_PRIORITIES
```json
{
  "high_priority": [
    {
      "task": "Data Management",
      "focus": [
        "Sample data validation",
        "Entity relationship handling",
        "Data cleanup procedures"
      ]
    },
    {
      "task": "Testing Coverage",
      "focus": [
        "Data management scripts",
        "Entity relationship handling",
        "Validation procedures"
      ]
    },
    {
      "task": "Error Handling",
      "focus": [
        "Field validation",
        "Relationship constraints",
        "User-friendly error messages"
      ]
    }
  ],
  "ongoing_maintenance": [
    "Documentation updates",
    "Performance optimization",
    "Data integrity checks",
    "UI/UX enhancements"
  ]
}
```

## ARCHITECTURE_OVERVIEW
```json
{
  "frontend": {
    "core_components": {
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
          "components/sports/EntityFilter.tsx",
          "components/sports/EntityList.tsx"
        ]
      }
    }
  },
  "backend": {
    "core_services": {
      "sports_service": {
        "purpose": "Handle sports entity operations",
        "key_files": [
          "services/sports_service.py",
          "models/sports_models.py",
          "scripts/create_sample_sports_data.py",
          "scripts/delete_sample_sports_data.py"
        ]
      },
      "data_service": {
        "purpose": "Manage structured data",
        "key_files": [
          "services/data_service.py",
          "models/data.py",
          "api/routes/data.py"
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
      "components": ["DataManagementScripts", "EntityRelationshipHandler"]
    }
  ],
  "monitoring": [
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
   - Entity relationship handling
   - Data management scripts
   - Field validation improvements

4. Key areas requiring attention:
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

