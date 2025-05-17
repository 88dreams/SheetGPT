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
- **Frontend (`frontend/src/`):** Organized by features/components (`components`, `pages`, `hooks`, `contexts`, `services`). Emphasizes custom hooks for state management and logic. `DatabaseQuery.tsx` is undergoing refactoring.
- **Further Reading:**
  - `docs/development/REFACTORING_GUIDE.md` (Project-specific coding patterns)

## Current Status (June 15, 2025)

- **Development Environment:** Stable Docker Dev Container environment established for frontend development. This resolved numerous persistent build and runtime issues.
- **Database:** Restored from backup and all Alembic migrations successfully applied. Schema is up-to-date.
- **Core Functionality:** Key features like Chat, Sports DB, Data Mapping, and Export remain implemented. Contact import (CSV) is now functional after resolving `Content-Type` and API pathing issues.
- **Refactoring:** 
    - Backend: `database_management.py` refactoring into smaller services is complete.
    - Frontend: `DatabaseQuery.tsx` refactoring is partially complete and unblocked.
- See `docs/PROGRESS.md` for a detailed history of updates and fixes.

## Current Focus

1.  **Resolve Frontend TypeScript Errors:** Address outstanding TypeScript errors in `frontend/src/` codebase, leveraging the stable Dev Container environment.
2.  **Continue Frontend Refactoring:** Complete the refactoring of `DatabaseQuery.tsx` and other targeted components.
3.  **Production Stability Improvements** (Logging, reliability, performance).
4.  **Data Visualization Capabilities** (Relationship graphs, dashboards).
5.  **Mobile Responsive Enhancements** (Layouts, controls, performance).

---
*This document provides a starting point. Please refer to the linked documents for more detail.*
*Last updated: June 15, 2025*