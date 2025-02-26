# SheetGPT New Agent Introduction

Welcome to the SheetGPT project! This document is designed to help you quickly get up to speed with the current state of the project and understand the path forward.

## Getting Started

To understand the current state and future direction of the project, please start by reading these key documents in the following order:

### 1. Read docs/NEW_AGENT.md

This is your comprehensive overview of the project's current state, architecture, and immediate priorities. Pay special attention to:
- The **SYSTEM_STATE** section for technical setup and dependencies
- **DEVELOPMENT_STATUS** to understand what's completed and in progress
- **IMMEDIATE_TASKS** section to see our current priorities
- **UI_IMPROVEMENTS** and **BACKEND_PRIORITIES** for specific focus areas
- **RECENT_IMPROVEMENTS** to understand the latest changes

### 2. Review docs/PROGRESS.md

This provides a concise summary of:
- Recent work and improvements
- Common commands you'll need for development
- Current challenges and known issues
- Next steps in the development roadmap

### 3. Check docs/API_ARCHITECTURE.md and docs/TECHNICAL_DESCRIPTION.md

These will give you deeper technical context on:
- The codebase organization and structure
- API design principles and patterns
- Key technical decisions and their rationale
- Component relationships and data flow

## Current Focus Areas

The project is currently focused on the following key areas:

1. **UI Improvements**
   - Better user experience and accessibility
   - Responsive design for various screen sizes
   - Consistent component styling
   - Optimized performance for large datasets

2. **Database Functionality**
   - Enhanced viewing, querying, and data extraction capabilities
   - Advanced search and filtering for sports database entities
   - Intuitive data visualization for sports statistics
   - More efficient data retrieval mechanisms for large datasets

3. **Data Transformation**
   - Standardizing the process across components
   - Improving handling of complex nested data structures
   - Enhancing validation for data integrity
   - Better error handling and recovery

4. **Export System**
   - Completing Google Sheets API backend integration
   - Finalizing template selection and application
   - Adding notifications and progress indicators

## Critical Components to Understand

To contribute effectively, familiarize yourself with these key components:

1. **Chat Interface**
   - `MessageItem.tsx` and `MessageThread.tsx` for message rendering and interaction
   - Data extraction flow from chat messages to structured data

2. **Data Management**
   - `DataTable.tsx` for data display and manipulation
   - Column resizing and grid expansion features
   - Raw data display and transformation logic

3. **Sports Data Handling**
   - `SportDataMapper.tsx` for mapping extracted data to database fields
   - Sports database models and entity relationships
   - Data visualization components

4. **Backend Services**
   - API routes and service layer organization
   - Database models and relationships
   - Authentication and security implementation

## Development Environment

The project uses Docker for development:

1. **Setup**
   - All services run in Docker containers
   - Volume mounts enable hot reloading
   - Frontend uses Vite with HMR
   - Backend uses FastAPI with uvicorn reload

2. **Common Commands**
   - Start environment: `docker-compose up --build -d`
   - Install frontend dependency: `docker-compose exec frontend npm install [package-name]`
   - Run migrations: `docker-compose exec backend python src/scripts/alembic_wrapper.py upgrade`
   - Database access: `docker-compose exec db psql -U postgres -d sheetgpt`
   - Restart frontend: `docker-compose restart frontend`
   - Clean database: `docker-compose exec db psql -U postgres -d sheetgpt -f /app/clear_data.sql`
   - Rebuild containers: `docker-compose down && docker-compose build --no-cache && docker-compose up -d`

## Troubleshooting

If you encounter issues:

1. **Frontend Issues**
   - Check browser console for errors
   - Try a hard refresh (Ctrl+Shift+R)
   - Restart the frontend container
   - Look for detailed logs in data transformation functions

2. **Backend Issues**
   - Check container logs: `docker-compose logs -f backend`
   - Verify database connection
   - Check API responses in browser network tab

3. **Data Issues**
   - Examine browser console for transformation logs
   - Verify data structure in raw data view
   - Check for race conditions in async operations

## Getting Help

If you need assistance:

1. Review the **TROUBLESHOOTING_GUIDE** section in `NEW_AGENT.md`
2. Check the **DEBUGGING_NOTES** for common issues and solutions
3. Consult the git history for recent changes and their context

Feel free to ask questions about the architecture, current challenges, or implementation details as you get started! 