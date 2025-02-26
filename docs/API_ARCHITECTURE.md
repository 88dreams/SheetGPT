# API Architecture

## Overview

SheetGPT's API is built using FastAPI, a modern, high-performance web framework for building APIs with Python. The API follows a modular architecture with clear separation of concerns:

1. **Routes**: Define API endpoints and handle HTTP requests/responses
2. **Services**: Implement business logic and database operations
3. **Models**: Define database schema using SQLAlchemy ORM
4. **Schemas**: Validate request/response data using Pydantic

## API Structure

The API is structured into several modules:

- **Authentication**: User registration, login, and token management
- **Chat**: Conversation and message management
- **Data Management**: Structured data operations
- **Sports Database**: Sports entity management
- **Export**: Data export to Google Sheets

## Authentication System

The authentication system uses JWT (JSON Web Tokens) for secure API access:

1. **Token Generation**: `/api/v1/auth/login` endpoint generates JWT tokens
2. **Token Validation**: `get_current_user_id` function validates tokens
3. **User Retrieval**: `get_current_user` function retrieves user information

## Sports Database API

The sports database API provides endpoints for managing sports entities:

- **Generic Entity Endpoints**: `/api/v1/sports/entities/{entity_type}`
- **League Endpoints**: `/api/v1/sports/leagues`
- **Team Endpoints**: `/api/v1/sports/teams`
- **Player Endpoints**: `/api/v1/sports/players`
- **Game Endpoints**: `/api/v1/sports/games`
- **Stadium Endpoints**: `/api/v1/sports/stadiums`
- **Broadcast Endpoints**: `/api/v1/sports/broadcast`
- **Production Endpoints**: `/api/v1/sports/production`
- **Brand Endpoints**: `/api/v1/sports/brands`
- **Export Endpoint**: `/api/v1/sports/export`

## Export Service

The export service handles exporting data to Google Sheets:

1. **Entity Selection**: Frontend selects entities to export
2. **Export Request**: API receives export request with entity IDs
3. **Data Retrieval**: Service retrieves entities and related data
4. **Spreadsheet Creation**: Google Sheets API creates a new spreadsheet
5. **Data Writing**: Service writes data to the spreadsheet
6. **Formatting**: Service applies formatting to the spreadsheet
7. **Response**: API returns spreadsheet ID and URL

### Google Sheets Integration

The Google Sheets integration is implemented through the following components:

1. **GoogleSheetsService**: Core service for interacting with the Google Sheets API
   - OAuth2 authentication flow
   - Spreadsheet creation and management
   - Data writing and formatting
   - Template application

2. **ExportService**: High-level service that coordinates the export process
   - Entity retrieval and transformation
   - Relationship handling
   - Formatting data for spreadsheet export

3. **Export API Routes**: Endpoints for initiating and managing exports
   - `/api/v1/export/sheets`: Export data to Google Sheets
   - `/api/v1/export/auth/url`: Get Google OAuth URL
   - `/api/v1/export/auth/callback`: Handle Google OAuth callback

### Current Implementation Status

The Google Sheets integration is partially implemented:

- [x] OAuth2 authentication flow
- [x] Spreadsheet creation and basic operations
- [x] Data writing functionality
- [x] Template application
- [x] Frontend UI for export
- [ ] Complete end-to-end testing
- [ ] Error handling and recovery
- [ ] User feedback during export process

## Recent Fixes

### 1. UUID Handling in Database Models

Fixed issues with UUID handling in database models by using the `SQLUUID` type:

```python
from sqlalchemy import Column, ForeignKey
from sqlalchemy.orm import Mapped
from sqlalchemy.dialects.postgresql import UUID as SQLUUID
from uuid import UUID

# Example of correct UUID field definition
league_id: Mapped[UUID] = mapped_column(
    SQLUUID,
    ForeignKey("leagues.id"),
    nullable=False
)
```

This ensures that UUIDs are properly handled by SQLAlchemy and PostgreSQL.

### 2. Import Path Resolution

Fixed import issues by updating import paths to reflect the correct directory structure:

```python
# Before
from src.services.sheets_service import SheetsService

# After
from src.services.export.sheets_service import GoogleSheetsService as SheetsService
```

This ensures that modules are correctly imported from their actual locations.

### 3. Authentication Utility

Created a new `auth.py` utility to provide the `get_current_user` function:

```python
# src/utils/auth.py
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from src.utils.database import get_db
from src.utils.security import get_current_user_id
from src.services.user import UserService

async def get_current_user(
    current_user_id = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get current authenticated user information.
    """
    user_service = UserService(db)
    user = await user_service.get_user_by_id(current_user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Convert user model to dictionary
    user_dict = {
        "id": str(user.id),
        "email": user.email,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None
    }
    
    return user_dict
```

This function is used as a dependency in protected routes to ensure the user is authenticated and to provide user information.

## API Endpoints

### Authentication

- `POST /api/v1/auth/register`: Register a new user
- `POST /api/v1/auth/login`: Login and get access token
- `GET /api/v1/auth/me`: Get current user information

### Chat

- `GET /api/v1/chat/conversations`: Get user conversations
- `POST /api/v1/chat/conversations`: Create a new conversation
- `GET /api/v1/chat/conversations/{conversation_id}`: Get conversation details
- `POST /api/v1/chat/conversations/{conversation_id}/messages`: Send a message
- `GET /api/v1/chat/conversations/{conversation_id}/messages`: Get conversation messages

### Data Management

- `GET /api/v1/data/structured`: Get structured data
- `POST /api/v1/data/structured`: Create structured data
- `GET /api/v1/data/structured/{data_id}`: Get structured data details
- `PUT /api/v1/data/structured/{data_id}`: Update structured data
- `DELETE /api/v1/data/structured/{data_id}`: Delete structured data

### Sports Database

- `GET /api/v1/sports/leagues`: Get all leagues
- `POST /api/v1/sports/leagues`: Create a new league
- `GET /api/v1/sports/leagues/{league_id}`: Get league details
- `PUT /api/v1/sports/leagues/{league_id}`: Update a league
- `DELETE /api/v1/sports/leagues/{league_id}`: Delete a league

Similar endpoints exist for teams, players, games, stadiums, broadcast companies, production companies, and brands.

### Export

- `POST /api/v1/export/sheets`: Export data to Google Sheets
- `GET /api/v1/export/auth/url`: Get Google OAuth URL
- `GET /api/v1/export/auth/callback`: Handle Google OAuth callback

## Next Steps for API Development

1. **Complete Google Sheets Integration**:
   - Finalize end-to-end testing of the export process
   - Implement comprehensive error handling
   - Add user feedback during export

2. **Performance Optimization**:
   - Implement pagination for large datasets
   - Add filtering and sorting capabilities
   - Optimize database queries

3. **Testing and Documentation**:
   - Create comprehensive test suite for all endpoints
   - Update API documentation with examples
   - Add performance benchmarks

## Data Handling Architecture

### Data Flow

1. **Data Extraction**:
   - The `DataExtractionService` extracts structured data from AI assistant responses.
   - It handles various data formats, including nested structures, arrays of objects, and column-based formats.
   - The service transforms the extracted data into a consistent format for storage and display.

2. **Data Storage**:
   - Structured data is stored in the database with metadata linking it to the source conversation and message.
   - The data model supports flexible schemas to accommodate different data structures.
   - Each structured data entry includes headers, rows, and metadata for context.

3. **Data Display**:
   - The `DataTable` component renders structured data in a customizable grid.
   - It handles various data formats and provides features like column resizing, row reordering, and data export.
   - Special handling is implemented for nested data structures to ensure correct display.

4. **Data Preview**:
   - The `DataPreviewModal` component provides a preview of extracted data before it's stored.
   - It supports multiple data formats and provides a visual representation of how the data will be displayed.

### Recent Improvements

1. **Enhanced Data Transformation**:
   - Improved handling of nested data structures to correctly transpose rows and columns.
   - Added support for various data formats to ensure consistent display across the application.

2. **Data Persistence**:
   - Enhanced React Query configuration for better data persistence during navigation.
   - Implemented retry logic with exponential backoff for failed queries.
   - Increased cache times to reduce unnecessary refetching.

3. **Error Handling**:
   - Improved error handling in data extraction and transformation processes.
   - Added fallback mechanisms to ensure graceful degradation when data cannot be processed.

## API Design Principles

// ... existing code ... 