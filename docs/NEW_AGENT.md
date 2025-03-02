# SheetGPT Project Status for New Agent

## AGENT_INTRO
```
Welcome to the SheetGPT project! This document will help you quickly understand the current state of the project and what needs to be done next. Follow these steps to get up to speed:

1. **Project Overview**: 
   - SheetGPT is a full-stack application combining AI chat capabilities with structured data management and a sports database
   - The application extracts structured data from AI conversations, allows data manipulation, and supports sports entity management
   - Key components include: authentication system, chat interface, data management, sports database, and export functionality
   - The project uses a React/TypeScript frontend with FastAPI/SQLAlchemy/PostgreSQL backend, all containerized with Docker

2. **Current Focus**:
   - We're currently focused on improving the SportsDatabase component with enhanced viewing, querying, and filtering capabilities
   - Recently implemented pagination for large datasets in the DataTable component
   - Added server-side pagination support with skip/limit parameters in the API
   - Fixed testing infrastructure for the SportDataMapper component and related hooks
   - Enhanced entity detail view with comprehensive information display
   - Added Fields View to display available fields for each entity type with required status and descriptions
   - Implemented sorting functionality across various views in the SportsDatabase component
   - Fixed stadium capacity parsing to handle formatted numbers (e.g., "20,500" → 20500)
   - Improved drag and drop functionality in the SportDataMapper component

3. **Key Files to Review**:
   - `docs/PROGRESS.md` - Contains detailed progress information and recent fixes
   - `docs/API_ARCHITECTURE.md` - Explains the API architecture and endpoints
   - `docs/TECHNICAL_DESCRIPTION.md` - Provides technical details of major code sections
   - `frontend/src/components/data/DataTable.tsx` - The main component for displaying structured data with pagination
   - `frontend/src/utils/api.ts` - Contains API client methods including the getRows method for pagination
   - `frontend/src/pages/SportsDatabase.tsx` - The main component for viewing and managing sports entities
   - `frontend/src/pages/EntityDetail.tsx` - Component for displaying detailed entity information
   - `frontend/src/components/data/SportDataMapper.tsx` - Component for mapping structured data to sports entities
   - `frontend/src/services/SportsDatabaseService.ts` - Service for interacting with the sports database API
   - `frontend/src/jest-setup.ts` - Contains mocks for testing, including @headlessui/react components

4. **Development Environment**:
   - The project uses Docker for development with volume mounts for hot reloading
   - Frontend: React with TypeScript, React Query, and react-dnd for drag and drop
   - Backend: FastAPI with SQLAlchemy ORM and PostgreSQL
   - Start with `docker-compose up --build -d` to set up the development environment
   - Testing: Jest with React Testing Library for frontend components
   - Common commands are documented in the PROGRESS.md file under "Development Workflow"

5. **Current Challenges**:
   - Completing Google Sheets export backend integration
   - Implementing advanced filtering capabilities for sports database entities
   - Enhancing data visualization for sports statistics
   - Standardizing data transformation process across components
   - Improving test coverage for frontend and backend components
   - Technical debt in the SportDataMapper component that needs refactoring
   - Optimizing performance for very large datasets (pagination is now implemented)

6. **Entity Relationships**:
   - Understand that Leagues and Stadiums are foundation entities that should be created first
   - Teams depend on Leagues and Stadiums
   - Players depend on Teams
   - Games depend on Teams, Leagues, and Stadiums
   - Other entities have various dependencies on these foundation entities
   - The SportDataMapper component helps users map structured data to these entity types

7. **Data Flow Architecture**:
   - Chat → Structured Data → Data Management → Sports Database → Export
   - SportDataMapper bridges the gap between structured data and sports database entities
   - Multiple data formats are supported with comprehensive transformation logic
   - Entity detection helps recommend appropriate entity types based on data fields
   - Drag-and-drop interface allows mapping source fields to target entity fields

8. **Testing Infrastructure**:
   - Jest with React Testing Library for frontend components
   - Enhanced mocks for @headlessui/react components in jest-setup.ts
   - Custom render functions for components with complex dependencies
   - Comprehensive mocking for React DnD and other external libraries
   - Test challenges and solutions documented in TECHNICAL_DESCRIPTION.md

When continuing development, prioritize:
1. Implementing advanced filtering capabilities for sports database entities
2. Enhancing data visualization for sports statistics
3. Creating more efficient data retrieval mechanisms for large datasets
4. Completing Google Sheets export backend integration
5. Expanding test coverage for frontend and backend components
6. Refactoring the SportDataMapper component for better maintainability

The code is well-structured but has some technical debt in the SportDataMapper component that needs refactoring for better organization. Focus on improving the user experience while maintaining the existing architecture. Refer to the "IMMEDIATE_TASKS" section for specific tasks that need attention.
```

## SYSTEM_STATE
```json
{
  "project_name": "SheetGPT",
  "version": "0.3.5",
  "last_updated": "2024-05-28",
  "environment": {
    "development": "Docker-based",
    "services": ["frontend", "backend", "db"],
    "volumes": {
      "frontend": "./frontend:/app",
      "node_modules": "/app/node_modules",
      "backend": ".:/app",
      "credentials": "./credentials:/app/credentials",
      "postgres_data": "sheetgpt_postgres_data"
    }
  },
  "dependencies": {
    "frontend": {
      "react": "^18.3.1",
      "react-query": "^5.8.4",
      "react-icons": "^4.12.0",
      "react-dnd": "^16.0.1",
      "react-dnd-html5-backend": "^16.0.1",
      "react-markdown": "latest",
      "date-fns": "latest",
      "uuid": "^11.1.0",
      "@types/uuid": "^10.0.0"
    },
    "backend": {
      "fastapi": "latest",
      "sqlalchemy": "latest",
      "alembic": "latest",
      "postgresql": "15"
    }
  }
}
```

## DEVELOPMENT_STATUS
```json
{
  "completed_features": [
    "Authentication system with JWT",
    "Chat interface with conversation management",
    "Structured data extraction from chat",
    "Data management interface with grid view",
    "Row-based data structure implementation",
    "Drag-and-drop functionality for rows/columns",
    "Cell editing in data grid",
    "Raw data preview toggle",
    "Enhanced 'Send to Data' feature with robust error handling",
    "Automatic cleanup of duplicate data entries",
    "Improved data verification process",
    "Better user feedback during data processing",
    "Column resizing with direct width updates",
    "Grid expansion with dynamic height adjustment",
    "Export to Sheets UI implementation",
    "Sports database models and API endpoints",
    "Backend services for sports entities management",
    "Authentication utility functions",
    "Sport Data Mapper button integration",
    "Optimized UI button styling for better visibility",
    "Enhanced SportDataMapper component with improved navigation controls",
    "Fixed record loading in SportDataMapper to properly handle all records",
    "Fixed drag and drop functionality in SportDataMapper",
    "Added guidance for League and Stadium entity types in SportDataMapper",
    "Improved entity type detection in SportDataMapper",
    "Enhanced source field extraction with values for better entity type detection",
    "Added Fields View to SportsDatabase page to display available fields for each entity type",
    "Enhanced stadium capacity parsing to handle formatted numbers",
    "Implemented sorting functionality in SportsDatabase views",
    "Improved button text for better user experience",
    "Enhanced entity detail view with comprehensive information display",
    "Fixed testing infrastructure for SportDataMapper component and related hooks",
    "Implemented pagination for large datasets in DataTable component",
    "Added server-side pagination support with skip/limit parameters in the API",
    "Added CI/CD Pipeline with GitHub Actions including scheduled nightly tests"
  ],
  "in_progress": [
    "Google Sheets API backend integration",
    "Data transformation debugging and enhancement",
    "Performance optimization for very large datasets",
    "Testing sports database API endpoints",
    "Implementing comprehensive error handling for API operations",
    "Optimizing database queries for sports entities",
    "Implementing advanced filtering capabilities for sports database entities",
    "Enhancing data visualization for sports statistics"
  ],
  "recent_fixes": [
    "Implemented pagination for large datasets in DataTable component",
    "Added server-side pagination support with skip/limit parameters in the API",
    "Added pagination controls with first, previous, next, and last page navigation",
    "Implemented rows-per-page selector (10, 25, 50, 100 options)",
    "Fixed drag and drop functionality in SportDataMapper by correcting type mismatch between useDrag and useDrop hooks",
    "Removed 'Drop here to map' text from target fields while maintaining visual indicators",
    "Added guidance for League and Stadium entity types with minimum required fields and progress tracking",
    "Fixed entity type detection by adding sourceFieldValues state to store field values for detection",
    "Enhanced entity type detection to check both field names and values",
    "Fixed detection of Stadium entity type based on field names and values",
    "Added fallback entity type selection to prevent blank state",
    "Fixed field extraction to properly handle different data formats",
    "Enhanced UI with better visual feedback for drag and drop operations",
    "Fixed SportDataMapper navigation controls to always be visible regardless of record count",
    "Enhanced SportDataMapper styling with blue color scheme for better visibility",
    "Fixed record loading in SportDataMapper to properly handle all records in structured data",
    "Added Fields View to SportsDatabase page to display available fields for each entity type",
    "Enhanced stadium capacity parsing to handle formatted numbers (e.g., '20,500' → 20500)",
    "Implemented sorting functionality in SportsDatabase views",
    "Improved button text for better user experience",
    "Fixed testing infrastructure for SportDataMapper component by enhancing @headlessui/react mocks",
    "Updated test expectations in SportDataMapperContainer.test.tsx to match actual component behavior",
    "Fixed entityDetection tests to align with actual implementation behavior"
  ],
  "known_issues": [
    "Linter errors for react-icons/fa (can be ignored in Docker environment)",
    "Performance issues with very large datasets (pagination helps but further optimization needed)",
    "Missing pagination for conversations",
    "Export functionality backend integration not complete",
    "Data transformation inconsistencies between components",
    "Lack of comprehensive error handling in API endpoints",
    "Missing unit and integration tests for backend services",
    "Potential race conditions in asynchronous operations"
  ]
}
```

## ARCHITECTURE_NOTES
```json
{
  "data_flow": {
    "chat_to_data": {
      "1": "User sends message to AI in chat interface",
      "2": "AI responds with structured data (JSON format)",
      "3": "User clicks 'Send to Data' button",
      "4": "System checks for existing data by message ID",
      "5": "DataExtractionService extracts and transforms data",
      "6": "System verifies data creation success",
      "7": "Data is stored in database with metadata",
      "8": "System waits for backend processing to complete",
      "9": "User is navigated to data management page",
      "10": "Data is displayed in Data Grid component"
    },
    "data_transformation": {
      "formats_supported": [
        "Row-oriented with headers and rows arrays",
        "Column-oriented (Google Sheets format)",
        "Flat objects array",
        "Special Table Data format",
        "Nested data structures"
      ],
      "transformation_logic": "extractStructuredData helper function in MessageThread.tsx handles data extraction and standardization before sending to backend",
      "debugging": "Comprehensive logging added throughout transformation process to track data flow and identify issues"
    },
    "sport_data_mapping": {
      "1": "User clicks 'Map Sports Data' button on a message with structured data",
      "2": "SportDataMapper component extracts source fields and values from structured data",
      "3": "System recommends entity type based on source fields and values",
      "4": "User selects entity type (team, player, league, etc.)",
      "5": "System loads entity fields for the selected type",
      "6": "User maps source fields to entity fields using drag-and-drop",
      "7": "User navigates through records using navigation controls",
      "8": "User can exclude specific records from import",
      "9": "User saves mapped data to database",
      "10": "System processes batch import and provides feedback"
    },
    "sportsdatabase_views": {
      "1": "User navigates to SportsDatabase page",
      "2": "User selects entity type (league, team, player, etc.)",
      "3": "System loads entities of selected type",
      "4": "User can toggle between Entity View, Global View, and Fields View",
      "5": "Entity View shows entities in a table with actions",
      "6": "Global View shows counts and last updated timestamps for all entity types",
      "7": "Fields View displays available fields for each entity type with required status and descriptions",
      "8": "User can sort entities by clicking on column headers",
      "9": "User can view entity details by clicking on the view details button"
    },
    "pagination": {
      "1": "DataTable component automatically enables pagination when row count exceeds page size",
      "2": "Frontend sends skip and limit parameters to backend API",
      "3": "Backend returns paginated data with total count information",
      "4": "UI displays current page, total pages, and navigation controls",
      "5": "User can navigate between pages and change rows per page",
      "6": "Row numbering is maintained correctly across pages"
    }
  },
  "component_architecture": {
    "DataTable": {
      "features": [
        "Data transformation with centralized transformer",
        "Pagination with client-side and server-side support",
        "Column management (resize, reorder, visibility)",
        "Row management (reorder, numbering)",
        "UI flexibility (expand/collapse, resize)",
        "Export functionality"
      ],
      "pagination": {
        "automatic_detection": "Based on row count exceeding page size",
        "rows_per_page_options": [10, 25, 50, 100],
        "navigation_controls": ["first", "previous", "next", "last"],
        "api_integration": "Uses getRows method with skip/limit parameters"
      }
    },
    "SportDataMapper": {
      "refactoring_status": "In progress - extracting smaller components and custom hooks",
      "extracted_components": [
        "FieldHelpTooltip",
        "FieldItem",
        "GuidedWalkthrough"
      ],
      "custom_hooks": [
        "useFieldMapping",
        "useRecordNavigation",
        "useImportProcess",
        "useUiState",
        "useDataManagement"
      ],
      "utility_modules": [
        "entityTypes.ts",
        "entityDetection.ts",
        "validationUtils.ts",
        "mappingUtils.ts",
        "uiUtils.ts"
      ]
    }
  }
}
```

## DOCKER_WORKFLOW
```json
{
  "development": {
    "setup": "docker-compose up --build -d",
    "code_changes": "Changes to source files are automatically detected by volume mounts",
    "hot_reload": "Frontend uses Vite with HMR, backend uses uvicorn with --reload flag",
    "dependencies": "Add to package.json/requirements.txt and rebuild containers or install within container",
    "commands": {
      "install_frontend_dep": "docker-compose exec frontend npm install [package-name]",
      "run_migrations": "docker-compose exec backend alembic upgrade head",
      "database_access": "docker-compose exec db psql -U postgres -d sheetgpt",
      "restart_frontend": "docker-compose restart frontend",
      "clean_database": "Use the admin interface in Settings page",
      "set_user_as_admin": "docker-compose exec backend python src/scripts/set_admin.py <email>"
    }
  },
  "troubleshooting": {
    "frontend_issues": [
      "Refresh browser first (Ctrl+Shift+R for hard refresh)",
      "Check browser console for errors",
      "Restart frontend container: docker-compose restart frontend",
      "Check volume mounts are working correctly",
      "Look for npm errors during restart (usually normal part of shutdown)"
    ],
    "backend_issues": [
      "Check logs: docker-compose logs -f backend",
      "Verify database connection",
      "Check API responses in browser network tab",
      "Restart backend: docker-compose restart backend"
    ],
    "data_issues": [
      "Check browser console for data transformation logs",
      "Verify data structure in raw data view",
      "Check for race conditions in asynchronous operations",
      "Verify proper state management in data store",
      "Look for detailed logs added to transformData function"
    ],
    "drag_and_drop_issues": [
      "Check browser console for drag and drop debug logs",
      "Verify ItemType constant matches in useDrag and useDrop hooks",
      "Check that ref is properly applied to draggable/droppable elements",
      "Verify onDrop callback is being passed correctly",
      "Ensure DndProvider is wrapping the component correctly"
    ],
    "numeric_parsing_issues": [
      "Check for non-numeric characters in input values",
      "Verify regex pattern for cleaning numeric values",
      "Check parseInt or Number conversion logic",
      "Look for logs related to capacity parsing",
      "Test with various formatted numbers (e.g., '20,500', '1.5M')"
    ]
  }
}
```

## IMMEDIATE_TASKS
```json
{
  "high_priority": [
    {
      "task": "Complete Google Sheets export backend integration",
      "description": "Finish implementing the backend API for exporting data to Google Sheets",
      "files": [
        "backend/src/services/sheets_service.py",
        "backend/src/api/routes/export.py",
        "frontend/src/components/data/ExportDialog.tsx"
      ],
      "steps": [
        "Implement Google Sheets API authentication",
        "Create sheet creation and data writing functions",
        "Add error handling and retry logic",
        "Implement progress tracking for large exports",
        "Update frontend to handle export responses"
      ]
    },
    {
      "task": "Implement advanced filtering for sports database entities",
      "description": "Add filtering capabilities to the SportsDatabase component",
      "files": [
        "frontend/src/pages/SportsDatabase.tsx",
        "frontend/src/components/sports/EntityFilter.tsx",
        "backend/src/api/routes/sports.py",
        "backend/src/services/sports_service.py"
      ],
      "steps": [
        "Create EntityFilter component with filter controls",
        "Update backend API to support filtering parameters",
        "Implement filter state management in SportsDatabase",
        "Add UI for selecting and applying filters",
        "Ensure filter persistence across page navigation"
      ]
    },
    {
      "task": "Complete SportDataMapper component refactoring",
      "description": "Finish the refactoring of the SportDataMapper component",
      "files": [
        "frontend/src/components/data/SportDataMapper/SportDataMapperContainer.tsx",
        "frontend/src/components/data/SportDataMapper/hooks/*.ts",
        "frontend/src/components/data/SportDataMapper/utils/*.ts",
        "frontend/src/components/data/SportDataMapper/components/*.tsx"
      ],
      "steps": [
        "Complete UI implementation in SportDataMapperContainer",
        "Update original SportDataMapper to use new structure",
        "Add tests for new components and utility functions",
        "Update documentation to reflect new architecture"
      ]
    }
  ],
  "medium_priority": [
    {
      "task": "Enhance data visualization for sports statistics",
      "description": "Add charts and graphs for visualizing sports data",
      "files": [
        "frontend/src/components/sports/DataVisualization.tsx",
        "frontend/src/pages/EntityDetail.tsx"
      ]
    },
    {
      "task": "Optimize database queries for sports entities",
      "description": "Improve performance of database queries for sports entities",
      "files": [
        "backend/src/services/sports_service.py",
        "backend/src/models/sports.py"
      ]
    },
    {
      "task": "Add pagination for conversations",
      "description": "Implement pagination for the conversation list",
      "files": [
        "frontend/src/components/chat/ConversationList.tsx",
        "backend/src/api/routes/chat.py"
      ]
    }
  ],
  "low_priority": [
    {
      "task": "Improve error handling in API endpoints",
      "description": "Add comprehensive error handling to all API endpoints",
      "files": [
        "backend/src/api/routes/*.py",
        "frontend/src/utils/api.ts"
      ]
    },
    {
      "task": "Add unit tests for backend services",
      "description": "Increase test coverage for backend services",
      "files": [
        "backend/tests/services/*.py"
      ]
    }
  ]
}
```

## RECENT_CHANGES
```json
{
  "pagination_implementation": {
    "date": "2024-05-28",
    "description": "Implemented pagination for large datasets in the DataTable component",
    "files_changed": [
      "frontend/src/components/data/DataTable.tsx",
      "frontend/src/utils/api.ts",
      "docs/PROGRESS.md",
      "docs/TECHNICAL_DESCRIPTION.md"
    ],
    "key_changes": [
      "Added pagination state management (current page, rows per page, total rows)",
      "Implemented automatic pagination detection based on dataset size",
      "Added pagination controls with first, previous, next, and last page navigation",
      "Integrated with the backend pagination API",
      "Maintained correct row numbering across pages",
      "Added a rows-per-page selector (10, 25, 50, 100 options)",
      "Added the getRows method to the API client to fetch paginated data",
      "Implemented proper TypeScript interfaces for the paginated data response",
      "Updated documentation to reflect the pagination implementation"
    ],
    "benefits": [
      "Performance Improvement: Reduces the amount of data transferred and rendered at once",
      "Better User Experience: Users can navigate through large datasets more easily",
      "Scalability: The application can now handle datasets of any size without performance degradation",
      "Flexibility: Users can choose how many rows to display per page based on their preferences"
    ]
  },
  "ci_cd_pipeline": {
    "date": "2024-05-24",
    "description": "Added scheduled nightly tests to the CI/CD pipeline",
    "files_changed": [
      ".github/workflows/nightly-tests.yml",
      "docs/CI_CD_PIPELINE.md",
      "README.md",
      "docs/PROGRESS.md"
    ],
    "key_changes": [
      "Created a new GitHub Actions workflow for nightly tests",
      "Set up automatic issue creation for test failures",
      "Added comprehensive documentation for the CI/CD process",
      "Updated README with information about the CI/CD pipeline"
    ]
  }
}
```

## CURRENT_FOCUS
```json
{
  "main_focus": "Enhancing the SportsDatabase component with improved viewing, querying, and data extraction capabilities",
  "key_areas": [
    "Advanced filtering capabilities for sports database entities",
    "Data visualization for sports statistics",
    "Efficient data retrieval for large datasets",
    "Pagination for large entity lists",
    "Comprehensive error handling for API operations",
    "Expanding test coverage for frontend components"
  ],
  "next_steps": [
    "Implement advanced filtering capabilities for entities",
    "Add pagination for large entity lists",
    "Enhance sorting with multi-column support",
    "Implement search functionality across all entity types",
    "Add export options for filtered entity lists",
    "Continue improving test coverage for components"
  ],
  "technical_debt": [
    "Refactor SportDataMapper component for better code organization",
    "Add comprehensive unit tests for drag and drop functionality",
    "Improve error handling during batch import process",
    "Standardize field mapping logic across the application",
    "Enhance documentation for SportDataMapper component",
    "Improve test mocking for external libraries"
  ]
}
```

## BACKEND_STRUCTURE
```json
{
  "api_routes": {
    "auth.py": "Authentication endpoints for registration, login, and user info",
    "sports.py": "Comprehensive endpoints for sports entities management",
    "export.py": "Endpoints for exporting data to Google Sheets",
    "data_management.py": "Endpoints for structured data operations",
    "chat.py": "Endpoints for conversation and message management"
  },
  "services": {
    "sports_service.py": "Business logic for sports entities CRUD operations",
    "export_service.py": "Logic for exporting data to external systems",
    "export/sheets_service.py": "Google Sheets API integration",
    "user.py": "User management operations"
  },
  "models": {
    "sports_models.py": "Database models for sports entities",
    "user.py": "User authentication models",
    "chat.py": "Conversation and message models",
    "data.py": "Structured data models"
  },
  "utils": {
    "auth.py": "Authentication utility functions",
    "security.py": "Security-related functions for JWT and password hashing",
    "database.py": "Database connection and session management",
    "config.py": "Application configuration"
  }
}
```

## TROUBLESHOOTING_GUIDE
```json
{
  "common_backend_errors": {
    "ModuleNotFoundError": {
      "description": "Python cannot find a module that is being imported",
      "possible_causes": [
        "Incorrect import path",
        "Missing module installation",
        "Module in wrong directory"
      ],
      "solutions": [
        "Check import statements for correct paths",
        "Verify module exists in the specified location",
        "Install missing dependencies",
        "Create missing utility modules"
      ]
    },
    "UUID_serialization_errors": {
      "description": "Issues with UUID handling in database models",
      "possible_causes": [
        "Using UUID instead of SQLUUID type",
        "Incorrect UUID conversion in services"
      ],
      "solutions": [
        "Use SQLUUID type from sqlalchemy.dialects.postgresql",
        "Convert UUID to string when serializing to JSON",
        "Ensure proper UUID handling in service methods"
      ]
    },
    "Authentication_errors": {
      "description": "Issues with user authentication",
      "possible_causes": [
        "Missing or expired JWT token",
        "Incorrect token validation",
        "Missing authentication utilities"
      ],
      "solutions": [
        "Check token generation and validation",
        "Verify auth.py utility is properly implemented",
        "Ensure get_current_user function is available"
      ]
    }
  },
  "sport_data_mapper_issues": {
    "navigation_controls_not_visible": {
      "description": "Navigation controls not visible when totalRecords <= 1",
      "possible_causes": [
        "Conditional rendering based on totalRecords",
        "CSS visibility issues",
        "Component state not properly updated"
      ],
      "solutions": [
        "Remove conditional rendering based on totalRecords",
        "Check CSS visibility properties",
        "Verify component state is properly updated"
      ]
    },
    "record_loading_issues": {
      "description": "Only 1 out of multiple records loading correctly",
      "possible_causes": [
        "Incorrect data format detection",
        "Issues with extractSourceFields function",
        "Problems with getFieldValue function"
      ],
      "solutions": [
        "Update extractSourceFields to handle different data formats",
        "Enhance getFieldValue to correctly retrieve values",
        "Add logging to track record access and data processing"
      ]
    },
    "capacity_parsing_issues": {
      "description": "Stadium capacity parsing truncated at first non-numeric character",
      "possible_causes": [
        "Using parseInt without cleaning input",
        "Commas or other formatting characters in capacity values"
      ],
      "solutions": [
        "Add regex to remove non-numeric characters before parsing",
        "Use String(value).replace(/[^\d.]/g, '') to clean input",
        "Test with various formatted numbers"
      ]
    },
    "testing_issues": {
      "description": "Test failures due to incomplete mocking or mismatched expectations",
      "possible_causes": [
        "Incomplete mocking of external libraries",
        "Test expectations not matching actual component behavior",
        "Missing mock implementations for component subcomponents"
      ],
      "solutions": [
        "Enhance mocks in jest-setup.ts to include all necessary components",
        "Update test expectations to match actual rendered content",
        "Use screen.debug() to see actual rendered content",
        "Check for text split across multiple elements",
        "Use more specific selectors in tests"
      ]
    }
  }
}
```

## DOCUMENTATION_RESOURCES
```json
{
  "project_documentation": {
    "README.md": "Project overview, setup instructions, and general information",
    "API_ARCHITECTURE.md": "Detailed description of the API architecture and endpoints",
    "TECHNICAL_DESCRIPTION.md": "Technical description of major code sections",
    "PROGRESS.md": "Up-to-date progress summaries across all major sections of code"
  },
  "testing_documentation": {
    "frontend/src/components/data/SportDataMapper/__tests__/README.md": "Documentation for SportDataMapper component tests",
    "jest-setup.ts": "Configuration and mocks for Jest testing environment",
    "test_challenges": [
      "Text split across multiple elements requiring custom matchers",
      "Multiple elements with same role requiring specific selection",
      "Complex UI libraries requiring comprehensive mocking"
    ],
    "mocking_approach": {
      "@headlessui/react": "Mocked with simplified implementations of Dialog, Transition, Menu, and Listbox components",
      "react-dnd": "Mocked with simplified implementations of useDrag, useDrop, and DndProvider"
    }
  },
  "key_documentation_updates": {
    "recent_updates": [
      "Added Fields View details to TECHNICAL_DESCRIPTION.md",
      "Updated PROGRESS.md with recent improvements to SportsDatabase component",
      "Enhanced API_ARCHITECTURE.md with information about frontend integration",
      "Updated README.md with recent improvements section",
      "Added stadium capacity parsing fix to PROGRESS.md",
      "Added testing infrastructure improvements to NEW_AGENT.md"
    ],
    "documentation_focus": "Ensure all documentation is concise, current, and free of outdated information"
  }
}
```

