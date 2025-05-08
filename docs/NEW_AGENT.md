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

- **Primary Tool:** Docker and `docker-compose`. Use `docker-compose.yml`.
- **Key Commands:**
  - Start Services: `docker-compose up -d` (or `docker-compose up` for logs)
  - Stop Services: `docker-compose down`
  - Stop & Remove Volumes: `docker-compose down -v` (Needed after certain changes, see below)
  - Rebuild Service: `docker-compose build --no-cache <service_name>` (e.g., `frontend`, `backend`)
  - Run Backend Tests: `docker-compose run --rm backend pytest`
  - Run Frontend Tests: `./run-tests.sh` (Uses `frontend/Dockerfile.test`)
  - Apply DB Migrations: `docker-compose run --rm backend python src/scripts/alembic_wrapper.py upgrade`

- **Dependencies:**
  - **Backend:** Managed by `pip` via `requirements.txt`. Install happens during `docker-compose build backend`.
  - **Frontend:** Managed by `yarn` via `frontend/package.json` and `frontend/yarn.lock`. Install happens during `docker-compose build frontend`.
  - **IMPORTANT:** Frontend dependencies can be tricky due to Docker volumes. If Vite/dependency errors occur:
    1. Ensure `frontend/.dockerignore` includes `node_modules`.
    2. Run `docker-compose down -v` to clear stale volumes.
    3. Rebuild: `docker-compose build --no-cache frontend`.
    4. See `docs/development/DEPENDENCY_ANALYSIS.md` for full history.

- **Further Reading:**
  - `CLAUDE.md` (Root file, contains more build details, style guides)
  - `docs/development/DEV_INTRO_TESTING.md` (Testing details)

## Code Structure & Patterns

- **Backend (`src/`):** Organized by features (`api`, `services`, `models`, `schemas`). Uses facade pattern in services.
- **Frontend (`frontend/src/`):** Organized by features/components (`components`, `pages`, `hooks`, `contexts`, `services`). Emphasizes custom hooks for state management and logic.
- **Further Reading:**
  - `docs/development/REFACTORING_GUIDE.md` (Project-specific coding patterns)

## Current Status (May 7, 2025)

- Core features (Chat, Sports DB, Data Mapping, Export) are implemented.
- Recent major work involved fixing frontend dependency issues (switched to Yarn, fixed Docker build/volume conflicts) and implementing representative brand matching for contact imports/re-scans.
- See `docs/PROGRESS.md` for a detailed history of updates and fixes.

## Current Focus

(As per `PROGRESS.md`)
1.  **Production Stability Improvements** (Logging, reliability, performance).
2.  **Data Visualization Capabilities** (Relationship graphs, dashboards).
3.  **Mobile Responsive Enhancements** (Layouts, controls, performance).

---
*This document provides a starting point. Please refer to the linked documents for more detail.*
*Last updated: May 7, 2025*