# SheetGPT

## Project Overview

SheetGPT is a full-stack application that combines AI-powered chat capabilities with structured data management and sports database functionality. The application allows users to:

1. Chat with an AI assistant to extract and structure data
2. Manage and transform structured data in a tabular format
3. Create and manage sports-related entities (leagues, teams, players, etc.)
4. Export data to Google Sheets for further analysis and sharing

## Current Status

As of May 2024, the project has implemented:

- User authentication and management
- Chat interface with AI integration
- Structured data extraction and management
- Sports database with comprehensive entity models
- Frontend-backend integration for all core features
- Google Sheets export functionality with template support
- Enhanced data transformation with support for various formats
- Special handling for NFL teams data and other structured formats

## Recent Improvements

- Fixed NFL teams data display issues in the Data Grid
- Enhanced data extraction from message content
- Improved error handling and logging throughout the application
- Added special case detection for NFL teams data format
- Updated data transformation process for better consistency
- Fixed dependency issues with react-icons and tailwind-scrollbar

## Development Setup

The project uses Docker for development with volume mounts for hot reloading:

```bash
# Clone the repository
git clone https://github.com/yourusername/sheetgpt.git
cd sheetgpt

# Start the development environment
docker-compose up --build -d

# Install frontend dependencies
docker-compose exec frontend npm install

# Run database migrations
docker-compose exec backend python src/scripts/alembic_wrapper.py upgrade

# Access the application
open http://localhost:3000
```

## Dependencies

- Frontend: React, TypeScript, React Query, TailwindCSS
- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Authentication: JWT
- External APIs: Google Sheets API

## Documentation

For more detailed information, see the following documentation:

- [API Architecture](docs/API_ARCHITECTURE.md)
- [Technical Description](docs/TECHNICAL_DESCRIPTION.md)
- [Progress](docs/PROGRESS.md)
- [Progress Summary](docs/PROGRESS_SUMMARY.md)

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

To use the Google Sheets integration, follow these steps:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API for your project
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
GOOGLE_SHEETS_CREDENTIALS_PATH=credentials/google_sheets_credentials.json
GOOGLE_SHEETS_TOKEN_PATH=credentials/token.json
GOOGLE_SHEETS_BATCH_SIZE=100
GOOGLE_SHEETS_MAX_RETRIES=3
GOOGLE_SHEETS_TIMEOUT=30
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
- **Data Export**: Export structured data to Google Sheets and other formats.
- **Sports Database**: Access and manage sports-related data entities.

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

For more detailed information about the project, refer to the documentation in the `docs` directory:

- [API Architecture](docs/API_ARCHITECTURE.md)
- [Technical Description](docs/TECHNICAL_DESCRIPTION.md)
- [Progress](docs/PROGRESS.md)
- [Alembic Guide](docs/ALEMBIC_GUIDE.md)
- [New Agent](docs/NEW_AGENT.md)
- [Sports API Endpoints](docs/SPORTS_API_ENDPOINTS.md)
- [Backend Implementation Plan](docs/BACKEND_IMPLEMENTATION_PLAN.md)
- [Web Interface](docs/WEB_INTERFACE.md)
- [API Examples](docs/API_EXAMPLES.md)
- [AWS Deployment](docs/AWS_DEPLOYMENT.md) 