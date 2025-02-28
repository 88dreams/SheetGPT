# Technical Description

This document provides a technical description of the major code sections in the SheetGPT project.

## Backend Architecture

### FastAPI Application Structure

The backend is built using FastAPI with a modular design:

```
src/
├── api/routes/        # API endpoints by domain
├── config/            # Application settings
├── models/            # Database models (SQLAlchemy)
├── schemas/           # Pydantic schemas for validation
├── services/          # Business logic by domain
├── utils/             # Utility functions
└── main.py            # Application entry point
```

### Database Models

The database uses SQLAlchemy ORM with PostgreSQL, organized into:

1. **User Models**: Authentication and user management
2. **Chat Models**: Conversations and messages
3. **Data Models**: Structured data and columns
4. **Sports Models**: Comprehensive sports database schema

#### Sports Database Schema

The sports database schema models relationships between various sports entities:

- **Core Entities**: League, Team, Player, Game, Stadium
- **Business Entities**: BroadcastCompany, BroadcastRights, ProductionCompany, ProductionService, Brand, BrandRelationship, GameBroadcast, LeagueExecutive

All models use UUID primary keys and define relationships using SQLAlchemy's relationship mechanism.

### Database Transaction Management

The application implements two complementary methods for database access:

1. **FastAPI Dependency Injection** (`get_db`): For most API endpoints where a single transaction is sufficient
2. **Context Manager for Isolated Sessions** (`get_db_session`): For operations requiring more granular transaction control

This dual approach enhances reliability and maintainability of database operations.

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

```
.github/
└── workflows/
    └── ci-cd.yml    # CI/CD workflow configuration
```

The CI/CD pipeline automates testing and ensures code quality:

1. **Workflow Triggers**: Activated on pushes to main branch and pull requests
2. **Environment Setup**: Uses Ubuntu with Docker and Docker Compose
3. **Test Execution**: Runs tests in Docker containers that match the production environment
4. **Result Verification**: Validates test results and provides feedback

The pipeline ensures that all tests pass before code is merged, maintaining code quality and preventing regressions.

### API Routes

The API routes are organized by domain:

- **Authentication Routes**: User registration, login, token management
- **Chat Routes**: Conversation and message management
- **Data Management Routes**: Structured data operations
- **Sports Database Routes**: Sports entity management
- **Export Routes**: Data export operations
- **Admin Routes**: Administrative operations (restricted to admin users)

## Frontend Architecture

### React Application Structure

The frontend uses React with TypeScript, following a modular design:

```
frontend/
├── src/
│   ├── api/           # API clients by domain
│   ├── components/    # UI components
│   ├── contexts/      # React contexts
│   ├── hooks/         # Custom hooks
│   ├── pages/         # Page components
│   ├── services/      # Frontend services
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   ├── App.tsx        # Application component
│   └── main.tsx       # Application entry point
```

### Key Components

#### Layout and Navigation

- **Layout**: Main layout wrapper
- **Navbar**: Navigation bar
- **PageHeader**: Standardized header with title, description, and actions
- **PageContainer**: Consistent container for all pages

#### Chat Components

- **MessageThread**: Displays chat messages with "Send to Data" functionality
- **MessageItem**: Displays a single message
- **ChatInput**: Allows users to send messages
- **ConversationList**: Displays conversations with delete/rename functionality
- **DataPreviewModal**: Previews extracted data before sending to Data Management

#### Data Components

- **DataTable**: Displays structured data in a tabular format with editing
- **ColumnEditor**: Edits column properties
- **DataManagement**: Main page for managing structured data
- **Export**: Handles exporting data to various formats

#### Sports Database Components

- **SportsDatabase**: Main page for managing sports entities
- **SportDataMapper**: Maps structured data to sports database entities
  - Implements drag-and-drop field mapping
  - Provides record navigation controls
  - Supports batch import with progress tracking
  - Handles automatic entity resolution

### Custom Hooks

The SportDataMapper component uses several custom hooks:

- **useFieldMapping**: Manages field mapping functionality
- **useRecordNavigation**: Manages record navigation and exclusion
- **useImportProcess**: Manages the import process
- **useUiState**: Manages UI state
- **useDataManagement**: Manages data operations

## Data Flow Architecture

### Chat to Data Flow

1. User sends a message to the AI
2. AI responds with structured data
3. User clicks "Send to Data" button
4. System extracts and transforms data
5. Data is stored in the database
6. User is navigated to the data management page

### Chat to Sports Database Flow

1. User sends a message to the AI
2. AI responds with structured sports data
3. System detects sports-related content
4. User clicks "Map to Sports Database" button
5. SportDataMapper opens with extracted data
6. System suggests field mappings
7. User adjusts mappings and initiates batch import
8. System shows real-time progress during import

### Data Transformation

The application supports various data formats through a universal transformation approach:

1. **Row-oriented Format**: Data with headers array and rows array
2. **Column-oriented Format**: Data with column objects containing headers and values
3. **Flat Objects**: Array of objects with consistent keys
4. **Special Table Formats**: Used for specific data like NFL teams

The transformation process uses:
- **DataExtractionService**: Extracts structured data from message content
- **Data Transformer Utility**: Converts any format to standardized internal format
- **Display Components**: Render the transformed data consistently

### Export Flow

1. User selects entities to export
2. User selects export options
3. System creates a Google Sheet and writes data
4. User receives a link to the spreadsheet

## Entity Resolution and Field Mapping

### Automatic Entity Resolution

The batch import process handles entity relationships automatically:

1. **Entity Lookup**: Finds entities by name using `lookupEntityIdByName`
2. **Automatic Creation**: Creates missing entities (stadiums, leagues) during import
3. **Enhanced Field Mapping**: Handles name-to-UUID conversion with `enhancedMapToDatabaseFieldNames`
4. **UUID Validation**: Validates UUID format with fallback mechanisms

### Field Mapping and Validation

1. **Field Name Prefixing**: Ensures uniqueness across entity types
2. **UI to Database Field Mapping**: Converts UI field names to database field names
3. **Automatic Field Mapping Suggestions**: Analyzes source data to suggest mappings
4. **Required Field Validation**: Ensures all required fields are present
5. **Type Validation**: Verifies field values match expected types
6. **Relationship Validation**: Ensures referenced entities exist

## Testing Infrastructure

The project uses Jest and React Testing Library with:

1. **Isolated Testing**: Components tested with mocked dependencies
2. **Rendering Tests**: Verify components render correctly
3. **Interaction Tests**: Verify components respond to user interactions
4. **Custom Render Functions**: Wrap components with necessary providers
5. **Hook Testing**: Tests custom hooks using `renderHook`

Recent testing improvements include:
- Enhanced mocks for Headless UI components
- Updated test expectations
- Comprehensive documentation of testing patterns

## Recent Improvements

1. **UI Enhancements**:
   - Improved navigation controls
   - Enhanced record handling
   - Updated color scheme and spacing

2. **Data Transformation**:
   - Added comprehensive logging
   - Improved error handling
   - Enhanced validation

3. **Batch Import Process**:
   - Added real-time progress tracking
   - Enhanced error reporting
   - Improved entity relationship handling

4. **Testing Infrastructure**:
   - Enhanced mocks for Headless UI components
   - Updated test expectations
   - Added detailed documentation

## Next Steps

1. **Google Sheets Integration**:
   - Complete bidirectional data flow
   - Finalize template-based export
   - Implement scheduled synchronization

2. **Performance Optimization**:
   - Implement code splitting
   - Add caching for API responses
   - Optimize component rendering
   - Implement virtualized lists for large datasets

3. **Advanced Data Visualization**:
   - Add interactive relationship diagrams
   - Create statistical dashboards
   - Implement timeline visualizations

4. **Mobile Responsiveness**:
   - Enhance UI components for mobile
   - Optimize touch interactions

5. **User Permissions**:
   - Implement role-based access control
   - Add team collaboration features
