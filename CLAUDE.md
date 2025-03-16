# SheetGPT Development Guide

## Build/Test/Lint Commands

### Docker Environment
- Start all services: `docker-compose up`
- Start specific service: `docker-compose up backend` or `docker-compose up frontend`
- Rebuild containers: `docker-compose build`
- Rebuild single container: `docker-compose build frontend` or `docker-compose build backend`

### Backend (Python)
- Run server: `docker-compose up backend`
- Lint: `docker-compose run --rm backend bash -c "black . && isort . && flake8"`
- Type check: `docker-compose run --rm backend mypy`
- Run tests: `docker-compose run --rm backend pytest` or for specific tests: `docker-compose run --rm backend pytest tests/path/to/test_file.py::TestClass::test_function`
- Apply migrations: `docker-compose run --rm backend python src/scripts/alembic_wrapper.py upgrade`
- Generate migration: `docker-compose run --rm backend python src/scripts/alembic_wrapper.py revision --autogenerate -m "migration_name"`

### Frontend (React/TypeScript)
- Run dev server: `docker-compose up frontend`
- Run tests: `./run-tests.sh` or `docker-compose run --rm frontend-test`
- Run specific test: `docker-compose run --rm frontend-test npm test -- --testPathPattern=ComponentName`
- Lint: `docker-compose run --rm frontend npm run lint`
- TypeCheck: `docker-compose run --rm frontend npm run typecheck`

### Database Management
- Run backup: `python src/scripts/db_management.py backup`
- View statistics: `python src/scripts/db_management.py stats`
- Cleanup old data: `python src/scripts/db_management.py cleanup --older-than=30d`
- Restore backup: `python src/scripts/db_management.py restore --file=backup_20250309.sql`
- Archive conversation: `python src/scripts/db_management.py archive --conversation-id=12345`
- Scheduled backup: `python src/scripts/scheduled_backup.py`
- Reset conversation order: `python src/scripts/db_management.py reset-order --user-id=user_uuid`

## Code Style

### General Guidelines
- Python: Black formatter (88 char line length), strict typing with MyPy
- TypeScript: Functional components and hooks, descriptive variable names
- Use early returns for readability
- handleX prefix for event handlers (e.g., `handleSubmit`, `handleClick`)
- Prefer const arrow functions over function declarations
- Always use proper typing (avoid 'any')
- Use TailwindCSS for styling; avoid CSS files when possible
- Follow proper error handling patterns with try/catch blocks
- Components should follow single responsibility principle
- Use index files to simplify imports and provide a clean API

### Component Organization
- Follow modular approach with folder structure: 
  ```
  ComponentName/
  ├── index.tsx              # Main component with minimal logic
  ├── components/            # Sub-components
  │   ├── SubComponentA.tsx
  │   ├── SubComponentB.tsx
  │   └── index.ts           # Exports all components
  ├── hooks/                 # Component-specific hooks
  │   ├── useFeatureState.ts
  │   ├── useFeatureActions.ts
  │   └── index.ts           # Exports all hooks  
  ├── utils/                 # Component-specific utilities
  │   ├── featureUtils.ts
  │   ├── validation.ts
  │   └── index.ts           # Exports all utilities
  └── types.ts               # Component-specific types
  ```
- Extract reusable logic into custom hooks with clear boundaries
- Create a dedicated hook for each distinct responsibility
- Split complex components into sub-components of 100-200 lines maximum
- Follow naming conventions:
  - Hooks start with "use" (`useDataFetching`)
  - Components use PascalCase (`DataTable`)
  - Helper functions use camelCase (`formatData`)
- Keep components focused on UI, delegating business logic to hooks
- Generate UI elements dynamically from schema where possible
- Extract context data at the beginning of components
- Access context functions directly instead of through nested calls
- Use schema-driven approaches for dynamic rendering
- Always add null checks when using context-provided functions
- Implement common toggle functionality for displaying UUIDs vs. human-readable names
- Use direct API endpoints for critical relationship data rather than generic endpoints
- Pre-sort relationship data for dropdown fields in logical organization (e.g., by parent entity)
- Provide clear descriptive labels and help text for relationship fields

### Backend Services
- Follow similar organization pattern:
  ```
  service_area/
  ├── specific_service1.py   # Focused on one responsibility
  ├── specific_service2.py   # Focused on one responsibility
  └── __init__.py            # Exports all services
  ```
- Use Facade pattern for coordinating multiple services without exposing complexity

## React DnD Implementation Notes

- For drag and drop functionality, prefer react-beautiful-dnd over react-dnd 
- Implement custom drag-and-drop hooks for focused functionality like column reordering
- Provide proper memoization and state synchronization to prevent infinite render loops
- Use stable references with useCallback for event handlers
- Add visual feedback during drag operations with CSS classes for dragged items
- Implement localStorage persistence for drag-and-drop state changes
- Set up unique storage keys when handling multiple drag contexts
- The conversation reordering feature has unresolved issues with state updates
- Future implementation should handle optimistic UI updates consistently
- Keep drag-drop interactions simple, with minimal state changes during hover events
- Update local state immediately on drop, then send API request as side effect
- Use deep equality checks to prevent redundant re-renders
- Monitor dependency arrays carefully to prevent circular dependencies 
- Ensure stateful hooks properly update when prop dependencies change
- Fix SmartEntitySearch component issues with proper memoization strategies

## Database Guidelines

- Prefer archiving over deletion for important data
- Use transactions for critical operations
- Handle database errors with proper try/except blocks
- Monitor database growth patterns
- Run scheduled backups regularly
- Use order_index fields for sortable collections
- Structure PostgreSQL queries properly for JSONB fields
- Follow entity dependency order in operations

## Error Handling Guidelines

- Use structured error types from errors.ts utility
- Implement appropriate fallback mechanisms
- Provide clear user feedback for errors
- Use session storage for temporary data preservation
- Log errors with appropriate context and severity
- Handle network failures gracefully
- Use optimistic UI updates with recovery patterns
- Validate data at multiple levels (client, API, database)
- Implement smart validation with type coercion for partial inputs
- Handle year-only date inputs with appropriate conversion
- Support flexible relationship resolution with name-based lookups
- Implement intelligent entity search with exact and partial matching
- Implement CSV fallbacks for export functionality
- Provide alternative formats for data export when APIs fail
- Always validate input/output data structure before processing
- Ensure type definitions are consistent across the codebase
- Access context data at the beginning of components
- Add null/undefined checks before accessing properties
- Provide graceful fallbacks for rendering when data is missing
- Use conditional rendering for potentially undefined values
- Standardize error display components

## UI Implementation Guidelines

- Use fixed navigation bar for consistent application structure
- Implement table-based layouts for data-heavy components 
- Apply consistent table styling across all data views:
  - Use border-collapse with border-r border-gray-200 for clean grid lines
  - Apply border-b border-gray-200 to all rows for complete grid effect
  - Set consistent cell padding (px-3 py-2) across all tables
  - Add hover:bg-gray-50 to all table rows for consistent interaction
  - Add hover:bg-gray-100 to all column headers for interactive feedback
  - Make column resize handles invisible when not hovered (w-0)
  - Use hover:bg-blue-500 hover:w-2 transition-all for resize handle hover effects
- Add column drag-and-drop functionality with visual feedback during operations
- Implement drag-and-drop with stateful hooks and persistent storage
- Hide UUID-only columns by default while providing column visibility controls
- Add visual indicators during drag operations (opacity, background color changes)
- Use deep equality checks to prevent redundant state updates
- Add sorting capabilities with clear visual indicators
- Use contextual actions that appear only when relevant
- Optimize vertical space with collapsible sections
- Ensure proper padding for fixed elements (navbar requires pt-16)
- Calculate proper heights for scrollable containers (h-[calc(100vh-5rem)])
- Use consistent color scheme for actions (blue for edit, red for delete, etc.)
- Provide clear visual feedback for interactive elements
- Include UUID toggle functionality for all entity relationship displays (use "IDs"/"Names" button text)
- Display human-readable names for UUID fields by default
- Handle special case display for combined fields (like broadcast rights company names and territories)
- Organize relationship dropdowns by parent entity (e.g., divisions by league)
- Sort dropdown options by logical organization (alphabetical within parent groups)
- Add clear descriptive labels and help text for relationship fields
- For bulk operations:
  - Categorize fields logically (Basic Info, Relationships, Dates, etc.)
  - Provide clear instructions for empty field handling
  - Show warning indicators for fields that will be cleared
  - Use progress indicators for batch operations
  - Report detailed success/failure statistics
- For query interfaces, use side-by-side layout for question and SQL
- Implement both localStorage (for saved queries) and sessionStorage (for state persistence)
- Use direct Blob API for client-side file generation
- Preserve component state when navigating between pages
- Implement loading states and clear error handling for async operations
- For dynamic data displays:
  - Generate columns from entity schema
  - Standardize column visibility controls across views
  - Persist visibility preferences in localStorage, but only after user changes
  - Always start with all columns visible regardless of saved preferences
  - Format field names consistently for display (capitalized with spaces replacing underscores)
  - Handle relationship fields with special display logic (showing names instead of IDs)
  - Use data-driven approach for field display, relying on actual API response data
  - Implement consistent field formatting and display across all entity types
  - Use smart detection and display for relationship fields with corresponding name fields
  - Simplify column management with API-based column initialization
  - Use table-fixed with consistent cell sizing and padding
  - Use border-collapse with visible grid lines for all tables
  - Apply consistent hover effects for interactive elements
  - Use enum fields with dropdown selection controls
  - Create consistent date and time format displays

## Claude API Integration

- API key stored in environment variables
- Implement proper rate limiting awareness
- Handle streaming responses with buffer management
- Support file uploads in chat interface (CSV, text)
- Implement smart CSV parsing with data structure detection
- Provide fallbacks for API failures
- Follow Anthropic's usage guidelines
- Include appropriate model parameters
- Structure prompts for optimal response quality
- Use Claude for natural language database queries
- Provide schema context for database question answering
- Support translation-only mode without execution
- Format prompts with clear instructions and examples
- Implement safety checks on generated SQL
- Allow editing of generated SQL before execution
- Use separate services for translation and execution