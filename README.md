# SheetGPT

## Project Overview

SheetGPT is a full-stack application that combines AI-powered chat capabilities with structured data management and sports database functionality. The application allows users to:

1. Chat with an AI assistant to extract and structure data
2. Manage and transform structured data in a tabular format
3. Create and manage sports-related entities (leagues, teams, players, etc.)
4. Export data to Google Sheets for further analysis and sharing

## Current Status

As of June 15, 2025:

- **Development Environment:** A stable Docker-based development environment using VS Code (or Cursor) Dev Containers is now established and the primary way to work on the project. This has resolved numerous previous build, dependency, and runtime issues.
- **Database:** The primary database has been restored from a backup, and all Alembic migrations are successfully applied, ensuring the schema is up-to-date.
- **Core Functionality:**
  - LinkedIn CSV Import for contacts is now fully functional, including brand relationship matching.
  - SportDataMapper component is operational.
  - User authentication, AI chat, structured data management, sports database features, and Google Sheets export are implemented.
- **Backend Refactoring:** The main database service (`database_management.py`) has been refactored into more focused, maintainable services (e.g., for queries, AI processing, admin tasks).
- **Frontend Refactoring:** The `DatabaseQuery.tsx` page is partially refactored, and this work is now unblocked.
- **Next Steps:** The immediate focus is on resolving outstanding TypeScript errors in the `frontend/src/` codebase.

For detailed progress, see [docs/PROGRESS.md](docs/PROGRESS.md).

## Recent Improvements

### Dev Environment Stabilization & Critical Bug Fixes (June 2025)
- Successfully configured and connected to a Docker Dev Container for the `frontend` service after extensive troubleshooting.
- Resolved multiple Docker build errors including issues with the `frontend-builder` stage, type definition conflicts (e.g., `react-virtualized-auto-sizer`), and VS Code Server compatibility (by changing base images from Alpine to Debian Bullseye).
- Corrected `.devcontainer` configurations (`workspaceFolder`, `runServices`, GID conflict resolution) and added a root `.dockerignore`.
- Restored the database from backup and applied all Alembic migrations, fixing schema-related errors.
- Fixed the LinkedIn CSV contact import feature by resolving `Content-Type` handling for `FormData` in the frontend API client and correcting API pathing.

### Dependency Troubleshooting (May 2025)
- Conducted extensive investigation into persistent @tanstack/react-query dependency issues
- Created comprehensive analysis of version mismatch between v4.29.5 and v5.66.8
- Tested multiple resolution approaches including package overrides, Docker rebuilds, and custom adapters
- Developed module resolution strategies for managing complex NPM dependencies
- Created parallel development branches for testing different solution approaches
- Documented troubleshooting process in DEPENDENCY_ANALYSIS.md for future reference
- For detailed information, see the [Dependency Analysis Document](DEPENDENCY_ANALYSIS.md)

### LinkedIn CSV Contact Import (April 2025)
- Created new database models for contacts and brand associations with confidence scoring
- Implemented CSV import with flexible column mapping for LinkedIn export formats
- Built comprehensive frontend components for contact management (list, detail, and import views)
- Added sophisticated fuzzy matching algorithm for company name-to-brand resolution
- Implemented contact-to-brand matching with multiple matching strategies
- Created detailed import statistics with duplicate detection and error reporting
- Added configurable import options with adjustable matching threshold
- Properly indexed database fields for optimized querying
- Integrated contact management with main navigation and application flow
- See full details in [LinkedIn Integration Documentation](docs/features/LINKEDIN_INTEGRATION.md)

### Brand Relationship Entity Consolidation
- Integrated Brand Relationship functionality directly into the Brand entity
- Added partner and partner_relationship fields to the Brand model
- Implemented cross-entity partner resolution for referencing leagues, teams, etc.
- Enhanced validation ensuring partner is specified when relationship type is provided
- Improved UI with more streamlined entity management
- Simplified database schema with more efficient relationship model
- Reduced complexity by eliminating separate relationship table

### Enhanced Google Sheets Export
- Implemented column visibility control for targeted exports showing only needed fields
- Added Google Drive folder selection with support for creating new folders
- Implemented CSV fallback mechanism when Google authentication fails
- Enhanced error handling and status reporting during export process
- Added support for exporting all entity rows (not just visible/paginated ones)
- Fixed authentication issues with proper token validation and refresh

### Database Maintenance Workflow
- Implemented flexible database maintenance system with informative warning dialogs
- Created four-step workflow (backup, analysis, cleanup, optimization) that allows any step to be run at any time
- Enhanced duplicate record fixing with ability to rerun cleanup operations multiple times
- Added detailed reporting of space savings and performance improvements
- Implemented warning system for potentially risky operations with clear explanations
- Added visual progress tracking for all maintenance steps
- Enhanced UI with immediate feedback during operations

### Hybrid Filtering Approach for Sports Database
- Implemented a robust filtering system that utilizes backend filtering with client-side fallback
- Enhanced backend filter processing with improved error handling and diagnostics
- Fixed SQL query parameter binding issues and added special handling for problematic filters
- Added automatic fallback mechanisms when backend filtering encounters issues
- Enhanced client-side filtering activation with intelligent detection
- Added comprehensive logging and UI updates to display matching entity counts
- Implemented filter persistence using localStorage

## Development Setup

The project uses Docker for development. **The recommended method is to use the VS Code (or Cursor) Dev Containers extension.**

1.  **Prerequisites:**
    *   Docker Desktop installed and running.
    *   VS Code or Cursor editor.
    *   The "Dev Containers" extension installed in your editor.

2.  **Getting Started with Dev Containers:**
    *   Clone the repository: `git clone https://github.com/yourusername/sheetgpt.git && cd sheetgpt`
    *   Open the `SheetGPT` folder in VS Code/Cursor.
    *   Use the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`) and run: `Dev Containers: Reopen in Container`.
    *   The extension will build the necessary images (if not already built or if `--no-cache` was used recently) and start the `frontend`, `backend`, and `db` services as defined in `.devcontainer/devcontainer.json` and `docker-compose.yml`.
    *   The frontend (Vite dev server) will be available at `http://localhost:5173`.
    *   The backend API (FastAPI) will be available at `http://localhost:8000` (or `http://backend:8000` from within the Docker network).

3.  **Manual Docker Compose Commands (for specific tasks outside Dev Container or for troubleshooting):**
    ```bash
    # Start all services in detached mode
    docker compose up -d

    # Stop all services
    docker compose down

    # Stop services AND remove volumes (e.g., to reset database)
    docker compose down -v

    # Rebuild a specific service image, ignoring cache
    docker compose build --no-cache <service_name>  # e.g., frontend, backend, app

    # Apply database migrations (after db and backend are up)
    docker compose run --rm backend python src/scripts/alembic_wrapper.py upgrade

    # Run backend tests
    docker compose run --rm backend pytest

    # Run frontend tests
    ./run-tests.sh
    ```

- For database initialization details if issues persist after migrations, see the `Database Initialization` section below or `docs/NEW_AGENT.md`.

## Database Initialization

If you encounter authentication issues or missing database tables, you can use the included initialization script:

```bash
# Copy and run the initialization script in the backend container
docker cp init_db.py sheetgpt-backend-1:/app/ && docker exec -it sheetgpt-backend-1 python /app/init_db.py
```

The script performs the following actions:
- Creates all necessary database tables if they don't exist
- Preserves any existing data in the database
- Creates a test user if one doesn't exist (email: test@example.com, password: password123)

This is particularly useful when:
- Setting up the application for the first time
- Recovering from database connection issues
- Troubleshooting authentication problems
- After rebuilding Docker containers

## Running Tests

The project includes automated tests for both frontend and backend components. Tests can be run using Docker to ensure a consistent environment:

```bash
# Run all frontend tests in Docker
./run-tests.sh

# Run tests locally (if you have Node.js installed)
./run-tests-local.sh
```

The test suite includes:
- Unit tests for React components
- Tests for custom hooks
- Tests for utility functions
- Tests for data transformation logic

All tests are automatically run in the CI/CD pipeline when code is pushed to the main branch or when a pull request is created.

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment. The CI/CD pipeline is configured to:

1. Run automatically on pushes to the main branch and pull requests
2. Build and test the application in a Docker environment
3. Verify that all tests pass before allowing merges to the main branch
4. Run nightly tests automatically at midnight UTC to catch any regressions

To monitor CI/CD workflow runs:

```bash
# List recent workflow runs
gh run list

# View details of a specific run
gh run view [run-id]

# Watch a workflow run in real-time
gh run watch [run-id]
```

For more detailed information about the CI/CD pipeline, see [CI/CD Pipeline](docs/CI_CD_PIPELINE.md).

## Dependencies

- Frontend: React, TypeScript, React Query, TailwindCSS
- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Authentication: JWT
- External APIs: Google Sheets API

## Documentation

For more detailed information, see our organized documentation:

- **Architecture**
  - [API Architecture](docs/architecture/API_ARCHITECTURE.md)
  - [Technical Description](docs/architecture/TECHNICAL_DESCRIPTION.md)
  - [Sports API Endpoints](docs/architecture/SPORTS_API_ENDPOINTS.md)

- **Features**
  - [Claude API Integration](docs/features/CLAUDE_API_INTEGRATION.md)
  - [Sport Field Feature](docs/features/SPORT_FIELD_FEATURE.md)

- **Maintenance**
  - [Database Maintenance](docs/maintenance/DATABASE_MAINTENANCE.md)
  - [Alembic Guide](docs/maintenance/ALEMBIC_GUIDE.md)
  - [Testing Guide](docs/maintenance/TESTING_GUIDE.md)
  - [Troubleshooting](docs/maintenance/TROUBLESHOOTING.md)

- **Deployment**
  - [Deployment Environments](docs/deployment/DEPLOYMENT_ENVIRONMENTS.md)
  - [AWS Deployment](docs/deployment/AWS_DEPLOYMENT.md)
  - [CI/CD Pipeline](docs/deployment/CI_CD_PIPELINE.md)

- **Features**
  - [LinkedIn Integration](docs/features/LINKEDIN_INTEGRATION.md)
  - [Progress](docs/PROGRESS.md)

See the [Documentation Index](docs/README.md) for a complete list of documents.

## Database Architecture

SheetGPT uses a PostgreSQL database with SQLAlchemy ORM and Alembic for migrations. The database is structured into two main components:

1. **Core Models**: User authentication, conversations, messages, and structured data
2. **Sports Database Models**: Comprehensive sports data schema for leagues, teams, players, and broadcast information

### Database Migration System

We use a custom Alembic wrapper to handle circular dependencies in the sports models:

```bash
# Check current database version
python src/scripts/alembic_wrapper.py current

# Upgrade to latest version
python src/scripts/alembic_wrapper.py upgrade

# Create a new migration
python src/scripts/alembic_wrapper.py revision --message "Your change" --autogenerate
```

For detailed information about the migration system, see [docs/ALEMBIC_GUIDE.md](docs/ALEMBIC_GUIDE.md).

### Sports Database Schema

The sports database includes models for:
- Leagues, teams, and players
- Games and stadiums
- Broadcast rights and production services
- Brand sponsorships and relationships

## Frontend Architecture

The frontend is built with React and TypeScript, following a modular component-based architecture:

1. **Authentication**: JWT-based authentication with secure token management
2. **Chat Interface**: Real-time messaging with AI integration and structured data extraction
3. **Data Management**: Tabular data display with editing capabilities and enhanced column resizing
4. **Sports Database**: Entity management interface with relationship visualization
5. **Data Flow**: Visual tracking of data as it moves through the application
6. **Export System**: Template-based export to Google Sheets with real-time status updates

### Frontend-Backend Integration

The frontend communicates with the backend through a comprehensive API client:

1. **API Client Layer**: Type-safe access to all backend endpoints
2. **Service Layer**: Business logic and data transformation
3. **UI Components**: User interface for data interaction
4. **Context Providers**: Application-wide state management for authentication, notifications, and data flow

For detailed information about the API architecture, see [docs/API_ARCHITECTURE.md](docs/API_ARCHITECTURE.md).

## Google Sheets Integration Setup

To use the enhanced Google Sheets integration, follow these steps:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs for your project:
   - Google Sheets API
   - Google Drive API (required for folder operations)
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application" as the application type
   - Set the name to "SheetGPT" (or your preferred name)
   - Add Authorized JavaScript origins:
     * `http://localhost:8000` (for development)
   - Add Authorized redirect URIs:
     * `http://localhost:8000/api/v1/export/auth/callback`
     * `http://localhost:8000/callback` (for development)
   - Click "Create" and download the credentials JSON file
5. Place the downloaded credentials file at `credentials/google_sheets_credentials.json`

### Environment Variables

Configure the following environment variables for Google Sheets integration:

```env
# Required settings
GOOGLE_SHEETS_CREDENTIALS_PATH=credentials/google_sheets_credentials.json
GOOGLE_SHEETS_TOKEN_PATH=credentials/token.json

# Performance tuning
GOOGLE_SHEETS_BATCH_SIZE=100
GOOGLE_SHEETS_MAX_RETRIES=3
GOOGLE_SHEETS_TIMEOUT=30

# New settings for enhanced features
GOOGLE_DRIVE_ENABLE_FOLDERS=true
GOOGLE_DRIVE_DEFAULT_FOLDER=SheetGPT Exports
GOOGLE_SHEETS_ENABLE_CSV_FALLBACK=true
```

### Security Note

The credentials file contains sensitive information. Make sure to:
- Never commit the credentials file to version control
- Keep the credentials secure and restrict access
- Use environment variables for production deployments
- Regularly rotate the client secret as per your security policy

## Features

- **Chat Interface**: Engage with an AI assistant to extract structured data from conversations.
- **Data Management**: View, edit, and manage structured data extracted from conversations.
- **Data Visualization**: Display structured data in a customizable data grid.
- **Data Export**: Export structured data to Google Sheets with advanced features:
  - Column visibility control to export only relevant fields
  - Google Drive folder selection and automatic creation
  - CSV fallback when Google authentication is unavailable
  - Consistent formatting with template support
- **Sports Database**: Access and manage sports-related data entities.
- **SportDataMapper**: Map structured data to sports database entities with a modern, modular architecture.
  - **Drag-and-Drop Interface**: Easily map source fields to database fields.
  - **Automatic Entity Detection**: Intelligently detect the most likely entity type based on field names and values.
  - **Entity Validation**: Validate data before saving to ensure data integrity.
  - **Related Entity Lookup**: Automatically look up and create related entities by name.
  - **Batch Import**: Import multiple records at once with detailed success/error reporting.
  - **Guided Walkthrough**: Step-by-step guidance for first-time users.
  - **Field Help**: Contextual help for understanding field requirements.
  - **Record Navigation**: Intuitive controls for navigating through records.
  - **Record Exclusion**: Ability to exclude specific records from import.
  - **Modular Architecture**: Maintainable and extensible code structure with custom hooks and utility modules.
- **Admin Dashboard**: Administrative interface for database management and system configuration.
  - **Role-Based Access**: Restricted access to administrative functions based on user roles.
  - **Database Management**: Tools for cleaning and maintaining the database.
  - **User Management**: Functionality for managing user accounts and permissions.
- **Contact Management**: Import and manage professional contacts with brand relationships.
  - **LinkedIn CSV Import**: Import contacts from LinkedIn CSV exports with flexible column mapping.
  - **Fuzzy Company Matching**: Sophisticated algorithm for matching contact companies to existing brands.
  - **Contact Details**: View and edit contact information including brand associations with confidence scoring.
  - **Brand Relationship Management**: Associate contacts with brands using both automatic and manual methods.
  - **Import Options**: Configurable matching settings with adjustable confidence threshold.
  - **Import Statistics**: Comprehensive reporting with successful imports, duplicates, and match counts.
  - **Indexed Searching**: Optimized database queries for contact filtering and searching.

## Sports Database Management

The Sports Database (SportDB) provides comprehensive management of sports-related entities:

### Features

#### Entity Management
- Create, read, update, and delete operations for all entity types
- Bulk operations support (select multiple, delete multiple)
- Real-time updates and optimistic UI
- Detailed success/failure reporting

#### Views
1. **Entity View**
   - List view with sorting and filtering
   - Checkbox selection for bulk operations
   - Quick actions (view, delete)
   - Relationship indicators

2. **Field View**
   - Complete field definitions for all entity types
   - Field properties:
     - Name and type
     - Required/optional status
     - Detailed descriptions
   - Organized by entity type

3. **Global View**
   - Overview of all entity types
   - Relationship mappings
   - Quick navigation

#### Supported Entities
- Leagues
- Teams
- Players
- Games
- Stadiums
- Broadcasts
- Production Services
- Brands
- Game Broadcasts
- League Executives

Each entity type has specific fields and relationships defined in the system.

### Brand and Broadcast Company Integration

The system supports using Brand entities as Broadcast Companies for broadcast rights through a "dual-ID" approach that maintains database integrity:

1. **Implementation**:
   - When a Brand ID is provided for a broadcast right, the system:
     - First checks if a Broadcast Company record exists with that ID
     - If not found, checks if a Brand exists with that ID
     - Creates a placeholder Broadcast Company with the same ID as the Brand

2. **Benefits**:
   - Maintains database foreign key constraints
   - Allows brands to be used directly in broadcast rights
   - No need for duplicate data entry
   - Simple UI that feels natural to users

3. **Utilities**:
   - `add_broadcast_constraint.py`: Creates placeholder broadcast companies for all brands
   - `check_broadcast_rights.py`: Verifies integrity of broadcast rights data

To run these utilities:
```bash
docker-compose run --rm backend python add_broadcast_constraint.py
docker-compose run --rm backend python check_broadcast_rights.py
```

This integration is especially useful when brands (like CBS Sports, ESPN) serve as broadcast companies, eliminating the need to maintain duplicate entities.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Python (v3.9 or higher)
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/SheetGPT.git
   cd SheetGPT
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Set up environment variables:
   - Create a `.env` file in the backend directory based on `.env.example`
   - Create a `.env` file in the frontend directory based on `.env.example`

5. Start the development servers:
   ```bash
   # In the backend directory
   uvicorn app.main:app --reload
   
   # In the frontend directory
   npm run dev
   ```

## Documentation

For more detailed information about the project, refer to the following documentation:

- [API Architecture](docs/API_ARCHITECTURE.md): Overview of the API architecture and design decisions.
- [Technical Description](docs/TECHNICAL_DESCRIPTION.md): Detailed technical description of the codebase.
- [Progress](docs/PROGRESS.md): Progress updates and development roadmap.

## Development Workflow

### Adding Frontend Dependencies

```bash
docker-compose exec frontend npm install [package-name]
```

### Running Database Migrations

```bash
docker-compose exec backend python src/scripts/alembic_wrapper.py upgrade
```

### Accessing the Database

```bash
docker-compose exec db psql -U postgres -d sheetgpt
```

### Setting a User as Admin

```bash
docker-compose exec backend python src/scripts/set_admin.py <email>
```

### Restarting Services

```bash
docker-compose restart frontend
docker-compose restart backend
```

## Troubleshooting

### Frontend Issues

- Refresh browser first (Ctrl+Shift+R for hard refresh)
- Check browser console for errors
- Restart frontend container: `docker-compose restart frontend`
- Check volume mounts are working correctly

### Backend Issues

- Check logs: `docker-compose logs -f backend`
- Verify database connection
- Check API responses in browser network tab
- Restart backend: `docker-compose restart backend`

### Data Issues

- Check browser console for data transformation logs
- Verify data structure in raw data view
- Check for race conditions in asynchronous operations
- Verify proper state management in data store

## Documentation

For more detailed information about the project, refer to the documentation in the `