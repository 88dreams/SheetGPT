# NEW AGENT QUICK START

## Project Overview

SheetGPT combines AI-powered chat (Claude) with structured data management and a comprehensive sports database.

- **Production URLs:**
  - Frontend: [https://88gpts.com/sheetgpt](https://88gpts.com/sheetgpt)
  - Backend API: [https://api.88gpts.com/api/v1/](https://api.88gpts.com/api/v1/)

## Architecture

- **Backend:** Python (3.9), FastAPI, PostgreSQL (via Docker service `db`), SQLAlchemy (async). Code in `src/`.
- **Frontend:** React, TypeScript, Vite, Yarn, TailwindCSS. Code in `frontend/`.
- **Deployment:** Backend on Digital Ocean App Platform, Frontend on Netlify.
- **Key Concepts:**
  - **Universal Brand Model:** `src/models/sports_models.py::Brand` handles all companies (broadcasters, production companies, sponsors).
  - **Representative Brands:** The `Brand` model is also used to represent non-company entities (League, Team, Stadium, ProductionService) for contact association via the `representative_entity_type` field.
  - **Entity Resolution:** Services exist to resolve entity names to IDs (`src/services/sports/`).
  - **Contacts:** Imported contacts (`src/models/sports_models.py::Contact`) are linked to Brands (real or representative) via `ContactBrandAssociation`.
  - **AI Schema Context:** A descriptive schema with guidelines (`src/config/database_schema_for_ai.md`) is provided to the backend LLM (Claude) to improve NLQ-to-SQL accuracy.
  - **Enhanced CSV Import:** The contacts page features an advanced CSV import tool (`CustomCSVImport.tsx`) with client-side parsing (`papaparse`), record navigation, preamble skipping, and a detailed field mapping UI.
  - **Advanced Entity Features:** Includes multi-column OR search for entities and global sorting capabilities that handle complex data relationships by performing necessary in-memory sorting before pagination.
  - **LLM Selection:** The chat interface allows users to select from different available Large Language Models.

- **Further Reading:**
  - `docs/architecture/TECHNICAL_DESCRIPTION.md` (Detailed architecture)
  - `docs/architecture/API_ARCHITECTURE.md` (API structure and endpoints)

## Development Setup

- **Primary Tool:** Docker and `docker-compose`. The recommended development workflow is using VS Code (or Cursor) with the **Dev Containers extension**.
- **Dev Container:** Configuration is in `.devcontainer/devcontainer.json`. When you use "Reopen in Container", it automatically starts the `frontend`, `backend`, and `db` services from `docker-compose.yml`. The `frontend` service runs the Vite dev server in development mode (HMR enabled).
- **Key Manual Docker Commands (if not using Dev Container, or for specific tasks):**
  - Start All Services: `docker-compose up -d`
  - Stop Services: `docker-compose down`
  - Stop & Remove Volumes (e.g., for DB reset): `docker-compose down -v`
  - Rebuild Service (e.g., after Dockerfile changes): `docker-compose build --no-cache <service_name>` (e.g., `frontend`, `backend`, `app`)
  - Run Backend Tests: `docker-compose run --rm backend pytest`
  - Run Frontend Tests: `./run-tests.sh` (Uses `frontend/Dockerfile.test`)
  - Apply DB Migrations: `docker-compose run --rm backend python src/scripts/alembic_wrapper.py upgrade`

- **Dependencies:**
  - **Backend:** Managed by `pip` via `requirements.txt`. Install happens during `docker-compose build backend`.
  - **Frontend:** Managed by `yarn` (via a root `package.json` and `yarn.lock` defining a workspace that includes `frontend/`).
    - Dependencies are installed during the build of the `frontend` service. The Docker build context is the project root, and the `frontend/Dockerfile` copies necessary root files ( `package.json`, `yarn.lock`) and then the `frontend/` directory contents.
    - The `frontend` service in `docker-compose.yml` (and `docker-compose.override.yml`) is configured with `NODE_ENV=development` for Vite dev server, with volume mounts correctly mapping local `./frontend` source to `/app/frontend` in the container and preserving the root `/app/node_modules`.
  - **Troubleshooting Docker/Frontend:**
    1. Ensure root `.dockerignore` excludes `frontend/node_modules`.
    2. The build context for `frontend` service in `docker-compose.yml` and `docker-compose.override.yml` should be `.` (project root) with `dockerfile: frontend/Dockerfile`.
    3. Local Node.js environment should ideally use NVM to match Node 18.x for consistent `yarn install` behavior if generating/updating `yarn.lock` locally.

- **Further Reading:**
  - `CLAUDE.md` (Root file, contains more build details, style guides)
  - `docs/development/DEV_INTRO_TESTING.md` (Testing details)

## Code Structure & Patterns

- **Backend (`src/`):** Organized by features (`api`, `services`, `models`, `schemas`). Uses facade pattern in services. `database_management.py` has been refactored into more focused services.
- **Frontend (`frontend/src/`):** Organized by features/components (`components`, `pages`, `hooks`, `contexts`, `services`). Emphasizes custom hooks for state management and logic. `DatabaseQuery.tsx` has been enhanced with state persistence and a new Query Helper modal.
- **Further Reading:**
  - `docs/development/REFACTORING_GUIDE.md` (Project-specific coding patterns)

## Current Status (May 17, 2025)

- **Development Environment & Database:** Stable and operational.
- **Core Functionality:** Key features (Chat, Sports DB, Data Mapping, Export, CSV Contact Import) are functional.
- **Database Query Page:** 
    - Implemented robust state persistence for query inputs, SQL, and results using `sessionStorage`.
    - Fixed issues with clearing query inputs/results and their persisted state.
- **NLQ-to-SQL Translation:**
    - Significantly improved by providing a detailed schema context file (`database_schema_for_ai.md`) to the backend LLM (Claude).
    - This context includes guidelines for case-insensitive queries and better entity resolution.
    - Addressed backend bugs in `EntityNameResolver` for more accurate data display.
- **Query Helper UI:** 
    - Added a new backend endpoint (`/api/v1/db-management/schema-summary`) to serve structured schema info to the frontend.
    - Implemented a `SchemaContext` for frontend schema access.
    - Developed an initial "Query Helper / Builder" modal that allows users to select tables, apply basic filters, and generate an NLQ string.
- **UI Maintenance:** Resolved several Ant Design Modal deprecation warnings (`visible` to `open` prop).
- See `docs/PROGRESS.md` for a detailed history of updates and fixes.

## Current Focus

1.  **Enhance Query Helper UI & NLQ Assistance:** 
    - Add schema-aware autocomplete/hints to the main NLQ input.
    - Improve filter capabilities (e.g., operators, value suggestions) in the Query Helper modal.
2.  **Improve NLQ Ambiguity Handling:** Further explore strategies to detect and resolve ambiguous user queries, potentially by guiding the LLM or enhancing frontend assistance.
3.  **Resolve Frontend TypeScript & Linter Errors:** Address outstanding TypeScript errors and module resolution issues (Pylance warnings) in `frontend/src/` and backend files.
4.  **Continue Frontend Refactoring:** As needed, particularly for `DatabaseQuery.tsx` if further modularization is beneficial.
5.  **Production Stability & Performance Improvements.**

## Project Status: Import Source Tag Feature & Database Recovery

**Objective:** Implement an `import_source_tag` for Contacts to track their origin, and allow bulk tagging of existing contacts.

**Current Situation:**

The project was progressing well, with backend and frontend changes largely complete for adding the `import_source_tag` to individual contact imports and display, as well as a new bulk-tagging feature. However, a `docker-compose down -v` command was inadvertently run, which deleted the PostgreSQL data volume, leading to a complete loss of database tables.

**Immediate Next Steps:**

1.  **Restore Database from Backup:**
    *   A backup file (`backup_20250515_173015.sql`) has been copied into the `sheetgpt-db-1` Docker container at `/tmp/backup_20250515_173015.sql`.
    *   The immediate task is to restore this backup using `psql` inside the `db` container. The command will likely be:
        ```bash
        docker-compose -p sheetgpt -f docker-compose.yml -f docker-compose.dev.yml exec -T db psql -U postgres -d postgres -f /tmp/backup_20250515_173015.sql
        ```
2.  **Assess Alembic State Post-Restore:**
    *   After the restore, we need to check the `alembic_version` table to see which migration was last applied *before* the backup was taken.
    *   Command:
        ```bash
        docker-compose -p sheetgpt -f docker-compose.yml -f docker-compose.dev.yml exec -T db psql -U postgres -d postgres -c "TABLE alembic_version;"
        ```
3.  **Apply Subsequent Alembic Migrations:**
    *   Identify any migrations generated *after* the backup point, especially the one that adds the `import_source_tag` column to the `contacts` table (likely `58e7409c6c41...` or a successor if new ones were generated before the data loss).
    *   Run `alembic upgrade head` (or to the specific migration ID) to bring the database schema up to date with the latest model changes.
        ```bash
        docker-compose -p sheetgpt -f docker-compose.yml -f docker-compose.dev.yml exec backend python src/scripts/alembic_wrapper.py upgrade head
        ```
4.  **Verify Functionality:**
    *   Once the database is restored and migrations are applied, thoroughly test:
        *   User login.
        *   Importing contacts with the new `import_source_tag`.
        *   Display of the `import_source_tag` in the contacts list.
        *   The bulk-tagging feature.

**Key Files Modified for `import_source_tag` feature:**

*   **Models:** `src/models/sports_models.py` (added `import_source_tag` to `Contact`)
*   **Schemas:** `src/schemas/contacts.py` (added `import_source_tag` to `ContactBase`, `BulkUpdateTagRequest`)
*   **Services:** `src/services/contacts_service.py` (modified `import_linkedin_csv`, added `bulk_update_contacts_tag`)
*   **API Routes:** `src/api/routes/contacts.py` (modified `/import/linkedin`, added `/bulk-update-tag`)
*   **Alembic:**
    *   `alembic/env.py` (modified to ensure `sports_models` are loaded)
    *   Migration script (e.g., `alembic/versions/58e7409c6c41_... .py`) for adding the column and index.
*   **Frontend Components:**
    *   `frontend/src/components/common/LinkedInCSVImport.tsx` (added input field for tag)
    *   `frontend/src/pages/Contacts.tsx` (added bulk update modal, updated `Contact` interface)
    *   `frontend/src/components/common/ContactsList.tsx` (added column and display for tag)

**Important Note on Alembic:** The Alembic setup required explicit import of `sports_models` in `env.py` to correctly autogenerate migrations. The migration script for `import_source_tag` was manually edited to ensure only the necessary changes were applied.

The primary goal now is to recover the database to a known good state and then ensure all schema changes for the `import_source_tag` are correctly applied and functional.

---
*This document provides a starting point. Please refer to the linked documents for more detail.*
*Last updated: May 17, 2025*