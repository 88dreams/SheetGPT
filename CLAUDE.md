# SheetGPT Development Guide

> **IMPORTANT**: Production deployment active: Frontend on Netlify (88gpts.com/sheetgpt) and backend on Digital Ocean (api.88gpts.com).

> **CRITICAL DEPENDENCY ISSUE**: Currently troubleshooting @tanstack/react-query dependency issues. See DEPENDENCY_ANALYSIS.md for details of approaches tried.

## Recent Improvements

### Dependency Resolution Investigation (May 3, 2025)
- ✅ Conducted thorough analysis of @tanstack/react-query dependency issue
- ✅ Documented version mismatch between expected v4.29.5 and actual v5.66.8
- ✅ Attempted multiple resolution strategies including package overrides
- ✅ Created compatibility adapter to bridge API differences
- ✅ Documented all approaches in DEPENDENCY_ANALYSIS.md
- ✅ Set up parallel solution branches (contact-import-CLAUDE, contact-import-CURSOR)

### LinkedIn CSV Import Feature (April 22, 2025)
- ✅ Implemented CSV-based contact import with support for LinkedIn exports
- ✅ Created database models for contacts with brand associations
- ✅ Built brand matching with fuzzy company name resolution
- ✅ Added frontend components for CSV upload and contact management
- ✅ Created contact details view with relationship editing
- ✅ Used normalization techniques for improved company matching
- ✅ Fixed CSV parsing for LinkedIn export format with header metadata
- ✅ Enhanced FormData handling for reliable file uploads
- ✅ Added better serialization for complex nested objects

### SportDataMapper Stadium Field Mapping (April 12, 2025)
- ✅ Fixed array-based stadium data mapping with improved field position handling (0=name, 2=city, 3=state, 4=country)
- ✅ Resolved blank screen issue and production build reference errors
- ✅ Enhanced venue detection with track/speedway support

### Component State Management Fixes (June 2, 2025)
- ✅ Fixed infinite update loops with useRef pattern for breaking circular dependencies
- ✅ Improved export functionality with consistent column visibility
- ✅ Enhanced fingerprint comparison for more reliable state updates

### SQL Validation System (June 1, 2025)
- ✅ Backend validation with Claude API for PostgreSQL-specific issues
- ✅ Automatic SQL correction with visual feedback
- ✅ Fixed SQLAlchemy relationship configurations

## Key Features

### Entity Resolution
- Cross-entity type search with intelligent fallbacks
- Deterministic UUID generation for special entities (tournaments, championships)
- Fuzzy name matching with similarity scoring
- Context-aware resolution using related entities

### Component Architecture
- Single-responsibility hooks with focused concerns
- Modular component structure with proper separation:
  ```
  ComponentName/
  ├── index.tsx          # Main component
  ├── components/        # Sub-components
  ├── hooks/             # State management
  ├── utils/             # Helper functions
  └── types.ts           # Type definitions
  ```

### Contact Management (Updated May 7, 2025)
- LinkedIn CSV Import: Supports importing connections via CSV.
- Brand Association: Fuzzy matches contact company names against:
  - Existing "real" corporate Brand entities.
  - Other entity types (League, Team, Stadium, ProductionService) via automatically created "representative" Brand records.
- Representative Brands: Use the `representative_entity_type` field on the Brand model to distinguish.
- Association Re-scan: Feature to re-synchronize all contact associations based on a user-defined confidence threshold.

## Build Commands

### Docker Environment
- Start all services: `docker-compose up`
- Start specific service: `docker-compose up backend` or `docker-compose up frontend`
- Rebuild containers: `docker-compose build [service]`

### Backend (Python)
- Run server: `docker-compose up backend`
- Lint: `docker-compose run --rm backend bash -c "black . && isort . && flake8"`
- Run tests: `docker-compose run --rm backend pytest [optional path]`
- Apply migrations: `docker-compose run --rm backend python src/scripts/alembic_wrapper.py upgrade`

### Frontend (React/TypeScript) (Updated May 7, 2025)
- **Uses Yarn:** Project now uses `yarn` for dependency management.
- **Install:** Use `yarn install` within the container (handled by Dockerfile).
- Run dev server: `docker-compose up frontend` (uses `yarn dev` internally).
- Run tests: `./run-tests.sh` or `docker-compose run --rm frontend-test`
- Lint/TypeCheck: `docker-compose run --rm frontend yarn lint` / `docker-compose run --rm frontend yarn typecheck` (Assuming scripts exist in package.json)

## Database Management
- Backup: `python src/scripts/db_management.py backup`
- Cleanup: `python src/scripts/db_cleanup.py [--dry-run]`
- Optimization: `python src/scripts/db_vacuum.py [--no-reindex]`

## Code Style Guidelines

### React Components
- Extract context data at the beginning of components
- Use null checks before accessing nested properties
- Split complex components into sub-components (100-200 lines max)
- Keep components focused on UI, delegating business logic to hooks
- Create entity-specific field components with consistent patterns
- Use TailwindCSS for styling; avoid CSS files when possible

### React Hooks
- Create dedicated hooks for specific responsibilities
- Implement proper dependency tracking in useEffect
- Use conditional state updates to break circular dependencies
- Apply useMemo/useCallback with proper dependency arrays
- Avoid empty dependency arrays unless truly independent
- Implement fingerprinting for complex object comparisons

### API Services
- Use callback patterns for notifications instead of direct imports
- Return meaningful values (boolean success, data objects)
- Proper error handling with specific error types
- Comprehensive logging with appropriate severity levels

### Database Operations
- Use transactions for critical operations
- Apply proper entity creation order: Primary → Secondary → Relationship
- Add new fields as nullable to avoid migration issues
- Keep TypeScript interfaces in sync with backend models
- Remember Python regex uses `\1` (not `$1`) for backreferences

## UI Standards

### Export Functionality
- Use standardized export dialog with consistent layout
- Always include only currently visible columns in exports
- Preserve exact column ordering from the UI
- Export all matching rows (not just paginated ones)
- Implement CSV fallback when Google authentication fails

### Entity Display
- Toggle between UUIDs and human-readable names
- League nicknames: indigo color (bg-indigo-100 text-indigo-800)
- Division/Conference nicknames: blue color (bg-blue-100 text-blue-800)
- Save column visibility to both localStorage and sessionStorage
- Standardized table styling with consistent grid lines

## Performance Optimization
- Use fingerprinting technique for array/object comparisons
- Implement virtualization for large lists/tables
- Apply React.memo with custom equality functions
- Batch DOM update operations
- Create specialized comparison utilities for different data types
- Verify component rendering with React DevTools

## Docker Communication
- Frontend to backend: Use relative URLs (`/api/v1/endpoint`)
- Container to container: Use service names (`http://backend:8000`)
- Never use container hostnames in browser code
- Use VITE_API_URL environment variable for configuration

## Development Guidelines
- When editing, specify if Docker rebuild or restart is needed
- Wait for verification before updating git
- Always run lint and typecheck before submitting changes
- Add comprehensive test coverage for all new features