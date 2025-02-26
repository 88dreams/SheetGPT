# Technical Description

This document provides a technical description of the major code sections in the SheetGPT project.

## Backend Architecture

### FastAPI Application Structure

The backend is built using FastAPI, a modern Python web framework for building APIs. The application structure follows a modular design:

```
src/
├── api/
│   ├── routes/
│   │   ├── api.py            # Main API router
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── chat.py           # Chat endpoints
│   │   ├── data_management.py # Data management endpoints
│   │   ├── sports.py         # Sports database endpoints
│   │   └── export.py         # Export endpoints
├── config/
│   └── settings.py           # Application settings
├── models/
│   ├── base.py               # Base model classes
│   ├── user.py               # User models
│   ├── chat.py               # Chat models
│   ├── data.py               # Data models
│   └── sports_models.py      # Sports database models
├── schemas/
│   ├── auth.py               # Authentication schemas
│   ├── chat.py               # Chat schemas
│   ├── data.py               # Data schemas
│   └── sports.py             # Sports database schemas
├── services/
│   ├── user.py               # User service
│   ├── chat.py               # Chat service
│   ├── data_management.py    # Data management service
│   ├── sports_service.py     # Sports database service
│   ├── export_service.py     # Export service
│   └── export/
│       ├── sheets_service.py # Google Sheets service
│       └── template_service.py # Template service
├── utils/
│   ├── auth.py               # Authentication utilities
│   ├── database.py           # Database utilities
│   └── security.py           # Security utilities
└── main.py                   # Application entry point
```

### Database Models

The database models are defined using SQLAlchemy ORM with PostgreSQL as the database. The models are organized into several categories:

1. **User Models**: Authentication and user management
2. **Chat Models**: Conversations and messages
3. **Data Models**: Structured data and columns
4. **Sports Models**: Comprehensive sports database schema

#### Sports Database Schema

The sports database schema is designed to model the relationships between various sports entities:

- **League**: Represents a sports league (e.g., NFL, NBA)
- **Team**: Represents a sports team belonging to a league
- **Player**: Represents a player belonging to a team
- **Game**: Represents a game between two teams
- **Stadium**: Represents a venue where games are played
- **BroadcastCompany**: Represents a company that broadcasts games
- **BroadcastRights**: Represents the rights of a broadcast company to broadcast games
- **ProductionCompany**: Represents a company that produces broadcasts
- **ProductionService**: Represents the services provided by a production company
- **Brand**: Represents a brand that sponsors teams or leagues
- **BrandRelationship**: Represents the relationship between a brand and a sports entity

The models use UUID primary keys and define relationships using SQLAlchemy's relationship mechanism.

#### SportDataMapper Real Data Integration

The SportDataMapper component is designed to map structured data from conversations to the sports database schema. Key technical aspects include:

1. **Data Extraction Flow**:
   - Uses `DataExtractionService.extractStructuredData()` to parse message content and extract structured data
   - Extracts data from markdown tables and JSON structures in messages
   - Prepares extracted data with metadata (message ID, conversation ID, extraction timestamp, source)
   - Passes the extracted data to the SportDataMapper component via the `structuredData` prop

2. **User Interface Components**:
   - Added a "Map Sports Data" button to the MessageItem component that is visible for all messages
   - Implemented `extractAndOpenSportDataMapper()` function to handle data extraction and display
   - Added loading indicators during extraction process
   - Enhanced error handling with user-friendly messages

3. **Error Handling**:
   - Implemented try/catch blocks for extraction errors
   - Added checks for empty data structures
   - Provides user feedback through alerts and console messages

4. **Testing Approach**:
   - Maintained test buttons with clearly labeled test data
   - Added visual indicators to distinguish between test and real data
   - Implemented comprehensive logging for debugging

### API Routes

The API routes are defined using FastAPI's router system. Each module has its own router that defines the endpoints for that module.

#### Authentication Routes

The authentication routes handle user registration, login, and token management:

- `POST /api/v1/auth/register`: Register a new user
- `POST /api/v1/auth/login`: Login and get access token
- `GET /api/v1/auth/me`: Get current user information

#### Chat Routes

The chat routes handle conversation and message management:

- `GET /api/v1/chat/conversations`: Get user conversations
- `POST /api/v1/chat/conversations`: Create a new conversation
- `GET /api/v1/chat/conversations/{conversation_id}`: Get conversation details
- `POST /api/v1/chat/conversations/{conversation_id}/messages`: Send a message
- `GET /api/v1/chat/conversations/{conversation_id}/messages`: Get conversation messages

#### Data Management Routes

The data management routes handle structured data operations:

- `GET /api/v1/data`: Get all structured data for the user
- `POST /api/v1/data`: Create new structured data
- `GET /api/v1/data/{data_id}`: Get specific structured data
- `PUT /api/v1/data/{data_id}`: Update structured data
- `DELETE /api/v1/data/{data_id}`: Delete structured data
- `GET /api/v1/data/{data_id}/columns`: Get columns for structured data
- `PUT /api/v1/data/{data_id}/columns/{column_name}`: Update a specific column
- `PUT /api/v1/data/{data_id}/cell`: Update a specific cell value
- `POST /api/v1/data/{data_id}/rows`: Add a new row to structured data
- `DELETE /api/v1/data/{data_id}/rows/{row_index}`: Delete a specific row
- `PUT /api/v1/data/{data_id}/rows/{row_index}`: Update a specific row

#### Sports Database Routes

The sports database routes handle sports entity management:

- `GET /api/v1/sports/leagues`: Get all leagues
- `POST /api/v1/sports/leagues`: Create a new league
- `GET /api/v1/sports/leagues/{league_id}`: Get a specific league
- `PUT /api/v1/sports/leagues/{league_id}`: Update a league
- `DELETE /api/v1/sports/leagues/{league_id}`: Delete a league

- `GET /api/v1/sports/teams`: Get all teams
- `POST /api/v1/sports/teams`: Create a new team
- `GET /api/v1/sports/teams/{team_id}`: Get a specific team
- `PUT /api/v1/sports/teams/{team_id}`: Update a team
- `DELETE /api/v1/sports/teams/{team_id}`: Delete a team

Similar endpoints exist for players, games, stadiums, broadcast companies, production companies, brands, and their relationships.

#### Export Routes

The export routes handle data export operations:

- `GET /api/v1/export/templates`: Get available export templates
- `POST /api/v1/export/sheets`: Export data to Google Sheets
- `GET /api/v1/export/auth/google`: Initiate Google OAuth flow
- `GET /api/v1/export/auth/google/callback`: Handle Google OAuth callback

### Services

The services implement the business logic for the application. Each service is responsible for a specific domain:

#### User Service

The user service handles user management operations:

- `get_user_by_id`: Get a user by ID
- `get_user_by_email`: Get a user by email
- `create_user`: Create a new user
- `update_user`: Update a user
- `delete_user`: Delete a user

#### Chat Service

The chat service handles conversation and message management:

- `get_conversations`: Get user conversations
- `create_conversation`: Create a new conversation
- `get_conversation`: Get conversation details
- `create_message`: Create a new message
- `get_messages`: Get conversation messages

#### Data Management Service

The data management service handles structured data operations:

- `get_structured_data`: Get structured data
- `create_structured_data`: Create structured data
- `get_structured_data_by_id`: Get structured data details
- `update_structured_data`: Update structured data
- `delete_structured_data`: Delete structured data

#### Sports Service

The sports service handles sports entity management:

- `get_leagues`: Get all leagues
- `create_league`: Create a new league
- `get_league`: Get league details
- `update_league`: Update a league
- `delete_league`: Delete a league

Similar methods exist for teams, players, games, stadiums, broadcast companies, production companies, and brands.

#### Export Service

The export service handles data export to Google Sheets:

- `export_sports_entities`: Export sports entities to Google Sheets
- `_entity_to_dict`: Convert an entity to a dictionary
- `_include_relationships`: Include relationships in the export
- `_format_for_sheet`: Format data for Google Sheets

#### Google Sheets Service

The Google Sheets service handles interaction with the Google Sheets API:

- `create_authorization_url`: Create authorization URL for OAuth2 flow
- `process_oauth_callback`: Process OAuth callback and save credentials
- `initialize_from_token`: Initialize service from saved token
- `create_spreadsheet`: Create a new spreadsheet
- `update_values`: Update values in a spreadsheet
- `get_values`: Get values from a spreadsheet
- `format_range`: Format a range in a spreadsheet
- `create_spreadsheet_with_template`: Create a spreadsheet with a template
- `apply_template_to_existing`: Apply a template to an existing spreadsheet
- `write_to_sheet`: Write data to a sheet
- `apply_formatting`: Apply formatting to a sheet

## Frontend Architecture

### React Application Structure

The frontend is built using React with TypeScript. The application structure follows a modular design:

```
frontend/
├── src/
│   ├── api/
│   │   ├── auth.ts           # Authentication API client
│   │   ├── chat.ts           # Chat API client
│   │   ├── data.ts           # Data API client
│   │   └── sports.ts         # Sports API client
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx    # Button component
│   │   │   └── ...           # Other common components
│   │   ├── chat/
│   │   │   ├── MessageThread.tsx # Message thread component
│   │   │   ├── MessageItem.tsx # Message item component
│   │   │   ├── ChatInput.tsx # Chat input component
│   │   │   └── ...           # Other chat components
│   │   ├── data/
│   │   │   ├── DataTable.tsx # Data table component
│   │   │   ├── ColumnManager.tsx # Column manager component
│   │   │   ├── ExportDialog.tsx # Export dialog component
│   │   │   └── ...           # Other data components
│   │   ├── Layout.tsx        # Layout component
│   │   └── Navbar.tsx        # Navbar component
│   ├── contexts/
│   │   ├── AuthContext.tsx   # Authentication context
│   │   └── ...               # Other contexts
│   ├── hooks/
│   │   ├── useAuth.ts        # Authentication hook
│   │   └── ...               # Other hooks
│   ├── pages/
│   │   ├── Login.tsx         # Login page
│   │   ├── Register.tsx      # Register page
│   │   ├── Chat.tsx          # Chat page
│   │   ├── DataManagement.tsx # Data management page
│   │   └── SportsDatabase.tsx # Sports database page
│   ├── services/
│   │   ├── DataExtractionService.ts # Data extraction service
│   │   └── SportsDatabaseService.ts # Sports database service
│   ├── types/
│   │   ├── auth.ts           # Authentication types
│   │   ├── chat.ts           # Chat types
│   │   ├── data.ts           # Data types
│   │   └── sports.ts         # Sports types
│   ├── utils/
│   │   ├── api.ts            # API utilities
│   │   └── ...               # Other utilities
│   ├── App.tsx               # Application component
│   └── main.tsx              # Application entry point
```

### Key Components

#### Layout and Navigation Components

- **Layout**: Main layout component that wraps all pages
- **Navbar**: Navigation bar component
- **DataFlowIndicator**: Visualizes the data flow journey between different sections of the application
- **SmartBreadcrumbs**: Displays breadcrumb navigation based on the data journey
- **PageHeader**: Standardized header component with title, description, and actions
- **PageContainer**: Consistent container for all pages that includes the PageHeader

#### Chat Components

- **MessageThread**: Displays chat messages and implements "Send to Data" functionality
- **MessageItem**: Displays a single message
- **ChatInput**: Allows users to send messages
- **ConversationList**: Displays a list of conversations
- **NewConversationModal**: Allows users to create a new conversation
- **StructuredFormatModal**: Allows users to select a structured format for data
- **SportDataEntryMode**: Allows users to enter sports data through chat
- **DataPreviewModal**: Allows users to preview extracted data before sending it to Data Management

#### Data Components

- **DataTable**: Displays structured data in a tabular format with editing capabilities
- **ColumnEditor**: Allows users to edit column properties like name, type, and format
- **DataManagement**: Main page component for managing structured data
- **Export**: Page component for exporting structured data to various formats (Google Sheets, Excel, CSV)
  - Integrates with Google Sheets API for direct export
  - Supports template selection for formatting exported data
  - Handles Google authentication flow
  - Provides real-time export status and results
- **SportDataMapper**: Advanced component for mapping and importing sports data
  - Implements drag-and-drop field mapping between source data and target entity fields
  - Provides record navigation controls to preview individual records before import
  - Supports record exclusion functionality with visual indicators
  - Features batch import with real-time progress tracking
  - Displays import completion status with record count
  - Handles field name prefixing to ensure uniqueness across entity types
  - Implements field mapping between UI field names and database field names
  - Provides error handling that continues processing even when individual records fail

### Services

#### Data Extraction Service

The data extraction service handles data extraction and transformation:

- `extractStructuredData`: Extracts data from message content
- `transformToRowFormat`: Standardizes data format
- `appendRows`: Adds rows to existing data
- `detectSportsDataType`: Analyzes data to determine if it's sports-related and identifies the entity type
- `generateFieldMappingRecommendations`: Suggests field mappings based on data content and entity type
- `findBestMatchingField`: Identifies the best match for a field name in available fields

#### Sports Database Service

The sports database service handles sports entity management:

- `getPromptTemplate`: Gets entity-specific prompt templates for guided data entry
- `validateSportsEntity`: Validates entity data against schema requirements
- `saveSportsEntity`: Saves entity data to the appropriate database endpoint
- `getEntities`: Retrieves entities of a specific type with optional filtering
- `getEntityById`: Gets a specific entity by ID
- `getEntitiesWithRelationships`: Retrieves entities with their related entities
- `prepareForExport`: Formats entity data for export to external systems
- `createEntity`: Creates a new entity of the specified type

Similar methods exist for teams, players, games, stadiums, broadcast companies, production companies, and brands.

### Contexts

#### Authentication Context

The authentication context manages user authentication state:

- `isAuthenticated`: Whether the user is authenticated
- `login`: Log in a user
- `logout`: Log out a user
- `register`: Register a new user

#### Notification Context

The notification context manages notifications:

- `showNotification`: Show a notification
- `hideNotification`: Hide a notification

#### DataFlow Context

The DataFlow context tracks data as it moves between components:

- `dataFlow`: Current data flow state
- `setSource`: Set the data source
- `setData`: Set the current data
- `setDestination`: Set the data destination
- `resetFlow`: Reset the data flow
- `addToJourney`: Add a source to the data journey

### Data Flow

#### Chat to Data Flow

1. User sends a message to the AI in the chat interface
2. AI responds with structured data (JSON format)
3. User clicks the "Send to Data" button
4. System checks for existing data by message ID
5. DataExtractionService extracts and transforms data
6. System verifies data creation success
7. Data is stored in the database with metadata
8. System waits for backend processing to complete
9. User is navigated to the data management page
10. Data is displayed in the DataTable component

#### Chat to Sports Database Flow

1. User sends a message to the AI in the chat interface
2. AI responds with structured sports data
3. System detects sports-related content using `detectSportsDataType`
4. User clicks the "Map to Sports Database" button
5. SportDataMapper component opens with the extracted data
6. System suggests field mappings based on detected entity type
7. User can adjust mappings using drag-and-drop interface
8. User navigates through records using left/right arrows
9. User can exclude specific records from import
10. User initiates batch import with "Save to Database" button
11. System shows real-time progress during import
12. Import completion status is displayed with record count
13. Success notification shows number of successfully imported records

#### Data Transformation

The application supports various JSON formats for structured data through a universal transformation approach:

##### Universal Data Transformation

The application uses a centralized data transformation utility (`dataTransformer.ts`) that handles all data formats consistently. This utility provides three main functions:

1. **transformToStandardFormat**: Transforms any data structure into a standardized format with headers and rows arrays.
   - Handles row-oriented data (headers + rows arrays)
   - Processes column-oriented data (columns array with header + values)
   - Transforms arrays of objects (flat objects)
   - Converts single objects to row/column format

2. **transformToRowObjects**: Converts the standardized format into row objects for display in a data grid.
   - Takes headers and rows arrays as input
   - Creates an array of objects where each object represents a row
   - Adds row numbering for better navigation
   - Handles missing values gracefully

3. **transformNestedToRowObjects**: Directly transforms any data format into row objects for display.
   - Combines the functionality of the above two functions
   - Provides a single entry point for all data transformation needs
   - Ensures consistent output format regardless of input structure

##### Supported Data Formats

The application handles these common data formats:

1. **Row-oriented Format**: Data with `headers` array and `rows` array of arrays
   ```json
   {
     "headers": ["Name", "Age", "City"],
     "rows": [
       ["John", 30, "New York"],
       ["Jane", 25, "Los Angeles"]
     ]
   }
   ```

2. **Column-oriented Format**: Data with column objects containing headers and values
   ```json
   {
     "columns": [
       {"header": "Name", "values": ["John", "Jane"]},
       {"header": "Age", "values": [30, 25]},
       {"header": "City", "values": ["New York", "Los Angeles"]}
     ]
   }
   ```

3. **Flat Objects**: Array of objects with consistent keys
   ```json
   [
     {"Name": "John", "Age": 30, "City": "New York"},
     {"Name": "Jane", "Age": 25, "City": "Los Angeles"}
   ]
   ```

4. **Special Table Data Format**: Used for NFL teams and similar data
   ```json
   {
     "headers": ["NFL Team", "City", "State", "Home Stadium"],
     "rows": [
       ["Dallas Cowboys", "Arlington", "Texas", "AT&T Stadium"],
       ["Green Bay Packers", "Green Bay", "Wisconsin", "Lambeau Field"]
     ]
   }
   ```

##### Data Flow

1. **Extraction**: `DataExtractionService.extractStructuredData()` extracts JSON structures from message content.
2. **Standardization**: `transformToStandardFormat()` converts the extracted data to a standard format.
3. **Transformation**: `transformToRowObjects()` or `transformNestedToRowObjects()` converts the standardized data to row objects.
4. **Display**: Components like `DataTable` and `DataPreviewModal` render the transformed data.

This universal approach ensures consistent handling of all data formats across the application, preventing issues like inverted rows and columns in the display.

#### Export Flow

1. User selects entities to export in the SportsDatabase page
2. User clicks the "Export" button
3. ExportDialog component is displayed
4. User selects export options
5. System sends export request to the backend
6. Backend retrieves entities and related data
7. Backend creates a Google Sheet and writes data
8. Backend applies formatting to the sheet
9. Backend returns spreadsheet ID and URL
10. User is provided with a link to the spreadsheet

## Sports Database Implementation

### Entity Types and Relationships

The sports database implements a comprehensive schema for sports entities:

#### Core Entities

1. **League**: Represents a sports league (e.g., NFL, NBA)
   - Properties: name, sport, country, founded_year, description
   - Relationships: teams (one-to-many)

2. **Team**: Represents a sports team belonging to a league
   - Properties: name, city, state, country, founded_year, league_id, stadium_id
   - Relationships: league (many-to-one), players (one-to-many), stadium (many-to-one)

3. **Player**: Represents a player belonging to a team
   - Properties: first_name, last_name, position, jersey_number, birth_date, nationality, team_id
   - Relationships: team (many-to-one)

4. **Game**: Represents a game between two teams
   - Properties: name, date, time, home_team_id, away_team_id, stadium_id, season, status
   - Relationships: home_team (many-to-one), away_team (many-to-one), stadium (many-to-one)

5. **Stadium**: Represents a venue where games are played
   - Properties: name, city, state, country, capacity, opened_year, description
   - Relationships: teams (one-to-many), games (one-to-many)

#### Business Entities

6. **BroadcastCompany**: Represents a company that broadcasts games
   - Properties: name, headquarters, founded_year, description
   - Relationships: broadcast_rights (one-to-many)

7. **BroadcastRights**: Represents the rights of a broadcast company to broadcast games
   - Properties: name, company_id, entity_type, entity_id, start_date, end_date, territory, value, description
   - Relationships: company (many-to-one)

8. **ProductionCompany**: Represents a company that produces broadcasts
   - Properties: name, headquarters, founded_year, description
   - Relationships: production_services (one-to-many)

9. **ProductionService**: Represents the services provided by a production company
   - Properties: name, company_id, entity_type, entity_id, service_type, start_date, end_date, description
   - Relationships: company (many-to-one)

10. **Brand**: Represents a brand that sponsors teams or leagues
    - Properties: name, industry, headquarters, founded_year, description
    - Relationships: brand_relationships (one-to-many)

11. **BrandRelationship**: Represents the relationship between a brand and a sports entity
    - Properties: name, brand_id, entity_type, entity_id, relationship_type, start_date, end_date, value, description
    - Relationships: brand (many-to-one)

### Field Mapping and Validation

The sports database implementation includes comprehensive field mapping and validation:

#### Field Mapping

The `SportDataMapper` component handles field mapping between source data and target entity fields:

1. **Field Name Prefixing**: Ensures uniqueness across entity types by prefixing fields with entity type
   - Example: `name` becomes `league_name`, `team_name`, etc.

2. **UI to Database Field Mapping**: Converts UI field names to database field names
   - Implemented in `mapToDatabaseFieldNames` function in `SportDataMapper.tsx`
   - Handles entity-specific field name transformations

3. **Automatic Field Mapping Suggestions**: Analyzes source data to suggest appropriate field mappings
   - Uses `generateFieldMappingRecommendations` in `DataExtractionService`
   - Considers field name synonyms and common patterns

#### Validation

The `SportsDatabaseService` implements comprehensive validation for all entity types:

1. **Required Field Validation**: Ensures all required fields are present
   - Entity-specific validation rules in `validateSportsEntity` method
   - Returns detailed validation errors by field

2. **Type Validation**: Verifies field values match expected types
   - Numeric fields (e.g., capacity, founded_year)
   - Date fields (e.g., start_date, end_date)
   - Enumerated values (e.g., status, relationship_type)

3. **Relationship Validation**: Ensures referenced entities exist
   - Foreign key validation (e.g., league_id, team_id)
   - Entity type validation for polymorphic relationships

### Batch Import Process

The batch import process in the `SportDataMapper` component handles importing multiple records:

1. **Preparation Phase**:
   - Field mapping is established through drag-and-drop interface
   - Records are previewed and can be excluded if needed
   - Import button is enabled when mapping is valid

2. **Execution Phase**:
   - Import progress is tracked in real-time with "Importing... (X/Y)" indicator
   - Each record is processed sequentially for accurate progress tracking
   - Records are transformed using the field mapping
   - Validation is performed before saving each record
   - Failed records are logged but don't halt the process

3. **Completion Phase**:
   - Import button changes to "Import Complete (X records)" and is disabled
   - Success notification shows number of successfully imported records
   - Completed state is maintained until modal is closed or new import starts

### Testing and Debugging

The sports database implementation includes comprehensive testing and debugging features:

1. **Test Buttons**: Added in both MessageItem and App components
   - Generate sample sports data for testing
   - Open SportDataMapper with predefined test data
   - Include visual indicators for test mode

2. **Enhanced Logging**: Comprehensive console logging throughout the process
   - Field mapping operations
   - Validation results
   - Import progress
   - Error details

3. **Visual Indicators**: Clear visual feedback during the import process
   - Progress indicators
   - Completion status
   - Error notifications
   - Record navigation controls

## Future Enhancements

### Planned Technical Improvements

1. **Google Sheets Integration**:
   - Bidirectional data flow between database and Google Sheets
   - Template-based export with formatting
   - Scheduled synchronization

2. **Performance Optimization**:
   - Implement code splitting for faster initial load
   - Add caching for API responses
   - Optimize component rendering with useMemo and useCallback
   - Implement virtualized lists for large datasets

3. **Advanced Data Visualization**:
   - Interactive relationship diagrams for sports entities
   - Statistical dashboards for sports data
   - Timeline visualizations for temporal data

4. **Mobile Responsiveness**:
   - Enhance UI components for mobile devices
   - Implement responsive design patterns
   - Optimize touch interactions for data manipulation

5. **User Permissions**:
   - Role-based access control
   - Team collaboration features
   - Sharing and permission management

## Recent Improvements

### DataTable Component

- **Column Resizing**: Implemented width updates during mouse movement for smoother experience
- **Grid Expansion**: Implemented dynamic height adjustment based on content
- **Raw Data Display**: Enhanced with better JSON formatting

### Data Transformation

- **Logging**: Added comprehensive logging throughout the transformation process
- **Error Handling**: Improved for unusual data formats
- **Validation**: Enhanced for incoming data structures

### Send to Data Feature

- **Error Handling**: Implemented retry logic for API calls
- **Verification Steps**: Added to check if data was created despite errors
- **User Experience**: Improved button state and navigation timing

### Export Functionality

- **UI Implementation**: Created ExportDialog component for template selection and preview
- **Backend Integration**: Implemented export service for Google Sheets integration

### Backend Fixes

- **UUID Handling**: Fixed UUID serialization issues by using SQLUUID type
- **Import Path Resolution**: Updated import paths to reflect correct directory structure
- **Authentication Utility**: Created auth.py utility for user authentication

## Next Steps

### DataTable Enhancements

- **Pagination**: Implement pagination for large datasets
- **Filtering**: Add advanced filtering capabilities
- **Column Typing**: Improve detection and formatting based on data types

### Export System

- **Backend Integration**: Complete Google Sheets API integration
- **Template System**: Finalize template selection and application
- **Status Tracking**: Add notifications and progress indicators

### Data Transformation

- **Standardization**: Create consistent process across all components
- **Nested Structures**: Improve handling of complex nested data
- **Validation**: Enhance checks for data integrity

### Performance

- **Large Datasets**: Optimize rendering and processing
- **Caching**: Implement strategies for frequently accessed data
- **Query Optimization**: Improve database queries for better response times

### Data Management

The application uses React Query for data fetching and state management. Key configurations include:

- **Optimized Caching**: 
  - `staleTime`: 15 minutes - Data is considered fresh for 15 minutes before refetching
  - `gcTime`: 60 minutes - Unused data is garbage collected after 60 minutes
  - `refetchOnWindowFocus`: Disabled to prevent data loss during navigation

- **Error Handling**:
  - Retry logic with exponential backoff
  - Maximum retry delay of 30 seconds
  - Consistent error notifications through NotificationContext

- **Data Persistence Strategy**:
  - Conversations and messages are cached for the duration of the session
  - Structured data queries maintain state during navigation
  - Mutations update the cache optimistically for immediate UI updates
  - Background refetching minimizes loading states

This configuration ensures that data remains available during navigation, reducing unnecessary API calls and providing a smoother user experience.

## Data Formats and Transformation

### Supported Data Formats

The application supports various JSON formats for structured data:

#### 1. Row-oriented Format
```json
{
  "headers": ["Team", "City", "State", "Stadium"],
  "rows": [
    ["Cowboys", "Dallas", "Texas", "AT&T Stadium"],
    ["Eagles", "Philadelphia", "Pennsylvania", "Lincoln Financial Field"]
  ]
}
```

#### 2. Column-oriented Format
```json
{
  "columns": [
    { "header": "Team", "values": ["Cowboys", "Eagles"] },
    { "header": "City", "values": ["Dallas", "Philadelphia"] },
    { "header": "State", "values": ["Texas", "Pennsylvania"] },
    { "header": "Stadium", "values": ["AT&T Stadium", "Lincoln Financial Field"] }
  ]
}
```

#### 3. Flat Objects Format
```json
[
  { "Team": "Cowboys", "City": "Dallas", "State": "Texas", "Stadium": "AT&T Stadium" },
  { "Team": "Eagles", "City": "Philadelphia", "State": "Pennsylvania", "Stadium": "Lincoln Financial Field" }
]
```

#### 4. NFL Teams Data Format
The application has special handling for NFL teams data, which may come in a markdown table format:
```
| NFL Team | City | State | Stadium |
| -------- | ---- | ----- | ------- |
| Cowboys | Dallas | Texas | AT&T Stadium |
| Eagles | Philadelphia | Pennsylvania | Lincoln Financial Field |
```

### Data Transformation Process

The application uses a three-step process for data transformation:

1. **Extraction**: The `DataExtractionService` extracts structured data from message content, detecting JSON structures or special formats like NFL teams tables.

2. **Standardization**: The `transformToStandardFormat` function converts any data structure into a standardized format with headers and rows arrays.

3. **Row Object Transformation**: The `transformToRowObjects` function converts the standardized format into row objects for display in the data grid.

### Special Case: NFL Teams Data

NFL teams data requires special handling due to its format:

1. **Detection**: The application detects NFL teams data by looking for specific headers like "NFL Team" or "Team" in the message content.

2. **Extraction**: For markdown tables, a regex pattern is used to extract the table structure and parse it into headers and rows.

3. **Transformation**: The extracted data is transformed into the standard format with headers and rows arrays.

4. **Display**: The `DataPreviewModal` and `DataTable` components have special handling to ensure proper display of NFL teams data.

## Data Handling Architecture

### Overview
The data handling system in SheetGPT is designed to provide a universal approach to transforming and displaying structured data from various sources. The architecture follows a centralized transformation pattern, where all data processing is handled by a single utility that serves as the source of truth for data format conversion.

### Key Components

#### 1. Data Transformer Utility (`dataTransformer.ts`)
- **Purpose**: Serves as the central hub for all data transformations
- **Key Functions**:
  - `transformToStandardFormat`: Converts any data format into a standardized internal format
  - `transformToRowObjects`: Transforms standardized data into row objects for display
  - `transformDataForDisplay`: One-step transformation from any format to display-ready row objects
- **Data Interfaces**:
  - `StandardDataFormat`: Defines the structure for standardized data with headers and rows
  - `RowObjectsFormat`: Defines the structure for row objects used in display components

#### 2. Data Extraction Service (`DataExtractionService.ts`)
- **Purpose**: Extracts structured data from various sources (markdown tables, JSON, etc.)
- **Key Methods**:
  - `extractStructuredData`: Main method for extracting data from message content
  - `extractTableFromMarkdown`: Extracts data from markdown table formats
  - `extractJsonStructures`: Extracts data from JSON-like structures
  - `appendRows`: Appends new rows to existing structured data
  - `transformToRowFormat`: Transforms extracted data into row format using the data transformer

#### 3. Display Components
- **DataTable Component** (`DataTable.tsx`):
  - Displays structured data in a grid format
  - Uses the centralized data transformer for consistent display
  - Supports features like column resizing, row reordering, and toggling headers
  
- **DataPreviewModal Component** (`DataPreviewModal.tsx`):
  - Previews extracted data before sending it to the Data Management section
  - Uses the same centralized data transformer for consistent display
  - Provides options to confirm or cancel the data transfer

### Data Flow
1. **Extraction**: The `DataExtractionService` extracts structured data from message content
2. **Transformation**: The extracted data is transformed into a standardized format using the data transformer
3. **Display**: The standardized data is transformed into row objects for display in UI components
4. **Interaction**: Users can interact with the displayed data through the UI components

### Benefits of the Architecture
- **Consistency**: All data is handled uniformly regardless of source or format
- **Maintainability**: Centralized logic makes the codebase easier to maintain
- **Reliability**: Standardized approach reduces edge cases and potential bugs
- **Performance**: Eliminated redundant transformations improves efficiency
- **Extensibility**: New data formats can be easily supported by updating the central transformer

### Error Handling
- Comprehensive logging throughout the transformation process
- Graceful handling of edge cases and invalid data formats
- Clear error messages for debugging purposes

### Future Enhancements
- Unit tests for the data transformation pipeline
- Performance optimizations for large datasets
- Support for additional data formats and sources

### API Routes

// ... existing code ...