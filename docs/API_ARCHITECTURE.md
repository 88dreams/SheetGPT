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

### Sports Database Implementation

The sports database implementation includes comprehensive models and services for managing sports entities:

#### Entity Models

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

#### Entity Services

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

#### Frontend Integration

The frontend integrates with the sports database API through the SportDataMapper component, which provides:

1. **Entity Selection**: Users can select the entity type to map data to
2. **Field Mapping**: Drag-and-drop interface for mapping source fields to database fields
3. **Record Navigation**: Controls for navigating through multiple records
4. **Batch Import**: Support for importing multiple records at once
5. **Data Validation**: Validation of mapped data before saving to the database
6. **Intelligent Entity Type Selection**: Automatically recommends and highlights the most appropriate entity type based on source data
7. **Guided Walkthrough**: Step-by-step guidance for users through the data mapping process
8. **Contextual Help**: Field-specific tooltips explaining the purpose and expected format of each field

The SportDataMapper component handles different formats of structured data:
- Array of objects
- Single object
- Headers and rows format

Recent improvements to the SportDataMapper component include:
- Enhanced navigation controls with improved visibility
- Fixed record loading to properly handle all records
- Improved UI with better styling and user experience
- Intelligent entity type recommendation based on source data
- Visual indicators for valid and invalid entity types
- Guided walkthrough for first-time users
- Contextual help tooltips for specific fields

### Entity Relationship Handling

The SportDataMapper component now includes sophisticated entity relationship handling to streamline the data import process:

1. **Automatic Entity Resolution**: During batch imports, the system automatically resolves entity relationships by name:
   - When importing teams, stadium and league names are automatically resolved to their respective IDs
   - When importing players, team names are automatically resolved to team IDs
   - When importing games, team names are automatically resolved to team IDs

2. **Entity Creation on Demand**: If a referenced entity doesn't exist, the system can create it automatically:
   - Stadiums can be created during team imports, using city and country information from the import data
   - Leagues can be created during team imports if they don't already exist
   - This eliminates the need for users to manually create dependent entities before importing related entities

3. **Name-to-UUID Conversion**: The system handles the conversion between human-readable names and database UUIDs:
   - The `lookupEntityIdByName` function finds entities by name or creates them if they don't exist
   - The `enhancedMapToDatabaseFieldNames` function processes entity references based on the selected entity type
   - UUID validation ensures that valid UUIDs are used directly without lookup

This approach provides several benefits:
- Simplifies the user experience by eliminating manual steps
- Maintains data integrity through proper relationship handling
- Reduces errors by automating the creation of related entities
- Provides a more intuitive workflow that matches how users think about the data

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

## Admin API

The Admin API provides endpoints for administrative functions that are restricted to users with admin privileges:

1. **User Management**: Endpoints for managing user accounts and permissions
2. **Database Management**: Endpoints for database maintenance operations
3. **System Configuration**: Endpoints for configuring system settings

### Admin Authentication

Admin authentication extends the standard authentication system with role-based access control:

1. **Admin Flag**: The User model includes an `is_admin` boolean field
2. **Admin Verification**: The `get_current_admin_user` dependency function verifies admin status
3. **Admin-Only Routes**: Routes are protected with the admin dependency

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

### Database Management Endpoints

The database management endpoints provide functionality for maintaining the database:

- `POST /api/v1/admin/clean-database`: Clean the database while preserving user accounts
  - Implements robust transaction management with isolated sessions
  - Provides detailed reporting on cleaning operations
  - Handles partial failures gracefully
  - Uses separate database sessions for each table operation
  - Returns comprehensive results including success/failure status for each table

### Admin Frontend Integration

The frontend integrates with the Admin API through:

1. **Settings Page**: Admin-only page for accessing administrative functions
2. **Admin API Service**: Frontend service for making admin API requests
3. **Admin-Only UI Elements**: UI elements that are only displayed to admin users

## Recent Fixes and Improvements

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

### 2. Authentication Utility

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

### 3. SportDataMapper Improvements

Enhanced the frontend SportDataMapper component with:

- Navigation controls that are always visible regardless of record count
- Improved styling with blue color scheme for better visibility
- Fixed record loading to properly handle all records in structured data
- Enhanced UI with better spacing, shadows, and typography

These improvements ensure a better user experience when mapping data to sports entities.

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

### Batch Import Endpoints

- `POST /api/v1/sports/batch/import`: Import multiple entities of the same type
  - Request body includes entity type and array of entity data
  - Response includes success count, failure count, and error details
  - Continues processing even if individual records fail
  - Returns detailed validation errors for failed records

### Field Mapping Endpoints

- `GET /api/v1/sports/fields/{entity_type}`: Get available fields for an entity type
  - Returns field names, types, and validation requirements
  - Used by the frontend to generate field mapping UI
  - Includes information about required fields and relationships

- `POST /api/v1/sports/validate/{entity_type}`: Validate entity data without saving
  - Performs validation checks on entity data
  - Returns validation errors without creating the entity
  - Used for pre-validation during the mapping process

### Export

- `POST /api/v1/export/sheets`: Export data to Google Sheets
- `GET /api/v1/export/auth/url`: Get Google OAuth URL
- `GET /api/v1/export/auth/callback`: Handle Google OAuth callback

### Admin

- `POST /api/v1/admin/clean-database`: Clean the database while preserving user accounts
  - Implements robust transaction management with isolated sessions
  - Provides detailed reporting on cleaning operations
  - Handles partial failures gracefully
  - Uses separate database sessions for each table operation
  - Returns comprehensive results including success/failure status for each table

## Database Transaction Management

The API implements a sophisticated approach to database transaction management, particularly for complex administrative operations:

1. **Dual Transaction Strategies**:
   - **FastAPI Dependency Injection**: Used for standard endpoints with simple transaction needs
   - **Context Manager Sessions**: Used for operations requiring fine-grained transaction control

2. **Isolated Sessions Pattern**:
   - Each critical operation uses its own database session
   - Prevents transaction errors from cascading across operations
   - Enables detailed reporting on operation outcomes
   - Maintains database integrity even during partial failures

3. **Implementation Example**: The database cleaning endpoint demonstrates this pattern:
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

This approach significantly enhances the reliability of administrative operations and provides better error reporting for complex database tasks.

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

5. **Sports Data Mapping**:
   - The `SportDataMapper` component maps extracted data to sports entity fields.
   - It provides a drag-and-drop interface for field mapping.
   - The component handles field name prefixing to ensure uniqueness across entity types.
   - It implements record navigation controls to preview individual records before import.
   - The component supports record exclusion functionality with visual indicators.
   - It features batch import with real-time progress tracking.

### Recent Improvements

1. **Enhanced Data Transformation**:
   - Improved handling of nested data structures to correctly transpose rows and columns.
   - Added support for various data formats to ensure consistent display across the application.
   - Implemented field name prefixing to ensure uniqueness across entity types.
   - Added field mapping between UI field names and database field names.

2. **Data Persistence**:
   - Enhanced React Query configuration for better data persistence during navigation.
   - Implemented retry logic with exponential backoff for failed queries.
   - Increased cache times to reduce unnecessary refetching.

3. **Error Handling**:
   - Improved error handling in data extraction and transformation processes.
   - Added fallback mechanisms to ensure graceful degradation when data cannot be processed.
   - Implemented error handling that continues processing even when individual records fail.
   - Added detailed validation error reporting for failed records.

4. **Batch Import Process**:
   - Implemented real-time progress tracking during import.
   - Added import completion status with record count.
   - Implemented record navigation controls to preview individual records before import.
   - Added record exclusion functionality with visual indicators.
   - Enhanced validation to provide detailed error messages for failed records.

## API Design Principles

1. **RESTful Design**: The API follows RESTful principles for resource naming and HTTP method usage.
2. **Consistent Response Format**: All endpoints return responses in a consistent format.
3. **Comprehensive Error Handling**: Detailed error messages and appropriate HTTP status codes.
4. **Authentication and Authorization**: JWT-based authentication and role-based authorization.
5. **Pagination and Filtering**: Support for pagination and filtering on list endpoints.
6. **Validation**: Request validation using Pydantic schemas.
7. **Documentation**: Comprehensive API documentation using OpenAPI/Swagger.
8. **Testing**: Extensive test coverage for all endpoints.

## Entity Relationship Handling

The SheetGPT application implements a sophisticated approach to handling entity relationships, particularly in the sports database module. This is crucial for maintaining data integrity while providing a seamless user experience.

### Automatic Entity Resolution

One of the key architectural decisions is the implementation of automatic entity resolution during the batch import process. This allows users to import data using human-readable names (like "NBA" or "Staples Center") instead of requiring UUIDs.

#### Key Components:

1. **Entity Lookup Service**: 
   - The `lookupEntityIdByName` function serves as a bridge between human-readable names and database UUIDs
   - It first attempts to find existing entities by name using case-insensitive matching
   - If no match is found, it can automatically create new entities for certain types (stadiums, leagues)
   - Returns valid UUIDs that can be used in database operations

2. **Enhanced Field Mapping**:
   - The `enhancedMapToDatabaseFieldNames` function extends the basic field mapping with relationship handling
   - Processes entity references based on the selected entity type
   - Supports different entity types with their specific relationship requirements
   - Validates UUID format to determine whether to use direct values or perform lookups

3. **UUID Validation**:
   - Implements RFC 4122 compliant UUID validation
   - Used to distinguish between UUIDs and entity names
   - Ensures data integrity by preventing invalid references

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

### Benefits of This Architecture

1. **Improved User Experience**:
   - Users can work with familiar names instead of technical identifiers
   - Eliminates the need for manual prerequisite creation
   - Reduces friction in the data import process

2. **Data Integrity**:
   - Maintains proper foreign key relationships
   - Prevents invalid references
   - Ensures consistent data across the application

3. **Flexibility**:
   - Supports both direct UUID references and name-based references
   - Can be extended to support additional entity types
   - Allows for customization of the entity creation process

4. **Error Handling**:
   - Provides detailed feedback about the import process
   - Identifies specific issues with entity relationships
   - Allows for partial success in batch operations

This architecture represents a balance between user-friendly interfaces and robust data modeling, allowing the application to handle complex entity relationships while maintaining a simple user experience.

## SportDataMapper Component

### Overview

The SportDataMapper component is a specialized tool for mapping structured data to sports database entities. It allows users to:

1. Import structured data from various sources
2. Automatically detect the entity type based on the data structure
3. Map source fields to database fields using a drag-and-drop interface
4. Validate the mapped data before saving to the database
5. Save individual records or batch import multiple records

### Architecture

The SportDataMapper follows a modular architecture with the following components:

#### Main Container

- **SportDataMapperContainer**: The main container component that orchestrates all functionality
- **SportDataMapper**: A wrapper component that provides the entry point to the mapping tool

#### Reusable Components

- **FieldItem**: Represents a draggable/droppable field in the UI
- **GuidedWalkthrough**: Provides step-by-step guidance for users
- **FieldHelpTooltip**: Provides contextual help for different field types

#### Custom Hooks

- **useFieldMapping**: Manages field mapping functionality
  - Stores mappings by entity type
  - Handles field mapping operations
  - Provides methods to add, remove, and clear mappings

- **useRecordNavigation**: Handles record navigation and exclusion
  - Manages current record index
  - Provides navigation between records
  - Handles record exclusion/inclusion

- **useImportProcess**: Manages database saving and batch import operations
  - Handles saving individual records
  - Manages batch import of multiple records
  - Provides notification system for success/error messages

- **useUiState**: Manages UI state
  - Controls view mode (entity or global)
  - Manages guided walkthrough functionality
  - Handles field help tooltips
  - Tracks data validation state

- **useDataManagement**: Manages data operations
  - Handles data extraction from structured data
  - Manages source fields and field values
  - Updates mapped data based on field mappings
  - Provides methods for data transformation

#### Utility Modules

- **entityTypes.ts**: Defines entity types and their required fields
- **entityDetection.ts**: Logic for detecting entity types from data
- **validationUtils.ts**: Validation logic for different entity types
- **mappingUtils.ts**: Functions for mapping fields and data transformation
- **uiUtils.ts**: UI-related helper functions

### Data Flow

1. User uploads structured data
2. Component automatically detects the entity type
3. User maps source fields to database fields using drag-and-drop
4. Component validates the mapped data
5. User saves individual records or batch imports multiple records

### Key Features

- **Automatic Entity Type Detection**: Analyzes source data to recommend the most likely entity type
- **Drag-and-Drop Mapping**: Intuitive interface for mapping fields
- **Field Validation**: Validates required fields and data formats
- **Batch Import**: Efficiently imports multiple records of the same entity type
- **Guided Walkthrough**: Step-by-step guidance for first-time users
- **Field Help**: Contextual help for understanding field requirements

### Technical Implementation

The component is built using React with TypeScript and leverages the following technologies:

- **React**: For component-based UI development
- **react-dnd**: For drag-and-drop functionality
- **TypeScript**: For type safety and better developer experience
- **Custom Hooks**: For state management and separation of concerns
- **Modular Architecture**: For maintainability and code organization 