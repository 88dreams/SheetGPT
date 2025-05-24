# Technical Description

This document provides a concise overview of SheetGPT's architecture and implementation.

## System Architecture

### Backend (FastAPI + PostgreSQL)

#### Core Organization
```
src/
├── api/               # Domain-specific endpoints
├── models/            # SQLAlchemy models
├── schemas/           # Pydantic schemas
├── services/          # Business logic (database_management.py refactored into focused services e.g., query_service, ai_query_processor, database_admin_service, etc.)
│   ├── sports/        # Sports domain services
│   │   ├── facade.py              # API coordination
│   │   ├── entity_resolver.py     # Reference resolution
│   │   ├── brand_service.py       # Universal company handling
│   └── chat/          # Claude API integration
└── utils/             # Shared utilities
```

#### Key Features

1. **API Architecture**
   - Domain-driven modules with facade pattern
   - Standardized responses with error handling
   - V2 endpoints for enhanced resolution
   - Streaming support for chat interactions

2. **Database Architecture**
   - SQLAlchemy ORM with UUID primary keys
   - Universal Brand entity for all company relationships
   - Virtual entity support with deterministic UUIDs
   - Smart date handling with contextual defaults
   - Polymorphic entity references for cross-entity relationships
   - **Representative Brands (New):** Utilizes the `Brand` model to represent other entity types (League, Team, Stadium, ProductionService) for contact association. The `representative_entity_type` column identifies these specific brands.

3. **Authentication**
   - JWT with refresh token mechanism
   - Role-based access control
   - Cross-domain support for production deployment

4. **AI-Powered Query Translation:**
   - Utilizes Claude LLM for Natural Language Query (NLQ) to SQL translation.
   - Employs a detailed, manually curated schema description file (`src/config/database_schema_for_ai.md`) to provide rich context and SQL generation guidelines to the LLM, improving accuracy and handling of specific patterns (e.g., case-insensitivity, entity resolution nuances).
   - Includes backend services for SQL validation and correction, potentially using AI assistance.

### Frontend (React + TypeScript)

#### Core Structure
```
frontend/
├── components/          # UI components
│   ├── chat/            # Chat interface
│   ├── common/          # Shared UI
│   ├── data/            # Data management
│   │   ├── DataTable/   # Advanced table
│   │   ├── EntityUpdate/ # Edit interfaces
│   │   └── SportDataMapper/ # Mapping tools
│   └── sports/          # Sports database
├── contexts/            # Global state
├── hooks/               # Custom React hooks
├── pages/               # Route components
└── services/            # API clients
```

#### Key Features

1. **Component Architecture**
   - Single-responsibility hooks for focused concerns
   - Modular component organization:
     ```
     ComponentName/
     ├── index.tsx          # Main component
     ├── components/        # UI elements
     ├── hooks/             # State management
     └── utils/             # Helpers
     ```
   - Dual storage persistence (localStorage/sessionStorage)
   - Optimized rendering with strategic memoization

2. **State Management**
   - Custom hooks for specific responsibilities
   - Conditional state updates to break circular dependencies
   - Fingerprinting for complex object comparisons
   - Session-resilient state persistence
   - **Query Page Persistence:** The Database Query page now uses `sessionStorage` to persist user inputs (NLQ, query name, SQL), query results, and related execution feedback across page navigations, enhancing user experience.

3. **UI Features**
   - Column persistence with drag-and-drop
   - Toggle between UUIDs and human-readable names
   - Standardized table styling for consistency
   - Resolution confidence visualization
   - Enhanced entity search with fuzzy matching
   - **Query Helper UI (Initial):** An interactive modal on the Database Query page assists users in constructing NLQs by allowing them to select tables and apply basic column filters based on a dynamically fetched schema summary.
   - The schema summary is provided by a new backend endpoint that parses the `database_schema_for_ai.md` file.

#### Build & Dependency Management (Updated May 17, 2025)
- Uses `yarn` (v1) for frontend dependency management.
- **Development Environment (Dev Container):**
  - The primary development method is via VS Code Dev Containers (`.devcontainer/devcontainer.json`).
  - This uses the `frontend` service from `docker-compose.yml`, which builds `frontend/Dockerfile`.
  - `frontend/Dockerfile` now uses `node:18-bullseye` as a base and sets `NODE_ENV=development`. Its `CMD` starts the Vite dev server (`./node_modules/.bin/vite --host 0.0.0.0`).
  - The `docker-compose.yml` mounts the entire project to `/workspace` in the `frontend` service, with `frontend/node_modules` isolated. The `workspaceFolder` in `devcontainer.json` is set to `/workspace`.
- **Production Frontend Assets Build:**
  - The root `Dockerfile` contains a `frontend-builder` stage, also using `node:18-bullseye`.
  - This stage installs dependencies using `yarn install --frozen-lockfile` (after `rm -rf node_modules` and clearing yarn cache for robustness).
  - It executes `RUN yarn build` (which runs `tsc && vite build`) to compile static assets into `/app/frontend/dist/` within that build stage.
  - The `backend-prod` stage in the root `Dockerfile` (used by the `app` service) copies these assets from the `frontend-builder` stage to its own `/app/frontend/dist` for serving.
- **`.dockerignore` files:**
  - A root `.dockerignore` prevents `frontend/node_modules` from being copied into the `frontend-builder` stage's context by the `COPY frontend/ ./frontend/` command.
  - `frontend/.dockerignore` prevents local `node_modules` from interfering with `frontend/Dockerfile`'s `COPY . .` command.
- Docker anonymous volume for `/workspace/frontend/node_modules` (as defined in `docker-compose.yml` for the `frontend` service) helps persist dependencies between runs while allowing local code syncing for development.
- **Troubleshooting:** If encountering unexpected dependency versions or build issues, clear stale Docker volumes (`docker-compose down -v`) and rebuild images with `--no-cache` (e.g., `docker compose build --no-cache frontend` or `docker compose build --no-cache app`).

#### Notable Fixes
- **Pagination:** Resolved issue where paginated entity lists (e.g., Brands) did not update correctly on page change by disabling `keepPreviousData` in the relevant `useQuery` configuration within `SportsDatabaseContext`.

## Key Data Flow Patterns

1. **Natural Language to SQL**
   ```
   User NLQ → Detailed Schema Context (from MD file) + Specialized Guidance → Claude AI → 
   Generated SQL → AI-Assisted Validation/Correction → Execution → 
   Name Resolution (if needed) → Display Results to User
   ```

2. **Entity Resolution System**
   ```
   Reference → Multi-type Search → Exact/Fuzzy Name Lookup → 
   Smart Fallback → Deterministic UUID → Relationship Traversal
   ```

3. **Universal Brand System**
   ```
   Company Detection → Brand Lookup → Type Classification → 
   Partner Resolution → Direct Relationships
   ```

4. **SportDataMapper Data Flow**
   ```
   Data Source → Field Detection → Entity Type Inference → 
   Drag-Drop Mapping → Field Validation → Record Navigation → 
   Entity Creation with Relationships
   ```

## Production Architecture

```
User → 88gpts.com/sheetgpt (Netlify) → Frontend Application
                ↓
                API Requests with JWT
                ↓ 
User → api.88gpts.com (Digital Ocean) → Backend API → PostgreSQL
```

### Implementation Details

1. **Frontend (Netlify)**
   - React application with optimized build
   - Environment-specific API configuration
   - Static assets with proper caching
   - Cross-domain authentication handling

2. **Backend (Digital Ocean)**
   - FastAPI application in containers
   - PostgreSQL with SSL encryption
   - Custom SSL context for asyncpg driver
   - CORS configured for cross-domain requests
   - JWT token validation across domains

3. **Communication**
   - HTTPS for all endpoints
   - WebSocket connections for streaming
   - Proper token refresh mechanism
   - Enhanced error handling with detailed logs

## Recent Optimizations

### Performance Improvements
- Fingerprinting utility for stable object references (70-80% reduction in API calls)
- Relationship loading utilities with batching (75-90% fewer requests)
- React.memo with custom equality functions (60-85% reduction in render counts)
- Virtualization for large data tables (4x faster record navigation)
- API caching with intelligent invalidation

### UI Enhancements
- Standardized export dialog with consistent layout
- Manual search submission for better control
- Dual-level filtering with accurate result counts
- Enhanced form fields with resolution feedback
- Column persistence across sessions with dual storage

## Current Focus Areas (as of May 17, 2025)

1.  **Query Assistance & NLQ Accuracy:**
    - Enhance Query Helper UI (schema-aware autocomplete, advanced filters).
    - Improve NLQ ambiguity handling and refine LLM prompting strategies.
2.  **Development Environment & Code Health:**
    - Resolve outstanding frontend TypeScript errors and Pylance module resolution issues.
3.  **Frontend Refactoring & Stability:**
    - Continue refactoring components like `DatabaseQuery.tsx` as needed.
    - Focus on production stability, logging, and performance optimizations.
4.  **New Feature Development (as prioritized):**
    - Data visualization capabilities.
    - Mobile responsiveness enhancements.

## Feature: Contact Import Source Tagging

**Objective:** Add a way to tag contacts with their import source and display this tag, plus allow bulk-tagging of existing contacts.

**Overall Progress:** Mostly complete, pending database recovery and final verification.

### Completed Tasks:

**1. Database and Model Changes:**
    *   Added `import_source_tag: Mapped[Optional[str]]` to `Contact` model (`src/models/sports_models.py`).
    *   Troubleshot and successfully generated an Alembic migration (`58e7409c6c41...`) after resolving `env.py` model loading issues.
    *   Manually edited the migration to include only `add_column` for `import_source_tag` and `create_index` for `ix_contacts_import_source_tag`.
    *   Successfully applied this migration (before database loss).

**2. Backend API and Service Changes:**
    *   Modified `ContactsService.import_linkedin_csv` to accept and use `import_source_tag` (`src/services/contacts_service.py`).
    *   Updated API endpoint `/api/v1/contacts/import/linkedin` to accept `import_source_tag` as Form data (`src/api/routes/contacts.py`).

**3. Frontend UI Changes (Import Form):**
    *   In `frontend/src/components/common/LinkedInCSVImport.tsx`:
        *   Added state and input field for `importSourceTag`.
        *   Updated `handleFileSelect` to include `import_source_tag` in `FormData`.
        *   Resolved linter errors related to `apiClient.post` config.

**4. Frontend UI Changes (Displaying the Tag):**
    *   Updated `Contact` interface in `frontend/src/pages/Contacts.tsx`.
    *   In `frontend/src/components/common/ContactsList.tsx`:
        *   Updated local `Contact` interface.
        *   Added column definition and rendering for "Import Tag".
        *   Made tag column visible by default.
        *   Fixed linter error by removing unsupported `timeout` from `apiClient.post`.

**5. Backend Schema for API Response:**
    *   Added `import_source_tag: Optional[str] = None` to `ContactBase` Pydantic schema in `src/schemas/contacts.py`.

**6. Bulk Tagging Feature for Existing Contacts:**
    *   **Backend:**
        *   Added `bulk_update_contacts_tag` method to `ContactsService`.
        *   Added `BulkUpdateTagRequest` Pydantic model.
        *   Added `POST /api/v1/contacts/bulk-update-tag` API endpoint.
    *   **Frontend:**
        *   Added "Bulk Update Tags" button and modal form in `ContactsPage.tsx`.
        *   Implemented `handleBulkTagOk` to call the new API.

**7. Selective Contact Retagging (NEW):**
    *   **Backend:**
        *   Added `BulkUpdateSpecificContactsTagRequest` Pydantic schema for request body (`src/schemas/contacts.py`).
        *   Implemented `ContactsService.bulk_update_specific_contacts_tag` to update tags for a provided list of contact IDs (`src/services/contacts_service.py`).
        *   Created new API endpoint `POST /api/v1/contacts/bulk-update-specific-tags` (`src/api/routes/contacts.py`).
        *   Corrected `status` import in `contacts.py` API routes.
    *   **Frontend (`ContactsList.tsx`):**
        *   Added state management for selected contact IDs.
        *   Implemented checkboxes in the table for individual contact selection and a header checkbox for select/deselect all visible.
        *   Added a "Retag Selected (N)" button, enabled when contacts are selected.
        *   Implemented a modal for users to input the new tag.
        *   Ensured the contacts list directly refetches data after a successful retag operation for immediate UI update.
    *   **Bug Fix (Related to Contacts List):**
        *   Corrected a bug where custom column order (from `localStorage`) could cause data cells to misalign with their headers. Refactored `<tbody>` rendering in `ContactsList.tsx` to iterate over `columnOrder` for data cells, ensuring consistent alignment with headers.

**8. Database Issue Identification:**
    *   Investigated login failure.
    *   Discovered an empty database (no tables, including `alembic_version`).
    *   Identified the cause: `docker-compose down -v` deleted the `postgres-data` volume.

### Current Status & Next Steps:

**A. Database Restore & Migration:**
    1.  **Services Started:** `db`, `backend`, `frontend` services started via `docker-compose up -d`.
    2.  **Backup Copied:** Backup file `backup_20250515_173015.sql` copied into the `db` container at `/tmp/backup_20250515_173015.sql`.
    3.  **Restore from Backup:** Execute `psql` in the `db` container to restore the backup.
        *   `docker-compose -p sheetgpt -f docker-compose.yml -f docker-compose.dev.yml exec -T db psql -U postgres -d postgres -f /tmp/backup_20250515_173015.sql`
    4.  **Determine Alembic State:** Check the `alembic_version` table post-restore to find the last applied migration from the backup.
        *   `docker-compose -p sheetgpt -f docker-compose.yml -f docker-compose.dev.yml exec -T db psql -U postgres -d postgres -c "TABLE alembic_version;"`
    5.  **Apply Missing Migrations:** Run `alembic upgrade head` (or to a specific version if needed) to apply subsequent migrations, including the one for `import_source_tag`.
        *   `docker-compose -p sheetgpt -f docker-compose.yml -f docker-compose.dev.yml exec backend python src/scripts/alembic_wrapper.py upgrade head`

**B. Verification:**
    1.  Confirm user login is functional.
    2.  Test importing contacts with `import_source_tag`.
    3.  Verify the tag is displayed correctly in the contacts list.
    4.  Test the bulk-tagging feature for existing contacts.
    5.  Test the selective retagging feature for specific contacts.
    6.  Perform a general check of application stability.