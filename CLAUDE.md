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

### Testing Commands
- Run all tests: `npm run test:all`
- Run frontend tests: `npm run test:frontend`
- Run backend tests: `npm run test:backend`
- Run integration tests: `npm run test:integration`
- Generate test coverage report: `npm run test:coverage`
- Run tests in CI environment: `npm run test:ci`

### Test Templates
- Create component test: `cp tests/frontend/component.test.template.tsx tests/frontend/components/path/to/ComponentName.test.tsx`
- Create hook test: `cp tests/frontend/hook.test.template.ts tests/frontend/hooks/useHookName.test.ts`
- Create service test: `cp tests/backend/service.test.template.py tests/backend/services/path/to/test_service_name.py`
- Create route test: `cp tests/backend/route.test.template.py tests/backend/routes/test_route_name.py`
- Create integration test: `cp tests/integration/integration.test.template.ts tests/integration/test_feature_name.ts`

### Database Management
- Run backup: `python src/scripts/db_management.py backup`
- View statistics: `python src/scripts/db_management.py stats`
- Cleanup old data: `python src/scripts/db_management.py cleanup --older-than=30d`
- Restore backup: `python src/scripts/db_management.py restore --file=backup_20250309.sql`
- Archive conversation: `python src/scripts/db_management.py archive --conversation-id=12345`
- Scheduled backup: `python src/scripts/scheduled_backup.py`
- Reset conversation order: `python src/scripts/db_management.py reset-order --user-id=user_uuid`

### Database Maintenance
- Deduplicate records: `python src/scripts/db_cleanup.py --dry-run` (dry run mode)
- Deduplicate and fix records: `python src/scripts/db_cleanup.py` (actual changes)
- Database optimization: `python src/scripts/db_vacuum.py` (VACUUM ANALYZE, REINDEX)
- Database optimization (no REINDEX): `python src/scripts/db_vacuum.py --no-reindex`

### Entity Integration Utilities
- Add company fields to brands: `docker-compose run --rm backend python add_brand_fields_migration.py`
- Import companies to brands: `docker-compose run --rm backend python import_companies_to_brands.py`
- Create broadcast companies from brands (legacy): `docker-compose run --rm backend python add_broadcast_constraint.py`
- Create production companies from brands (legacy): `docker-compose run --rm backend python add_production_constraint_fixed.py`
- Fix production company display issue: `docker-compose restart backend frontend`
- Check broadcast rights integrity: `docker-compose run --rm backend python check_broadcast_rights.py`
- Verify brand-broadcast mappings: `docker-compose run --rm backend python check_record.py`
- Fix duplicate broadcast rights: `docker-compose run --rm backend python fix_duplicates.py`
- Fix team division assignments: `docker-compose run --rm backend python fix_team_divisions.py`

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
  ├── fields/                # Entity-specific field components
  │   ├── EntityTypeFields.tsx  # Entity-specific form fields
  │   ├── DivisionConferenceFields.tsx  # Contains nickname field
  │   ├── LeagueFields.tsx  # Contains nickname field
  │   ├── FormField.tsx         # Reusable field component
  │   └── index.ts           # Exports all field components  
  ├── hooks/                 # Component-specific hooks
  │   ├── useEntityData.ts      # Data fetching logic
  │   ├── useEntitySelection.ts # Selection management
  │   ├── useFiltering.ts       # Filter operations
  │   ├── useSorting.ts         # Sorting operations
  │   └── index.ts           # Exports all hooks  
  ├── utils/                 # Component-specific utilities
  │   ├── featureUtils.ts
  │   ├── validation.ts
  │   └── index.ts           # Exports all utilities
  └── types.ts               # Component-specific types
  ```
- Extract reusable logic into custom hooks with clear boundaries
- Create a dedicated hook for each distinct responsibility:
  - Data fetching hooks separate from UI state hooks
  - Selection management hooks separate from data processing
  - Filtering/sorting hooks separate from pagination
- Split complex components into sub-components of 100-200 lines maximum
- Extract large contexts into smaller, focused custom hooks:
  - Split monolithic contexts into single-responsibility hooks
  - Combine hooks in the main context for backward compatibility
  - Use explicit memoization for derived state
  - Track dependencies properly in useEffect hooks
- Create reusable field components for entity-specific forms:
  - Use common FormField component for consistent rendering
  - Create entity-specific field components (TeamFields, LeagueFields, etc.)
  - Handle relationship fields consistently across components
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

## Hook Design Patterns

- Implement custom hooks with single responsibility principle
- Split monolithic contexts into focused custom hooks:
  - Data fetching hooks (useEntityData)
  - Entity selection hooks (useEntitySelection, useSelection)
  - Filtering/sorting hooks (useFiltering, useSorting)
  - Pagination hooks (useEntityPagination, usePagination)
  - UI state hooks (useEntityView, useUiState)
  - Schema definition hooks (useEntitySchema)
  - Drag and drop hooks (useDragAndDrop) with fingerprinting optimization
- Use proper dependency tracking in useEffect hooks:
  - Include all dependencies used inside the effect
  - Use function dependencies with useCallback when needed
  - Avoid [] empty dependency arrays unless truly independent
  - Break circular dependencies with explicit conditional checks
  - Add intentional dependency exclusions with eslint-disable comments when needed
  - Use ref objects for values that shouldn't trigger re-renders
  - Implement change detection before updating state to break update cycles
- Implement explicit memoization for derived state:
  - Use useMemo for expensive calculations
  - Use useCallback for event handlers passed as props
  - Include all dependencies in memoization dependency arrays
  - Apply React.memo for components with expensive renders
  - Implement custom equality functions for React.memo when needed
  - Use memoized formatters for repetitive operations
- Create hook indices for clean imports:
  - Export all hooks from an index.ts file
  - Group related hooks in the same directory
  - Use named exports for better autocomplete
- Share state between hooks using composition:
  - Pass state from one hook to another as needed
  - Avoid circular dependencies between hooks
  - Use context as a last resort for deeply nested state
- Optimize hook performance:
  - Use early returns for conditional logic
  - Avoid recalculating values that don't change
  - Extract large objects from dependencies when possible
  - Use object destructuring to access only needed properties

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
- Use simplified search implementation for EntityList to prevent infinite loops
- Avoid complex dependency chains in frequently re-rendered components
- Keep critical UI components as simple as possible to prevent React update exhaustion
- When a component has circular dependency issues, replace it with a simpler direct implementation
- Use useMemo with JSON.stringify to create stable references for complex object dependencies
- Implement explicit change detection before updating state in conditional rendering patterns
- Break update cycles by checking if a value has actually changed before updating state
- For drag and drop implementations, ensure component inputs have stable identity across renders
- When modifying hook implementations, verify with React DevTools that components aren't re-rendering excessively

## Database Guidelines

- Prefer archiving over deletion for important data
- Use transactions for critical operations
- Handle database errors with proper try/except blocks
- Monitor database growth patterns
- Run scheduled backups regularly
- Use order_index fields for sortable collections
- Structure PostgreSQL queries properly for JSONB fields
- Follow entity dependency order in operations
- For entity field additions:
  - Add new fields as nullable to avoid migration issues
  - Include appropriate indexes for searchable fields
  - Use appropriate field lengths for string fields (nickname max 20 chars)
  - Update all related Pydantic schemas (Base, Create, Update, Response)
  - Keep TypeScript interfaces in sync with backend models
  - Consider adding helper text for new fields in forms

### Database Maintenance Workflow

The database maintenance workflow follows a step-by-step approach:

1. **Backup Step**
   - Always create and download a backup before maintenance
   - Use direct SQL generation for backup reliability
   - Store backups in a dedicated directory with timestamps
   - Implement proper error handling and progress feedback

2. **Analysis Step (Dry Run)**
   - Identify duplicate records across all entity tables
   - Check for missing or invalid relationships
   - Find inconsistent entity naming patterns
   - Identify missing constraints or schema issues
   - Present findings without making any changes

3. **Cleanup Step**
   - Remove duplicate records with proper reference updating
   - Fix broken relationships and standardize entity names
   - Add missing constraints to prevent future duplication
   - Implement proper transaction handling for safety
   - Record all changes in system_metadata for auditing

4. **Optimization Step**
   - Run VACUUM ANALYZE to reclaim storage and update stats
   - Run REINDEX to rebuild indexes (optional, can be skipped)
   - Calculate and display space savings from optimization
   - Monitor performance improvements with before/after metrics

For all steps, use a system_metadata table with JSONB type for storing maintenance status and results. Ensure proper JSON serialization with custom serializers for non-standard data types and use the ::jsonb type casting in SQL queries.

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
- Handle year-only date inputs with appropriate conversion:
  - Use January 1st for start dates when only year is provided
  - Use December 31st for end dates when only year is provided
- Support flexible relationship resolution with name-based lookups
- Handle brand/broadcast company interchangeability using dual-ID approach
- Implement cross-entity type fallback lookup when appropriate
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
- Handle special characters in entity names (e.g., parentheses) with proper parsing and normalization
- Use exact name matching first, fallback to partial matching for longer names
- Normalize entity type values in backend services (e.g., 'conference' → 'division_conference')

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
- For column persistence across sessions:
  - Save settings to both localStorage and sessionStorage
  - Use sessionStorage for quick access within a session
  - Fall back to localStorage for persistence between sessions
  - Handle new columns properly when loading saved settings
  - Implement dual storage strategy in useDragAndDrop hook
- For nickname display and editing:
  - League nicknames use indigo color (bg-indigo-100 text-indigo-800)
  - Division/Conference nicknames use blue color (bg-blue-100 text-blue-800)
  - Make nicknames directly editable with inline editing
  - Show "+ Add nickname" placeholder when nickname is empty
  - Add edit icon on hover (absolute positioning with translate for overlay)
  - Use consistent input sizes for inline editing (w-16 for nickname fields)
  - Add proper keyboard support for editing (Enter to save, Escape to cancel)
- For record navigation in SportDataMapper:
  - Allow circular navigation (cycling back to first record after reaching the end)
  - Ensure navigation buttons are always enabled as long as data exists
  - Use animation frames (requestAnimationFrame) for smooth UI transitions 
  - Handle edge cases with proper index bounds checking
  - Force source field value updates without conditional checks

## Performance Optimization Guidelines

- Memoize components with React.memo for expensive renders
- Implement custom equality checks for component props
- Use fingerprinting technique for array/object comparisons
- Create memoized formatters for repetitive cell rendering operations
- Apply type-specific optimized comparison functions:
  - Date objects: Compare timestamps with getTime()
  - Strings: Use localeCompare for proper sorting
  - Numbers: Direct numeric comparison
  - Objects: Fingerprinting or shallow key comparison
- Properly track dependencies in all hooks and effects
- Extract calculation-heavy functions outside of render
- Implement virtualization for long lists/tables
- Cache results of expensive calculations with useMemo
- Batch DOM update operations when possible
- Use custom hooks for specialized operations (sort, filter, select)
- Avoid unnecessary re-renders with useCallback handlers
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

### Database Maintenance UI Guidelines

- Implement as a step-by-step guided workflow in the Settings page
- Use a visual timeline with numbered steps to indicate progress
- Highlight the current active step and disable future steps until prerequisites are met
- Use icons consistently across steps: backup (save), analysis (search), cleanup (broom), optimize (magic)
- For each completed step:
  - Show a checkmark and completion timestamp
  - Display a summary of results in a concise card layout
  - Include numerical metrics and findings in a structured format
  - Provide an option to rerun the step if needed
- For the active step:
  - Display clear instructions about what the step does
  - Use a primary-colored button for the main action
  - Show a loading indicator during processing
  - Provide appropriate confirmations for destructive operations
- For confirmation dialogs:
  - Use yellow backgrounds for caution (bg-yellow-50, border-yellow-200)
  - Include a warning icon (FaExclamationTriangle) in amber color
  - Clearly explain consequences of actions
  - Provide both confirmation and cancel options
  - For database operations, explain exactly what will happen
- After completion of all steps:
  - Show a complete summary with key metrics
  - Highlight space recovered and performance improvements
  - Provide options to download a maintenance report

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