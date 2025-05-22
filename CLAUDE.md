# SheetGPT Development Guide

> **IMPORTANT**: Production deployment active: Frontend on Netlify (88gpts.com/sheetgpt) and backend on Digital Ocean (api.88gpts.com).

> **CRITICAL DEPENDENCY ISSUE**: (Note: This section might be outdated if the dependency issue was resolved. Verify current status.) Currently troubleshooting @tanstack/react-query dependency issues. See DEPENDENCY_ANALYSIS.md for details of approaches tried.

## Recent Improvements

### Query Page UX, NLQ Accuracy & Query Helper (May 17, 2025)
- ✅ **Database Query Page:** Implemented robust state persistence (sessionStorage) for inputs and results. Fixed "Clear Results" and SQL clear persistence.
- ✅ **NLQ-to-SQL Accuracy:** Enhanced Claude's SQL generation by providing a detailed schema context file (`src/config/database_schema_for_ai.md`) with guidelines (e.g., for case-insensitivity, entity resolution). Resolved backend `EntityNameResolver` bugs.
- ✅ **Query Helper UI (Initial):** Added backend endpoint for schema summary. Implemented frontend `SchemaContext` and an initial "Query Helper" modal to assist users in constructing NLQs via table/column selection and basic filtering.
- ✅ **Bug Fixes & Maintenance:** Corrected resolved name display in "Broadcast Rights" table. Updated Ant Design Modals to use `open` prop, resolving deprecation warnings. Addressed login issue due to DB service not running.

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

### Component State Management Fixes (May 2, 2025)
- ✅ Fixed infinite update loops with useRef pattern for breaking circular dependencies
- ✅ Improved export functionality with consistent column visibility
- ✅ Enhanced fingerprint comparison for more reliable state updates

### SQL Validation System (May 1, 2025)
- ✅ Backend validation with Claude API for PostgreSQL-specific issues
- ✅ Automatic SQL correction with visual feedback
- ✅ Fixed SQLAlchemy relationship configurations

## Key Features

### Natural Language Query (NLQ) to SQL
- Utilizes Claude LLM for advanced translation of user questions into SQL queries.
- **Enhanced Context**: Leverages a detailed schema description file (`src/config/database_schema_for_ai.md`) fed to the LLM, containing table structures, column descriptions, relationships, and SQL generation guidelines. This significantly improves query accuracy and handling of nuances like case-insensitivity and entity-specific logic.
- Includes backend SQL validation and AI-assisted correction capabilities.
- **Query Helper UI**: Frontend tools to assist users in formulating effective NLQs by browsing schema and applying filters, generating an NLQ for LLM processing.

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
- **Install:** Handled by Docker. `yarn install --frozen-lockfile` is used in `frontend/Dockerfile` (for dev) and `Dockerfile` (root, in `frontend-builder` stage for prod builds).
- **Run dev server:** `docker-compose up frontend` (This service is configured with `NODE_ENV=development` in `docker-compose.yml` and runs the Vite dev server via `CMD` in `frontend/Dockerfile`).
- **Production Build:** The `frontend-builder` stage in the root `Dockerfile` executes `RUN yarn build` to generate static assets in `frontend/dist/`. These are then copied by the `backend-prod` stage.
- **Run tests:** `./run-tests.sh` or `docker-compose run --rm frontend-test`
- **Lint/TypeCheck:** `docker-compose run --rm frontend yarn lint` / `docker-compose run --rm frontend yarn typecheck` (Assuming scripts exist in package.json for these specific commands, otherwise `yarn lint` and `yarn typecheck` directly in the container).

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

## Feature Update: Contact Import Source Tagging & DB Recovery (as of last update)

**1. Contact Import Source Tagging Feature:**

*   **Purpose:** To allow users to tag contacts with their import source (e.g., "LinkedIn Q1 Export", "Conference Leads") and to display this tag. This helps in organizing and segmenting contacts based on their origin.
*   **Functionality Added:**
    *   **Model Change:** `Contact` model now has an `import_source_tag` (optional string) field.
    *   **API Update (Import):** LinkedIn CSV import endpoint (`/api/v1/contacts/import/linkedin`) now accepts an `import_source_tag` which is saved with the contact.
    *   **UI Update (Import):** The LinkedIn CSV import form has a new text field to specify this tag during import.
    *   **UI Update (Display):** The main Contacts list/table now has a new column to display the `import_source_tag` for each contact.
    *   **API Schema:** Pydantic schemas for contact responses now include the `import_source_tag`.
    *   **Bulk Tagging:**
        *   **Backend:** New service method and API endpoint (`POST /api/v1/contacts/bulk-update-tag`) to bulk-update the `import_source_tag` for existing contacts (either all contacts for a user or all currently untagged contacts for a user).
        *   **Frontend:** A "Bulk Update Tags" button on the Contacts page opens a modal allowing users to specify a new tag and choose whether to apply it to all their contacts or only to those currently untagged.

**2. Database Situation & Next Steps:**

*   **Issue:** The PostgreSQL database was accidentally wiped due to a `docker-compose down -v` command, which removed the data volume.
*   **Recovery Plan:**
    1.  A database backup (`backup_20250515_173015.sql`) has been copied into the `db` container.
    2.  **Immediate Action:** Restore this backup using `psql`.
    3.  **Post-Restore:** Check the `alembic_version` table to see the last applied migration in the backup.
    4.  **Migration:** Apply any subsequent Alembic migrations (especially the one for `import_source_tag`) to bring the schema up to date using `alembic upgrade head`.
    5.  **Verification:** Thoroughly test login, contact import with tagging, tag display, and bulk tagging features.

**Key Files Touched for this Feature:**
*   `src/models/sports_models.py` (Contact model)
*   `src/schemas/contacts.py` (Pydantic schemas)
*   `src/services/contacts_service.py` (Logic for import and bulk update)
*   `src/api/routes/contacts.py` (API endpoints)
*   `alembic/versions/...` (Migration script for new column/index)
*   `alembic/env.py` (Ensured models are loaded for Alembic)
*   `frontend/src/components/common/LinkedInCSVImport.tsx` (Import form UI)
*   `frontend/src/pages/Contacts.tsx` (Bulk update UI, Contact interface)
*   `frontend/src/components/common/ContactsList.tsx` (Tag display in table)