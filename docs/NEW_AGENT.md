# SheetGPT Project Status for New Agent

## AGENT_INTRO
Welcome to the SheetGPT project! This document provides essential information for new AI agents to quickly understand and continue development. Please review in the following order:

1. **Core Documentation Review**:
   - This file (NEW_AGENT.md) - Quick start and current status
   - PROGRESS.md - Detailed progress and recent changes
   - TECHNICAL_DESCRIPTION.md - Architecture and implementation details
   - API_ARCHITECTURE.md - API design and endpoints

2. **Project Overview**: 
   - Full-stack application combining AI chat, data management, and sports database
   - Tech Stack: React/TypeScript frontend, FastAPI/PostgreSQL backend
   - Key Features: AI chat, data extraction, sports entity management, data export
   - Development Environment: Docker-based with hot reloading

3. **Current Development Focus**:
   - Field mapping improvements for sports data
   - Advanced filtering system for sports database
   - Data visualization enhancements
   - Google Sheets export integration
   - Performance optimization for large datasets

4. **Critical Components**:
   - SportDataMapper: Maps structured data to sports entities
   - SportsDatabase: Manages sports-related entities
   - DataTable: Displays and manages structured data
   - EntityFilter: Handles advanced filtering

5. **Recent Major Changes**:
   - Enhanced field mapping visualization
   - Implemented hybrid filtering system
   - Fixed mapping direction issues
   - Added bulk delete functionality
   - Improved field view system

## SYSTEM_STATE
```json
{
  "project_name": "SheetGPT",
  "version": "0.3.6",
  "last_updated": "2024-06-01",
  "environment": {
    "development": "Docker-based",
    "services": ["frontend", "backend", "db"],
    "documentation": ["README.md", "PROGRESS.md", "TECHNICAL_DESCRIPTION.md", "API_ARCHITECTURE.md"]
  },
  "key_components": {
    "frontend": {
      "SportDataMapper": "Maps structured data to sports entities",
      "SportsDatabase": "Manages sports entities",
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
      "task": "Field Mapping Improvements",
      "focus": [
        "Mapping direction consistency",
        "Value display in mappings",
        "Error handling during mapping"
      ]
    },
    {
      "task": "Advanced Filtering",
      "focus": [
        "Hybrid filtering implementation",
        "Filter persistence",
        "Performance optimization"
      ]
    },
    {
      "task": "Data Visualization",
      "focus": [
        "Sports statistics visualization",
        "Interactive charts",
        "Performance metrics"
      ]
    }
  ],
  "ongoing_maintenance": [
    "Documentation updates",
    "Test coverage expansion",
    "Performance optimization",
    "Error handling improvements"
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
        "purpose": "Manage sports entities",
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
          "models/sports.py",
          "api/routes/sports.py"
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
      "issue": "Mapping direction inconsistency",
      "status": "In progress",
      "files": [
        "SportDataMapper/hooks/useFieldMapping.ts",
        "SportDataMapper/components/DroppableField.tsx"
      ]
    },
    {
      "issue": "Performance with large datasets",
      "status": "Investigating",
      "components": ["DataTable", "SportsDatabase"]
    }
  ],
  "monitoring": [
    {
      "issue": "Memory usage in data transformation",
      "component": "SportDataMapper"
    },
    {
      "issue": "Filter query optimization",
      "component": "SportsDatabase"
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
    "frontend_deps": "docker-compose exec frontend npm install"
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
   - Field mapping improvements
   - Advanced filtering implementation
   - Data visualization enhancements

4. Key areas requiring attention:
   - Mapping direction consistency
   - Filter performance optimization
   - Data transformation efficiency
   - Documentation maintenance

5. Development guidelines:
   - Maintain modular architecture
   - Update documentation
   - Add comprehensive tests
   - Consider performance implications

