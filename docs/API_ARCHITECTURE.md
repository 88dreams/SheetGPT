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
- **Admin**: Administrative functions

## Authentication System

The authentication system uses JWT (JSON Web Tokens) for secure API access:

1. **Token Generation**: `/api/v1/auth/login` endpoint generates JWT tokens
2. **Token Validation**: `get_current_user_id` function validates tokens
3. **User Retrieval**: `get_current_user` function retrieves user information

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
    """Get the current user from the database"""
    user_service = UserService(db)
    user = await user_service.get_user_by_id(current_user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user
```

## Sports Database API

The sports database API provides endpoints for managing sports entities with a comprehensive set of models and services.

### Entity Models

The database models use SQLAlchemy ORM with PostgreSQL as the database:

```python
# Example of League model
class League(Base):
    __tablename__ = "leagues"
    
    id: Mapped[UUID] = mapped_column(SQLUUID, primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sport: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=True)
    founded_year: Mapped[int] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Relationships
    teams: Mapped[List["Team"]] = relationship("Team", back_populates="league")
```

### UUID Handling

UUID fields are properly handled using the PostgreSQL UUID type:

```python
from sqlalchemy.dialects.postgresql import UUID as SQLUUID
from uuid import UUID

# Example of correct UUID field definition
league_id: Mapped[UUID] = mapped_column(
    SQLUUID,
    ForeignKey("leagues.id"),
    nullable=False
)
```

### Entity Services

The services implement the business logic for managing sports entities:

```python
# Example of League service methods
class SportsService:
    def __init__(self, db: Session):
        self.db = db
    
    async def get_leagues(self, skip: int = 0, limit: int = 100):
        return self.db.query(League).offset(skip).limit(limit).all()
    
    async def create_league(self, league_data: LeagueCreate):
        league = League(**league_data.dict())
        self.db.add(league)
        self.db.commit()
        self.db.refresh(league)
        return league
    
    async def get_league(self, league_id: UUID):
        return self.db.query(League).filter(League.id == league_id).first()
```

## Entity Relationship Handling

The application implements sophisticated entity relationship handling to maintain data integrity while providing a seamless user experience.

### Automatic Entity Resolution

During batch imports, the system automatically resolves entity relationships by name:

1. **Entity Lookup Service**: 
   - The `lookupEntityIdByName` function finds entities by name or creates them if they don't exist
   - Supports case-insensitive matching for better user experience

2. **Enhanced Field Mapping**:
   - The `enhancedMapToDatabaseFieldNames` function processes entity references based on the selected entity type
   - Validates UUID format to determine whether to use direct values or perform lookups

3. **Entity Creation on Demand**:
   - If a referenced entity doesn't exist, the system can create it automatically
   - Stadiums can be created during team imports
   - Leagues can be created during team imports if they don't already exist

### Entity Relationship Flow

The entity relationship handling follows this flow:

1. User maps fields in the SportDataMapper interface
2. During batch import, the system:
   - Maps basic fields using direct field-to-field mapping
   - Identifies relationship fields (e.g., league_id, stadium_id, team_id)
   - For each relationship field:
     - Checks if the value is a valid UUID
     - If not, treats it as a name and looks up the corresponding entity
     - If the entity exists, uses its UUID
     - If the entity doesn't exist (for supported types), creates it and uses the new UUID
   - Validates the final mapped data before saving to the database

## Export Service

The export service handles exporting data to Google Sheets through a well-defined process:

1. **Entity Selection**: Frontend selects entities to export
2. **Export Request**: API receives export request with entity IDs
3. **Data Retrieval**: Service retrieves entities and related data
4. **Spreadsheet Creation**: Google Sheets API creates a new spreadsheet
5. **Data Writing**: Service writes data to the spreadsheet
6. **Formatting**: Service applies formatting to the spreadsheet
7. **Response**: API returns spreadsheet ID and URL

### Google Sheets Integration

The Google Sheets integration is implemented through:

1. **GoogleSheetsService**: Core service for interacting with the Google Sheets API
2. **ExportService**: High-level service that coordinates the export process
3. **Export API Routes**: Endpoints for initiating and managing exports

### Current Implementation Status

- [x] OAuth2 authentication flow
- [x] Spreadsheet creation and basic operations
- [x] Data writing functionality
- [x] Template application
- [x] Frontend UI for export
- [ ] Complete end-to-end testing
- [ ] Error handling and recovery
- [ ] User feedback during export process

## Admin API

The Admin API provides endpoints for administrative functions that are restricted to users with admin privileges:

### Admin Authentication

Admin authentication extends the standard authentication system with role-based access control:

```python
# Example of admin authentication dependency
async def get_current_admin_user(
    current_user = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get the current admin user"""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource",
        )
    return current_user
```

### Database Management

The database management endpoints provide functionality for maintaining the database:

- `POST /api/v1/admin/clean-database`: Clean the database while preserving user accounts
  - Implements robust transaction management with isolated sessions
  - Provides detailed reporting on cleaning operations
  - Handles partial failures gracefully

## Database Transaction Management

The API implements a sophisticated approach to database transaction management:

1. **Dual Transaction Strategies**:
   - **FastAPI Dependency Injection**: Used for standard endpoints with simple transaction needs
   - **Context Manager Sessions**: Used for operations requiring fine-grained transaction control

2. **Isolated Sessions Pattern**:
   - Each critical operation uses its own database session
   - Prevents transaction errors from cascading across operations
   - Enables detailed reporting on operation outcomes

```python
# Process each table with a fresh database session
for table in tables:
    try:
        async with get_db_session() as session:
            # Delete all records from the table
            result = await session.execute(sqlalchemy.text(f"DELETE FROM {table};"))
            await session.commit()
            results[table] = "Success"
    except Exception as e:
        success = False
        results[table] = f"Error: {str(e)}"
```

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

### Batch Import
- `POST /api/v1/sports/batch/import`: Import multiple entities of the same type

### Field Mapping
- `GET /api/v1/sports/fields/{entity_type}`: Get available fields for an entity type
- `POST /api/v1/sports/validate/{entity_type}`: Validate entity data without saving

### Export
- `POST /api/v1/export/sheets`: Export data to Google Sheets
- `GET /api/v1/export/auth/url`: Get Google OAuth URL
- `GET /api/v1/export/auth/callback`: Handle Google OAuth callback

### Admin
- `POST /api/v1/admin/clean-database`: Clean the database while preserving user accounts

## Data Handling Architecture

### Data Flow

1. **Data Extraction**: The `DataExtractionService` extracts structured data from AI assistant responses
2. **Data Storage**: Structured data is stored in the database with metadata
3. **Data Display**: The `DataTable` component renders structured data in a customizable grid
4. **Data Preview**: The `DataPreviewModal` component provides a preview of extracted data
5. **Sports Data Mapping**: The `SportDataMapper` component maps extracted data to sports entity fields

## SportDataMapper Component

The SportDataMapper component is a specialized tool for mapping structured data to sports database entities.

### Architecture

The SportDataMapper follows a modular architecture with the following components:

#### Main Container
- **SportDataMapperContainer**: The main container component that orchestrates all functionality
- **SportDataMapper**: A wrapper component that provides the entry point to the mapping tool

#### Custom Hooks
- **useFieldMapping**: Manages field mapping functionality
- **useRecordNavigation**: Handles record navigation and exclusion
- **useImportProcess**: Manages database saving and batch import operations
- **useUiState**: Manages UI state
- **useDataManagement**: Manages data operations

### Key Features
- **Automatic Entity Type Detection**: Analyzes source data to recommend the most likely entity type
- **Drag-and-Drop Mapping**: Intuitive interface for mapping fields
- **Field Validation**: Validates required fields and data formats
- **Batch Import**: Efficiently imports multiple records of the same entity type
- **Guided Walkthrough**: Step-by-step guidance for first-time users
- **Field Help**: Contextual help for understanding field requirements

## Recent Improvements

1. **Enhanced Data Transformation**:
   - Improved handling of nested data structures
   - Added support for various data formats
   - Implemented field name prefixing to ensure uniqueness

2. **Data Persistence**:
   - Enhanced React Query configuration for better data persistence
   - Implemented retry logic with exponential backoff
   - Increased cache times to reduce unnecessary refetching

3. **Error Handling**:
   - Improved error handling in data extraction and transformation
   - Added fallback mechanisms for graceful degradation
   - Implemented detailed validation error reporting

4. **SportDataMapper Improvements**:
   - Navigation controls that are always visible
   - Improved styling with blue color scheme
   - Fixed record loading to properly handle all records
   - Enhanced UI with better spacing, shadows, and typography

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

4. **Enhanced Batch Processing**:
   - Implement asynchronous batch processing for large imports
   - Add progress tracking for long-running operations
   - Implement webhook notifications for completed operations

5. **Advanced Field Mapping**:
   - Add support for custom field transformations
   - Implement field mapping templates for common data sources
   - Add validation rules for complex field relationships 