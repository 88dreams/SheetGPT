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
├── services/          # Business logic
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

3. **UI Features**
   - Column persistence with drag-and-drop
   - Toggle between UUIDs and human-readable names
   - Standardized table styling for consistency
   - Resolution confidence visualization
   - Enhanced entity search with fuzzy matching

#### Build & Dependency Management (Updated May 7, 2025)
- Uses `yarn` (v1) for dependency management (switched from `npm` due to resolution issues).
- Development: 
  - The `frontend` service in `docker-compose.yml` uses `frontend/Dockerfile`.
  - `frontend/Dockerfile` sets `NODE_ENV=development` and its `CMD` starts the Vite dev server (`./node_modules/.bin/vite --host 0.0.0.0`).
  - The `frontend` service in `docker-compose.yml` also ensures `NODE_ENV=development` is set, overriding any Dockerfile ENV if different, for a consistent development server experience.
- Production Build:
  - The root `Dockerfile` contains a `frontend-builder` stage.
  - This stage installs dependencies using `yarn install --frozen-lockfile`.
  - Crucially, it now executes `RUN yarn build` to compile static frontend assets into `frontend/dist/`.
  - The `backend-prod` stage in the root `Dockerfile` (used by the `app` service in `docker-compose.yml`) copies these assets from `/app/frontend/dist` (within the `frontend-builder` stage) to its own `/app/frontend/dist` to be served.
- `frontend/.dockerignore` prevents local `node_modules` from overwriting the container's during the `COPY . .` build step in `frontend/Dockerfile`.
- Docker anonymous volume for `/workspace/frontend/node_modules` (as defined in `docker-compose.yml` for the `frontend` service) helps persist dependencies between runs while allowing local code syncing for development.
- **Important:** If encountering unexpected dependency versions at runtime or build issues, ensure stale anonymous volumes are cleared using `docker-compose down -v` and consider rebuilding images with `--no-cache`.

#### Notable Fixes
- **Pagination:** Resolved issue where paginated entity lists (e.g., Brands) did not update correctly on page change by disabling `keepPreviousData` in the relevant `useQuery` configuration within `SportsDatabaseContext`.

## Key Data Flow Patterns

1. **Natural Language to SQL**
   ```
   Question → Schema Context → Claude AI → SQL Generation → 
   Validation → Execution → Name Resolution → Display
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

## Current Focus Areas

1. **Production Stability**
   - Enhanced error logging
   - Backend service reliability
   - Database query optimization

2. **Data Visualization**
   - Interactive relationship visualization
   - Analytics dashboard
   - Time-based data exploration

3. **Mobile Responsiveness**
   - Table layouts for smaller screens
   - Touch-friendly controls
   - Optimized mobile performance