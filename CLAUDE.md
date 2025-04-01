# SheetGPT Development Guide

## Refactoring Progress

- ✅ Phase 1: Standardized Error Handling and TypeScript Typing (COMPLETED March 30)
- ✅ Phase 2: Brand Entity Integration (COMPLETED March 31)
- ✅ Phase 3: Hook Dependency Management (COMPLETED April 14)
- ✅ Phase 4: Performance Optimization (COMPLETED April 23)
- ✅ Phase 5: Enhanced Entity Resolution Strategy (COMPLETED April 25)
- ✅ Phase 6: UI Enhancement (COMPLETED May 3)
  - ✅ Entity Search Components
  - ✅ Entity Resolution UI Elements 
  - ✅ RelatedInfo Visualization
  - ✅ Form Field Component Updates
  - ✅ Field-level Resolution Validation
  - ✅ BulkEdit Resolution Integration
- ✅ Comprehensive Testing (COMPLETED May 5)
  - ✅ SmartEntitySearch Testing
  - ✅ EntityResolutionBadge Testing
  - ✅ useEntityResolution Hook Testing
  - ✅ EntityCard Resolution Testing
  - ✅ EnhancedBulkEditModal Testing
  - ✅ EntityResolutionFlow Integration Testing

## Refactoring Progress
The codebase is currently undergoing a planned refactoring effort described in docs/REFACTORING_PLAN.md:

### Phase 1: Foundation Improvements (COMPLETED)
- ✅ Standardized backend error handling with comprehensive error hierarchy
- ✅ Improved TypeScript typing across the frontend codebase
- ✅ Added missing database indexes for performance optimization

### Phase 2: Service Layer Consolidation (COMPLETED)
- ✅ Enhanced BaseEntityService with improved error handling and validation
- ✅ Standardized entity type handling with normalization functions
- ✅ Completed Brand entity integration
  - ✅ Updated BroadcastCompanyService to use Brand model with company_type='Broadcaster'
  - ✅ Updated ProductionCompanyService to use Brand model with company_type='Production Company'
  - ✅ Created migration scripts for foreign key updates
  - ✅ Fixed and improved error handling with automatic rollback

### Phase 3: Hook Dependency Management (COMPLETED)
- ✅ Resolved circular hook dependencies
- ✅ Extracted UI state from business logic hooks
- ✅ Standardized error handling in hooks
- ✅ Implemented proper separation of concerns in component hooks
- ✅ Created comprehensive hook documentation

### Phase 4: Performance Optimization (COMPLETED)
- ✅ Created fingerprinting utility for complex object comparison
- ✅ Implemented higher-order component memoization patterns
- ✅ Added virtualization for large entity tables
- ✅ Enhanced DataTable with proper memoization
- ✅ Improved SportDataMapper performance
- ✅ Created relationship loading utilities
- ✅ Implemented API caching and request deduplication
- ✅ Added prefetching for anticipated user interactions

### Phase 5: Enhanced Entity Resolution (COMPLETED)
- ✅ Created unified EntityResolver service with centralized resolution logic
- ✅ Implemented configurable resolution paths with fallback strategies
- ✅ Added fuzzy name matching with similarity scoring
- ✅ Created standardized error handling for resolution failures
- ✅ Implemented context-aware resolution using related entities
- ✅ Added deterministic UUID generation for special entity types
- ✅ Created frontend entityResolver utility
- ✅ Added V2 API endpoints for enhanced resolution capabilities

### Phase 6: UI Enhancement (NEXT)
- ⬜ Update UI components to use the enhanced entity resolution
- ⬜ Implement smart error handling with resolution suggestions
- ⬜ Add contextual help for entity relationships
- ⬜ Improve form validation with relationship constraints

Implementation details:
- The base service now has standardized methods for CRUD operations
- Added smart entity lookup with ID, exact name, and partial name matching
- Improved error handling decorator with auto-session rollback
- Services now support both Pydantic models and dictionaries
- Services have improved filtering capability for list operations
- Comprehensive docstrings document all parameters and return types

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

### Running Frontend Tests
- All tests in the `/tests` directory are now mounted in the Docker container
- For component-specific tests: `docker-compose run --rm frontend-test npm test -- --testPathPattern=ComponentName`
- For EntityList tests: `docker-compose run --rm frontend-test npm run test:entitylist`
- For SportDataMapper tests: `docker-compose run --rm frontend-test npm run test:sportdatamapper`
- For specific test suites: `docker-compose run --rm frontend-test npm run test:suite -- SuiteName`
- To generate coverage reports: `docker-compose run --rm frontend-test npm run test:coverage`
- Coverage reports are available in the `coverage/lcov-report/index.html` file
- Custom test configurations can be added in jest.*.config.js files
- Run tests in CI mode: `docker-compose run --rm frontend-test npm run test:ci`
- Run tests with component mocks: `docker-compose run --rm frontend-test npm run test:with-mocks`

### Testing Best Practices
- Use the AAA pattern (Arrange, Act, Assert) for test organization
- Mock external dependencies to isolate component behavior
- Test both success and error paths for async operations
- Create test data factories for consistent test data
- Use `data-testid` attributes for querying elements in tests
- Prefer user-centric queries: getByText, getByLabelText, getByRole
- Follow the testing pyramid: more unit tests, fewer integration tests
- Use explicit assertions rather than snapshots when possible
- Ensure tests are independent and don't rely on global state
- Use beforeEach/afterEach to reset mocks and test conditions

### Docker API Communication
- Frontend-to-backend communication in Docker environment:
  - Always use relative URLs in browser JavaScript (e.g., `/api/v1/endpoint`)
  - Never use direct container hostnames like `http://backend:8000` in browser code
  - Set up proper Vite proxy for forwarding API requests to the backend container
  - Configure CORS properly in FastAPI to accept requests from frontend origin
- Container-to-container communication:
  - Use container service names from docker-compose.yml (e.g., `http://backend:8000`)
  - Ensure network_mode is properly configured for service discovery
  - For debugging connection issues, use `docker-compose exec backend curl http://backend:8000/api/endpoint`
- IMPORTANT: The frontend browser code cannot use container hostnames directly
- Always use the VITE_API_URL environment variable for configuration

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

# Entity Resolution Features
- Cross-entity type search: When looking up by name, the system can try multiple entity types
- Intelligent fallback: Automated fallback to related entity types when primary lookup fails
- Special entity types: Support for tournaments, championships, and playoffs without database tables
- Deterministic UUID generation: Creates consistent IDs for special entities based on type and name
- Dynamic entity_type correction: Updates entity_type to match where the entity was found
- Multiple resolution steps: Configurable resolution path through different entity types

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

For example, the refactored EntityList component follows this pattern:
  ```
  EntityList/
  ├── index.tsx              # Main component with orchestration logic
  ├── components/            # UI components
  │   ├── EntityListHeader.tsx  # Header with search and export buttons
  │   ├── ColumnSelector.tsx    # Column visibility controls
  │   ├── EntityTable.tsx       # Table with column resizing
  │   ├── EntityRow.tsx         # Row rendering with cell formatting
  │   ├── Pagination.tsx        # Page controls
  │   ├── BulkActionBar.tsx     # Bulk edit/delete controls
  │   ├── ExportDialog.tsx      # Export configuration dialog
  │   └── index.ts             
  ├── hooks/                 # State management
  │   ├── useColumnVisibility.ts # Column visibility state
  │   ├── useEntityExport.ts     # Export functionality
  │   ├── useInlineEdit.ts       # Name/nickname editing
  │   └── index.ts              
  └── utils/                 # Utilities
      ├── csvExport.ts         # CSV generation
      ├── formatters.ts        # Cell display formatting
      └── index.ts              
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

## API and Utility Design Patterns

When creating utility functions and API services, follow these patterns:
- Use callback functions for notifications rather than direct imports
- Accept success and error handlers as parameters instead of direct dependencies
- Avoid dependencies on global contexts in utility functions
- Return meaningful values that callers can use (boolean success, data objects, etc.)
- Properly handle promises and asynchronous operations
- Include comprehensive error handling
- Document parameters and return values clearly

Example callback pattern:
```typescript
// Good: Utility with callbacks
export async function saveCsvFile(
  data: any[], 
  columns: string[], 
  filename: string,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<boolean> {
  try {
    // Implementation...
    onSuccess?.();
    return true;
  } catch (error) {
    onError?.(error as Error);
    return false;
  }
}

// Bad: Utility with direct dependency
import { showNotification } from '../utils/api';
export async function saveCsvFile(data: any[], columns: string[], filename: string): Promise<boolean> {
  try {
    // Implementation...
    showNotification('success', 'CSV saved');
    return true;
  } catch (error) {
    showNotification('error', 'CSV export failed');
    return false;
  }
}
```

## React State Management Best Practices

### Handling Complex State Updates

- When managing dependent state values, update them in the correct logical order (e.g., page number before page size)
- Use refs to track previous state values to prevent unnecessary updates (`useRef` + comparison logic)
- Implement batch updates for related state changes to minimize render cycles
- Apply defensive programming patterns in all hooks - always handle potential undefined values
- When a component has circular dependency issues, replace it with a simpler direct implementation
- For critical UI state, maintain a single source of truth (either context, prop, or local state)
- Use useState updater functions (prev => ...) instead of direct assignments to ensure latest value
- Split monolithic state objects into smaller, focused pieces to reduce unnecessary renders
- Add proper error boundaries around components with complex state management

### Dependency Management

- Carefully review useEffect dependency arrays to prevent infinite update loops
- Avoid object/array literals directly in dependency arrays - memoize them first
- Use useRef for values that shouldn't trigger effect re-runs but need to persist
- Consider using the useReducer pattern for complex interrelated state
- Extract large useEffect blocks into custom hooks with clear boundaries
- Use the eslint-disable-next-line react-hooks/exhaustive-deps comment sparingly and with comments
- Apply careful memoization for objects in hook dependencies with useMemo
- Use stable function references with useCallback for handlers passed to children
- Ensure callback functions properly include all necessary dependencies 
- For complex objects, use fingerprinting or JSON.stringify with useMemo to create stable references

### Performance Optimization

- Implement explicit change detection before updating state (`if (newVal !== oldVal)`)
- Use React.memo with custom equality functions for components with expensive renders
- Break update cycles by checking if a value has actually changed before updating state
- Apply render optimization techniques like virtualization for large lists
- Add careful debugging with console.log for component render and update cycles
- Use profiling tools to identify components that render too frequently
- Implement context splitting to prevent unnecessary re-renders from unrelated state
- Apply useMemo for expensive calculations that don't need to run on every render
- Create specialized comparison utilities for deep equality checks of complex objects
- Avoid nested ternary expressions for conditional rendering as they're harder to debug

### Pagination and React Query Integration

- Properly configure React Query for pagination:
  - Disable or reduce cache time when using paginated data (set `cacheTime: 0`)
  - Include page number and page size in query keys to ensure proper cache separation
  - Use `removeQueries()` when navigating between pages to ensure fresh data
  - Include `selectedEntityType` in dependencies for page change handlers

- Implement robust pagination event handlers:
  - Always use explicit handler functions instead of inline arrow functions
  - Call preventDefault() on pagination button events to ensure proper processing
  - Add data-testid attributes to pagination controls for better testing
  - Add conditional checks to prevent unnecessary state updates

- Handle pagination state coherently:
  - Manage pagination state centrally to avoid synchronization issues
  - Use queryClient invalidation for reliable cache management
  - Implement proper dependencies in useCallback hooks for pagination functions
  - Avoid state batching issues with explicit state updates
  - Add proper error handling for edge cases (empty results, invalid pages)

- Ensure proper cache invalidation for pagination:
  - Use explicit cache invalidation when changing pages
  - Set appropriate staleTime and cacheTime for your data requirements
  - Include all relevant parameters in query keys
  - Monitor query cache behavior with React Query DevTools
  - Use refetchOnMount and other flags consistently

- Additional pagination best practices:
  - Store pagination settings in URL params or localStorage for proper state restoration
  - Add validation before applying pagination values from external sources
  - Create clear separations between UI-level pagination and data-level pagination
  - Apply optimistic UI updates with proper rollback mechanisms
  - Monitor pagination-related re-renders with React DevTools

### Context Design

- Avoid circular dependencies between context providers
- Use context selectors to optimize renders (useContext with careful prop extraction)
- Implement separate read/write contexts for performance in large applications
- Split large context providers into smaller, more focused providers
- Memoize context values properly to prevent unnecessary child re-renders
- Add proper error handling and fallbacks in context consumers
- Use higher-level abstractions like useReducer for complex context state
- Provide stable function references in context values with useCallback

### Testing Recommendations

- Test component state transitions with specific focus on edge cases
- Create tests for dependent state updates to ensure correct ordering
- Test with React Testing Library focusing on behavior rather than implementation
- Verify state synchronization between parent/child components
- Test error boundaries to ensure graceful failure handling
- Mock complex hooks for easier testing of component behavior
- Use snapshot testing sparingly and focus on interaction testing
- Create specialized test helpers for simulating UI interactions with proper timing

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

The database maintenance workflow provides a flexible approach with safety warnings:

1. **Backup Step**
   - Create and download a backup before maintenance
   - Use direct SQL generation for backup reliability
   - Store backups with timestamps for easy identification
   - Show clear completion status with timestamp
   - Enable creating new backups at any time

2. **Analysis Step (Dry Run)**
   - Identify duplicate records across all entity tables
   - Check for missing relationships and inconsistent naming
   - Present findings without making any changes
   - Can be run without a backup (with warning dialog)
   - Re-runnable at any time for updated analysis

3. **Cleanup Step**
   - Remove duplicate records and fix broken relationships
   - Standardize entity names for consistency
   - Add missing constraints to prevent future duplication
   - Can be rerun after completion with "Run Cleanup Again" button
   - Shows warning when run out of sequence
   - Provides immediate visual feedback during operation

4. **Optimization Step**
   - Run VACUUM ANALYZE to reclaim storage and update stats
   - Optional REINDEX to rebuild indexes
   - Calculate and display space savings
   - Can be run independently (with appropriate warnings)
   - Shows detailed metrics of optimizations performed

All steps feature:
- Warning dialogs when run out of sequence
- Ability to proceed despite warnings
- Immediate visual feedback during processing
- Detailed results display after completion
- Option to rerun at any time
- Consistent UI with clear instructions

For system_metadata storage:
- Prefer TEXT type over JSONB for simpler and more reliable updates
- When using JSONB, follow the pattern `:value::jsonb` with proper parameter binding
- Add fallback query execution mechanisms that try both positional and named parameters
- Ensure proper serialization of complex objects before storage
- Implement status update functions that handle multiple storage patterns

### Regex Pattern Standardization

When implementing regex-based text standardization in Python:
- Remember that Python uses `\1`, `\2` for backreferences in replacement strings, NOT `$1`, `$2` (which is JavaScript syntax)
- Always test regex replacements on sample data before applying to production
- Consider using raw strings (r"pattern") for regex patterns to avoid double escaping
- When standardizing entity names, ensure spacing is preserved where needed (e.g., "NCAA Division" not "NCAADivision")
- Write verification scripts to validate the results of text replacements
- Combine multiple text standardization rules into logical groups based on entity type
- Create test cases that cover edge cases like names with special characters or mixed capitalization

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
- Implement cross-entity type fallback lookup when appropriate:
  - Try primary requested entity type first (e.g., division_conference)
  - Fall back to related entity types when lookup fails (league, division_conference)
  - Automatically update entity_type to match where entity was found
  - Generate deterministic UUIDs for special entity types (tournaments, championships, playoffs)
  - Track entity resolution status with boolean flags for maintainable code
- Handle year-only date inputs with appropriate conversion
- Support flexible relationship resolution with name-based lookups
- Implement intelligent entity search with exact and partial matching

## Export Functionality Guidelines

- Implement CSV fallbacks for export functionality when Google Sheets fails
- Provide alternative formats for data export when APIs fail
- Always initialize authentication services before attempting export
- For all export dialogs and interfaces:
  - CRITICAL: Use standardized export dialog UI with consistent layout:
    - Clean dialog with clear title ("Export Data")
    - File name input field at the top of the dialog
    - For Google Sheets exports, show folder selection option
    - Place action buttons at the bottom of the dialog
    - Use three distinct buttons: Cancel, Export to CSV, Export to Google Sheets
    - Style buttons consistently: small (px-3 py-1 text-xs) with proper colors
    - Use blue for CSV exports and green for Google Sheets exports
    - Use gray/neutral for Cancel button (border-gray-300)
    - Add small icons to export buttons (FaFileCsv for CSV, FaGoogle for Google Sheets)
    - Set icon size to 12px for consistent visual appearance
    - Include spacing between icon and text (mr-1 for icons)
  - Provide direct action buttons rather than format toggles
  - Handle button states with proper loading indicators
  - CRITICAL: Use direct mutation calls in button click handlers to prevent race conditions
  - Avoid relying on state updates before triggering export functions
  - Implement client-side CSV generation with proper quoting/escaping:
    - Use columnOrder and visibleColumns to match UI display
    - Generate proper CSV with header row and all visible data
    - Properly escape quotes and commas in CSV values
    - Set correct content-type and filename for downloads
    - Use File System Access API for OS-level save-as dialog when supported
    - Implement fallback download mechanism for older browsers
    - Ensure all CSV exports use consistent save dialog approach
  - Maintain consistent styling across different export contexts
  - Use the same component structure in both export dialog implementations
  - Implement robust Google Drive folder selection:
    - Handle Google API loading with appropriate error messages
    - Use simplified folder selection with manual fallback
    - Add proper authentication status checking
    - Implement OAuth token retrieval for Google Drive access

- For Google Sheets exports:
  - CRITICAL: Always use ONLY currently visible columns to match user expectations
  - CRITICAL: Preserve EXACT column ordering from the UI (using columnOrder array)
  - CRITICAL: Export ALL matching rows (not just the paginated/visible ones)
  - Filter export columns to match exactly what's shown in the UI
  - Support export to specific Google Drive folders with auto-creation
  - Add folder selection with Google Drive Picker API integration
  - Support both folder selection via Drive Picker and direct folder ID input:
    - Implement folder creation when needed
    - Handle permission errors gracefully
    - Provide user feedback during folder operations
  - Include header rows with human-readable column names
  - Add detailed folder selection dialog with clear feedback
  - Handle graceful fallback to CSV when authentication fails
  - Apply proper formatting to exported sheets for readability
  - Implement server-side error handling with detailed logging
  - Add folder ID tracking and URL generation for user navigation
- Ensure robust handling of visible columns parameter throughout pipeline:
  - Add detailed logging at each stage (frontend, API service, export service)
  - Properly handle empty arrays (convert to null/undefined in API request)
  - Add sanity checks for column existence in the actual data
  - Always include ID field even if not in visible columns
  - Log warnings when requested columns don't exist in data
  - Handle potential type conversion issues (strings vs objects)
  - Use conditional checks before accessing array properties
  - Validate requests with proper debug information
- For debugging column selection issues:
  - Add detailed logging of columns at each stage (frontend to backend)
  - Verify the full data path from UI component to final export service
  - Maintain traceability between displayed columns and exported columns
  - Log exact JSON payloads being sent to the API
  - Track column ordering to ensure it's preserved
  - Verify that no empty arrays are being sent inappropriately
- Always validate input/output data structure before processing
- Ensure type definitions are consistent across the codebase
- Access context data at the beginning of components
- Add null/undefined checks before accessing properties
- Provide graceful fallbacks for rendering when data is missing
- Use conditional rendering for potentially undefined values
- Standardize error display components
- Handle special characters in entity names (e.g., parentheses) with proper parsing and normalization
- Use exact name matching first, fallback to partial matching for longer names
- Normalize entity type values in backend services:
  - Convert 'conference' or 'division' → 'division_conference'
  - Include 'tournament' as a special entity type alongside championships and playoffs
  - Properly handle polymorphic entity_type/entity_id fields in production_services and broadcast_rights

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

## Entity Resolution Testing Guidelines

- Created comprehensive test utilities for testing entity resolution components:
  - Located in `tests/frontend/utils/entityResolutionTestUtils.ts`
  - Provides mock functions for different resolution scenarios
  - Simplifies testing of resolution components with standardized mocks

- Key testing utilities:
  - `mockResolutionInfo(type, score)` - Generates resolution metadata for exact, fuzzy, context, or virtual matches
  - `mockEntity(entityType, namePattern)` - Creates mock entity with specific resolution pattern
  - `mockEntityResolution(entityType, nameOrId, options)` - Mocks hook responses for useEntityResolution
  - `mockRelatedEntityData()` - Provides mock data for relationship testing
  - `mockEntityFields()` - Generates field definitions for form component testing
  - `mockFieldCategories()` - Creates categorical field groupings for BulkEditModal testing

- Standard test pattern for resolution components:
  1. Mock the entity resolver and related hooks
  2. Test rendering with different resolution types (exact, fuzzy, context, virtual)
  3. Verify that resolution badges display correctly with appropriate colors
  4. Test user interactions with resolution-aware components
  5. Validate error states and loading indicators
  6. Test context-aware field relationships

- Component test organization:
  - SmartEntitySearch.test.tsx - Tests entity searching with different match types
  - EntityResolutionBadge.test.tsx - Tests badge display for all resolution scenarios
  - useEntityResolution.test.ts - Tests hook behavior with different inputs
  - EntityCard.test.tsx - Tests card display with resolution information
  - EnhancedBulkEditModal.test.tsx - Tests bulk editing with resolution context
  - EnhancedFieldInput.test.tsx - Tests form field components with resolution

- Integration testing:
  - test_entity_resolution_flow.ts - End-to-end test of resolution workflow
  - Verifies data flow between components with resolution context
  - Tests context propagation between related fields

## Development Best Practices

- Whenever any edit is done, the feedback here should always end with explicit instructions on whether docker backend or frontend needs to be restarted and/or rebuilt. Since a rebuild always implies a restart, this can be shortened to: (docker rebuild OR restart (frontend AND/OR backend)) OR NoDocker.
- Do not automatically update git. Wait until any new code has been shown to work before git is updated.