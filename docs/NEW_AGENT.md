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
  - **Frontend:** Managed by `yarn` via `frontend/package.json` and `frontend/yarn.lock`. 
    - Dependencies are installed during the build of the `frontend` service (for dev) and the `frontend-builder` stage (for prod assets in the `app` service). Both now correctly use `yarn`.
    - The `frontend` service in `docker-compose.yml` is configured with `NODE_ENV=development` for Vite dev server.
  - **Troubleshooting Docker/Frontend:**
    1. Ensure root `.dockerignore` excludes `frontend/node_modules` and `frontend/.dockerignore` excludes `node_modules`.
    2. If dependency or caching issues arise, try: `docker compose down -v` then `docker compose build --no-cache frontend` (or `app` if `frontend-builder` is suspect).
    3. Base images for frontend builds (dev and prod) are now `node:18-bullseye` for better VS Code Server compatibility.
    4. See `docs/development/DEPENDENCY_ANALYSIS.md` for historical context.

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

---
*This document provides a starting point. Please refer to the linked documents for more detail.*
*Last updated: May 17, 2025*