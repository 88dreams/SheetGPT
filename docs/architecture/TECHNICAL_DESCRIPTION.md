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

**Objective:** Allow users to specify an `import_source_tag` during contact import (e.g., LinkedIn CSV import), display this tag, and provide a mechanism to bulk-tag existing contacts.

### 1. Data Model (SQLAlchemy)

*   **File:** `src/models/sports_models.py`
*   **Model:** `Contact`
*   **Change:** Added a new field `import_source_tag`.
    ```python
    class Contact(Base, HasUser):
        # ... other fields ...
        import_source_tag: Mapped[Optional[str]]
    ```
*   **Database Migration (Alembic):**
    *   An Alembic migration script (e.g., `alembic/versions/58e7409c6c41_add_import_source_tag_to_contacts.py`) was generated and manually refined.
    *   **Operations:**
        *   `op.add_column('contacts', sa.Column('import_source_tag', sa.String(), nullable=True))`
        *   `op.create_index(op.f('ix_contacts_import_source_tag'), 'contacts', ['import_source_tag'], unique=False)`
    *   **Note:** `alembic/env.py` was modified to explicitly import models from `src.models.sports_models` to ensure correct autogeneration (`from src.models.sports_models import *`).

### 2. Backend Implementation

#### 2.1. Pydantic Schemas

*   **File:** `src/schemas/contacts.py`
*   **Changes:**
    *   `ContactBase` (and thus `ContactResponse`, `ContactWithBrandsResponse`): Added `import_source_tag: Optional[str] = None` to include it in API responses.
    *   `BulkUpdateTagRequest`: New schema for the bulk update endpoint.
        ```python
        class BulkUpdateTagRequest(BaseModel):
            new_tag: str
            target_contacts: str = Field(default="all_untagged", pattern="^(all|all_untagged)$")
        ```

#### 2.2. Service Layer

*   **File:** `src/services/contacts_service.py`
*   **Class:** `ContactsService`
*   **Method:** `import_linkedin_csv`
    *   Modified to accept `import_source_tag: Optional[str]`.
    *   When creating or updating `Contact` objects, this tag is now set.
*   **New Method:** `bulk_update_contacts_tag`
    ```python
    async def bulk_update_contacts_tag(
        self, user_id: UUID, new_tag: str, target_contacts: str = "all_untagged"
    ) -> int: # Returns count of updated contacts
        stmt = select(Contact).filter_by(user_id=user_id)
        if target_contacts == "all_untagged":
            stmt = stmt.filter(Contact.import_source_tag.is_(None))
        
        contacts_to_update = await self.session.scalars(stmt)
        updated_count = 0
        for contact in contacts_to_update:
            contact.import_source_tag = new_tag
            self.session.add(contact)
            updated_count += 1
        
        if updated_count > 0:
            await self.session.commit()
        return updated_count
    ```

#### 2.3. API Endpoints

*   **File:** `src/api/routes/contacts.py`
*   **Endpoint:** `POST /api/v1/contacts/import/linkedin`
    *   Modified to accept `import_source_tag: Optional[str] = Form(None)`.
    *   Passes the `import_source_tag` to `ContactsService.import_linkedin_csv`.
*   **New Endpoint:** `POST /api/v1/contacts/bulk-update-tag`
    ```python
    @router.post("/bulk-update-tag", status_code=status.HTTP_200_OK)
    async def bulk_update_contacts_import_tag(
        current_user: Annotated[User, Depends(get_current_active_user)],
        request_body: BulkUpdateTagRequest,
        contacts_service: ContactsService = Depends(get_contacts_service),
    ):
        updated_count = await contacts_service.bulk_update_contacts_tag(
            user_id=current_user.id,
            new_tag=request_body.new_tag,
            target_contacts=request_body.target_contacts,
        )
        return {"message": f"Successfully updated {updated_count} contacts.", "updated_count": updated_count}
    ```

### 3. Frontend Implementation

#### 3.1. LinkedIn CSV Import Component

*   **File:** `frontend/src/components/common/LinkedInCSVImport.tsx`
*   **Changes:**
    *   Added state for `importSourceTag`: `const [importSourceTag, setImportSourceTag] = useState<string>('');`
    *   Added an `Input` field for the user to enter the tag.
        ```tsx
        <Input
          placeholder="Enter import source tag (e.g., SpringConference2024)"
          value={importSourceTag}
          onChange={(e) => setImportSourceTag(e.target.value)}
          style={{ marginTop: '10px' }}
        />
        ```
    *   Modified `handleFileSelect` to append `import_source_tag` to `FormData` if provided:
        ```javascript
        if (importSourceTag) {
          formData.append('import_source_tag', importSourceTag);
        }
        // apiClient.post call adjusted for FormData with potential query params in URL
        ```

#### 3.2. Contacts Page & List

*   **File:** `frontend/src/pages/Contacts.tsx`
    *   Updated `Contact` interface to include `import_source_tag?: string;`.
    *   Added state for bulk update modal visibility and form data.
    *   Implemented "Bulk Update Tags" button, Modal, and Form (Ant Design components).
    *   Function `handleBulkTagOk` calls the `/api/v1/contacts/bulk-update-tag` endpoint.
*   **File:** `frontend/src/components/common/ContactsList.tsx`
    *   Updated local `Contact` interface: `interface Contact extends DefaultContact { import_source_tag?: string; }`
    *   Added column definition for "Import Tag":
        ```tsx
        {
          key: 'import_source_tag',
          title: 'Import Tag',
          dataIndex: 'import_source_tag',
          sorter: (a, b) => (a.import_source_tag || '').localeCompare(b.import_source_tag || ''),
          render: (tag?: string) => tag || '-',
        }
        ```
    *   Added `import_source_tag` to default visible columns (`visibleColumns`, `showAllColumns`, `initialColumnOrder`).
    *   Rendered the tag in the table body: `<td>{contact.import_source_tag || '-'}</td>`.

### 4. Key Challenges & Solutions during this Feature Development

*   **Alembic Autogeneration:** Initially, Alembic tried to drop all tables. This was resolved by ensuring all SQLAlchemy models (especially those in `src/models/sports_models.py`) were imported into `target_metadata` within `alembic/env.py`.
*   **Manual Migration Editing:** The autogenerated migration script was overly aggressive. It was manually edited to only include the necessary `add_column` and `create_index` operations for the `import_source_tag`.
*   **Frontend API Calls:** Adjustments were needed for `apiClient.post` when sending `FormData` and ensuring query parameters were part of the URL string, not in the config object for such POST requests. Unsupported `headers` and `timeout` properties were removed from some `apiClient.post` calls using `FormData` or where not applicable.
*   **Database Reset:** Accidental deletion of the `postgres-data` volume via `docker-compose down -v` necessitated a database restore from backup and a re-application of migrations. This highlighted the importance of careful volume management and regular backups.