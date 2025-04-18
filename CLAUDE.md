# SheetGPT Development Guide

> **IMPORTANT**: Production deployment active: Frontend on Netlify (88gpts.com/sheetgpt) and backend on Digital Ocean (api.88gpts.com).

## Recent Improvements

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

### Frontend (React/TypeScript)
- Run dev server: `docker-compose up frontend`
- Run tests: `./run-tests.sh` or `docker-compose run --rm frontend-test`
- Lint/TypeCheck: `docker-compose run --rm frontend npm run lint/typecheck`

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