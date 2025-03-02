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

### Database Initialization and Authentication System

The application uses a database initialization script (`init_db.py`) to set up the database:

1. **Table Creation**: Creates all required tables using SQLAlchemy's `create_all` method
2. **Test User Creation**: Creates a test user if it doesn't exist
   - Email: test@example.com
   - Password: password123 (hashed in the database)
   - Used for testing and initial setup

The authentication system uses JWT (JSON Web Tokens):

1. **Login Process**:
   - User submits email and password to `/api/v1/auth/login`
   - Backend verifies credentials using `verify_password`
   - If valid, backend generates a JWT token with `create_access_token`
   - Token contains user ID and expiration time
   - Token is returned to the client

2. **Token Usage**:
   - Frontend stores token in localStorage
   - Token is included in Authorization header for protected requests
   - Backend validates token using `get_current_user_id` dependency
   - If token is invalid or expired, 401 Unauthorized is returned

3. **User Information**:
   - Current user information can be retrieved from `/api/v1/auth/me`
   - Endpoint requires valid authentication token
   - Returns user email and role information (is_active, is_superuser, is_admin)

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

### API Configuration

The frontend communicates with the backend API using a centralized configuration:

```typescript
// API URL Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';
```

This configuration:
1. Prioritizes the environment variable `VITE_API_URL` if available
2. Falls back to `http://localhost:8000` for local development
3. Ensures consistent API URL resolution across all environments
4. Avoids using Docker service names that aren't resolvable from browsers

The environment variable is set in the Docker Compose file:

```yaml
# Docker Compose configuration for frontend service
frontend:
  # ... other configuration ...
  environment:
    - VITE_API_URL=http://localhost:8000
```

This ensures that the frontend container uses the correct API URL that is resolvable from both inside the container and from the browser.

The API client uses Axios for HTTP requests with:
- Automatic token inclusion in request headers
- Centralized error handling
- Response transformation
- Request/response logging

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

## Frontend Components

### SportDataMapper Component

The SportDataMapper component has been successfully refactored into a modular architecture that improves maintainability, testability, and developer experience. The component allows users to map structured data to sports database entities with the following features:

1. **Modular Architecture**:
   - **Main Components**: SportDataMapper (wrapper) and SportDataMapperContainer (core functionality)
   - **UI Components**: FieldItem, FieldHelpTooltip, GuidedWalkthrough
   - **Custom Hooks**: useFieldMapping, useRecordNavigation, useImportProcess, useUiState, useDataManagement
   - **Utility Modules**: entityTypes, entityDetection, validationUtils, mappingUtils, uiUtils

2. **Key Features**:
   - **Automatic Entity Type Detection**: Analyzes source data to recommend the most likely entity type
   - **Drag-and-Drop Field Mapping**: Intuitive interface for mapping fields with visual feedback
   - **Field Validation**: Validates required fields and data formats before saving
   - **Batch Import**: Efficiently imports multiple records with progress tracking
   - **Guided Walkthrough**: Step-by-step guidance for first-time users
   - **Field Help**: Contextual help for understanding field requirements

3. **Data Flow**:
   - User provides structured data to the component
   - Component extracts source fields and values
   - Component recommends entity type based on field analysis
   - User maps source fields to entity fields
   - User navigates through records and excludes unwanted ones
   - User saves mapped data to database (single record or batch)

4. **State Management**:
   - **Field Mapping State**: Tracks mappings between source and target fields
   - **Record Navigation State**: Manages current record index and exclusion status
   - **Import Process State**: Handles saving to database and batch import
   - **UI State**: Manages view mode, guided walkthrough, and field help
   - **Data Management State**: Handles data extraction and transformation

5. **Testing Infrastructure**:
   - Comprehensive test coverage with 68 passing tests across 10 test suites
   - All functional components and hooks thoroughly tested
   - Mocks for external dependencies like Headless UI and React DnD
   - Custom render functions for components with complex dependencies
   - Test utilities for simulating drag and drop operations
   - Minor TypeScript configuration issue identified in the test environment

The refactoring has significantly improved the component's architecture, making it more maintainable and easier to extend with new features. The component has been thoroughly tested in both local and Docker environments, confirming its functionality and reliability.

### SportDataMapperContainer Component

The SportDataMapperContainer component is the core component of the SportDataMapper system, responsible for orchestrating the data mapping process. It has been completely refactored to utilize a modular architecture with smaller, focused components and custom hooks.

1. **Component Structure**:
   ```typescript
   const SportDataMapperContainer: React.FC<SportDataMapperContainerProps> = ({
     data,
     onClose,
     onSaveComplete,
     initialEntityType,
     showGuidedWalkthrough = false,
   }) => {
     // State management using custom hooks
     const {
       fieldMappings,
       targetFields,
       updateFieldMappings,
       resetFieldMappings,
       validateMappings,
       // ... other field mapping functions
     } = useFieldMapping();
     
     const {
       currentIndex,
       totalRecords,
       excludedRecords,
       navigateToRecord,
       toggleExcludeRecord,
       // ... other navigation functions
     } = useRecordNavigation();
     
     const {
       isSaving,
       saveProgress,
       saveToDatabase,
       batchImport,
       // ... other import functions
     } = useImportProcess();
     
     const {
       viewMode,
       setViewMode,
       showFieldHelp,
       toggleFieldHelp,
       // ... other UI state functions
     } = useUiState();
     
     const {
       sourceFields,
       sourceFieldValues,
       dataToImport,
       isDataValid,
       updateSourceFieldValues,
       // ... other data management functions
     } = useDataManagement();
     
     // Local state
     const [suggestedEntityType, setSuggestedEntityType] = useState<string | null>(null);
     
     // Component logic and rendering
     // ...
   };
   ```

2. **Key Improvements**:
   - **Modular Component Imports**: Utilizes smaller, focused components like EntityTypeSelector, ViewModeSelector, RecordNavigation, FieldMappingArea, GlobalMappingView, ActionButtons, Notification, and GuidedWalkthrough
   - **Custom Hooks for State Management**: Separates concerns using specialized hooks for different aspects of functionality
   - **Improved Error Handling**: Provides clear error messages and notifications for invalid data formats
   - **Enhanced Conditional Rendering**: Uses viewMode to determine which components to display
   - **Better Data Flow**: Implements clear data flow between components with proper prop passing

3. **Component Rendering**:
   ```tsx
   return (
     <div className="sport-data-mapper-container">
       {/* Header section with entity type selector and view mode controls */}
       <div className="header-section">
         <EntityTypeSelector 
           selectedEntityType={selectedEntityType}
           onEntityTypeChange={handleEntityTypeChange}
           suggestedEntityType={suggestedEntityType}
         />
         <ViewModeSelector 
           viewMode={viewMode}
           onViewModeChange={setViewMode}
         />
       </div>
       
       {/* Record navigation controls */}
       <RecordNavigation 
         currentIndex={currentIndex}
         totalRecords={totalRecords}
         excludedRecords={excludedRecords}
         onNavigate={navigateToRecord}
         onToggleExclude={toggleExcludeRecord}
       />
       
       {/* Main content area - conditional rendering based on viewMode */}
       {viewMode === 'entity' ? (
         <FieldMappingArea 
           sourceFields={sourceFields}
           targetFields={targetFields}
           fieldMappings={fieldMappings}
           onUpdateMappings={updateFieldMappings}
           showFieldHelp={showFieldHelp}
           onToggleFieldHelp={toggleFieldHelp}
         />
       ) : (
         <GlobalMappingView 
           sourceFields={sourceFields}
           fieldMappings={fieldMappings}
           entityTypes={ENTITY_TYPES}
           selectedEntityType={selectedEntityType}
         />
       )}
       
       {/* Action buttons */}
       <ActionButtons 
         onSave={() => saveToDatabase(selectedEntityType, fieldMappings, sourceFieldValues)}
         onBatchImport={() => batchImport(selectedEntityType, fieldMappings, dataToImport, excludedRecords)}
         onClose={onClose}
         isSaving={isSaving}
         saveProgress={saveProgress}
       />
       
       {/* Notifications and guided walkthrough */}
       <Notification show={!isDataValid} message="Invalid data format detected. Please check your data." />
       {showGuidedWalkthrough && (
         <GuidedWalkthrough onClose={() => setShowGuidedWalkthrough(false)} />
       )}
     </div>
   );
   ```

4. **Data Processing Logic**:
   - **Entity Type Detection**: Analyzes source fields to suggest the most appropriate entity type
   - **Data Validation**: Validates data format and structure before processing
   - **Field Mapping Management**: Handles creation and updates of field mappings
   - **Record Navigation**: Manages navigation between records with proper state updates
   - **Batch Import Process**: Orchestrates the batch import process with progress tracking

5. **Error Handling and Edge Cases**:
   - **Invalid Data Format**: Detects and notifies users of invalid data formats
   - **Missing Required Fields**: Validates required fields before saving
   - **Empty Data**: Handles empty data sets gracefully
   - **Navigation Boundaries**: Prevents navigation beyond the first or last record
   - **Import Failures**: Provides detailed error messages for import failures

The refactored SportDataMapperContainer component provides a more maintainable, testable, and extensible foundation for the sports data mapping functionality. The modular architecture allows for easier updates and enhancements in the future, while the comprehensive error handling ensures a robust user experience.

### DataTable Component

The DataTable component is a versatile grid for displaying structured data with the following features:

1. **Data Transformation**: Uses a centralized transformer to handle various data formats consistently
2. **Pagination**: Implements client-side and server-side pagination for efficient handling of large datasets
   - Automatically enables pagination when row count exceeds the page size
   - Supports configurable rows per page (10, 25, 50, 100)
   - Provides intuitive navigation controls (first, previous, next, last)
   - Maintains correct row numbering across pages
3. **Column Management**:
   - Resizable columns with drag handles
   - Reorderable columns via drag and drop
   - Customizable column visibility
4. **Row Management**:
   - Reorderable rows via drag and drop
   - Row numbering with optional visibility
5. **UI Flexibility**:
   - Expandable/collapsible grid and raw data views
   - Resizable panel heights
   - Export functionality to Google Sheets

The pagination implementation integrates with the backend API's pagination support:
- Frontend sends `skip` and `limit` parameters to the `/data/{data_id}/rows` endpoint
- Backend returns paginated data with total count information
- UI automatically updates to reflect the current page and total available data

This approach significantly improves performance when dealing with large datasets by:
- Reducing the amount of data transferred over the network
- Decreasing rendering time for large tables
- Improving the overall user experience with faster load times

## Sports Database

### Advanced Filtering System

The advanced filtering system for the Sports Database component provides a flexible and powerful way to filter entities based on various criteria. The system consists of several key components:

#### EntityFilter Component

The `EntityFilter` component (`frontend/src/components/sports/EntityFilter.tsx`) provides a user interface for creating and managing filters:

- **Filter Configuration**: Defines a filter with field, operator, and value properties
- **Field Options**: Dynamically provides appropriate fields based on the selected entity type
- **Operator Options**: Provides context-aware operators based on the field type (string, number, date, boolean)
- **Value Input**: Renders appropriate input controls based on the field type
- **Filter Management**: Allows adding, removing, and applying multiple filters
- **Filter Persistence**: Supports initializing with existing filters and saving applied filters
- **Type Safety**: Implements comprehensive TypeScript interfaces and type checking

#### Frontend Integration

The filtering system is integrated into the SportsDatabase component:

- **Filter State Management**: Maintains active filters in component state
- **Query Integration**: Includes filters in API requests via the useQuery hook
- **Filter Persistence**: Saves and loads filters from localStorage to persist across navigation
- **UI Integration**: Shows filter status and provides clear filter functionality
- **Type-Safe Operations**: Uses proper TypeScript typing for all operations, including:
  - Explicit type definitions for entity summaries and fields
  - Type-safe property access in sorting functions
  - Null-safe array operations with proper type checking
  - Comprehensive interface definitions for all data structures

#### Backend Implementation

The backend supports advanced filtering through:

- **API Endpoint**: Enhanced `/api/v1/sports/entities/{entity_type}` endpoint to accept filter parameters
- **Filter Parsing**: Converts JSON filter configurations to SQL-compatible filter expressions
- **Dynamic Query Building**: Constructs SQL queries with WHERE clauses based on filter configurations
- **Operator Mapping**: Maps frontend operators (eq, contains, etc.) to SQL operators (=, LIKE, etc.)
- **Value Formatting**: Handles special cases like LIKE patterns for contains, startswith, and endswith operators

#### Data Flow

1. User creates filters using the EntityFilter component
2. Filters are stored in component state and localStorage
3. API requests include filters as a JSON string parameter
4. Backend parses filters and constructs appropriate SQL queries
5. Filtered results are returned to the frontend
6. UI updates to display filtered entities

This architecture provides a flexible and extensible filtering system that can be easily expanded to support additional filter types and operators in the future.

### Client-Side Filtering Implementation

To improve reliability and performance, we've implemented a hybrid filtering approach for the Sports Database component. This approach tries to use backend filtering first, with client-side filtering as a fallback mechanism.

#### Key Components

1. **Backend Filtering**
   - Located in `sports_service.py` and `sports.py`
   - Processes filter configurations and builds SQL queries
   - Handles special cases and error conditions
   - Provides detailed logging for debugging

2. **Frontend Hybrid Approach**
   - Located in `SportsDatabaseContext.tsx`
   - Tries backend filtering first
   - Falls back to client-side filtering when backend filtering fails
   - Uses intelligent detection to determine when client-side filtering is needed

3. **Filter Application Logic**
   - Uses JavaScript's `filter` and `every` methods to apply filters
   - Implements AND logic (all filters must match)
   - Handles different data types appropriately (string, number, boolean)
   - Performs case-insensitive string comparisons for text fields

4. **UI Enhancements**
   - Displays a message showing the number of entities matching applied filters
   - Provides visual feedback when filters are active
   - Maintains consistent UI state during filter operations

#### Implementation Details

The hybrid approach is implemented in the `useQuery` hook in `SportsDatabaseContext.tsx`:

```typescript
const {
  data: entities = [],
  isLoading,
  error,
  refetch
} = useQuery({
  queryKey: ['sportsEntities', selectedEntityType, sortField, sortDirection, activeFilters],
  queryFn: async () => {
    try {
      // Try to use backend filtering first
      const result = await SportsDatabaseService.getEntities({
        entityType: selectedEntityType,
        filters: activeFilters,
        sortBy: sortField,
        sortDirection: sortDirection
      });
      
      return result || [];
    } catch (error) {
      console.error('Error fetching entities with backend filtering:', error);
      
      // Fallback: fetch without filters and filter client-side
      const allEntities = await SportsDatabaseService.getEntities({
        entityType: selectedEntityType,
        filters: [],
        sortBy: sortField,
        sortDirection: sortDirection
      });
      
      return allEntities || [];
    }
  }
});
```

The client-side filtering fallback is implemented in the `getSortedEntities` function:

```typescript
const getSortedEntities = () => {
  if (!entities || entities.length === 0) return [];
  
  // Determine if we need client-side filtering
  const needsClientSideFiltering = activeFilters && 
                                  activeFilters.length > 0 && 
                                  entities.length > 0 &&
                                  !entities.some(entity => {
                                    // Check if any entity matches all filters
                                    // If none match, we need client-side filtering
                                    // ...
                                  });
  
  if (needsClientSideFiltering) {
    console.log('Applying client-side filtering as fallback');
    
    // Apply each filter
    const filteredEntities = entities.filter(entity => {
      // Entity must match all filters (AND logic)
      return activeFilters.every(filter => {
        const { field, operator, value } = filter;
        const entityValue = entity[field];
        
        // Apply the operator
        switch (operator) {
          case 'eq':
            return entityValue === value;
          case 'neq':
            return entityValue !== value;
          case 'gt':
            return entityValue > value;
          case 'lt':
            return entityValue < value;
          case 'contains':
            return String(entityValue).toLowerCase().includes(String(value).toLowerCase());
          case 'startswith':
            return String(entityValue).toLowerCase().startsWith(String(value).toLowerCase());
          case 'endswith':
            return String(entityValue).toLowerCase().endsWith(String(value).toLowerCase());
          default:
            return false;
        }
      });
    });
    
    return filteredEntities;
  }
  
  // Return the entities directly since they're already filtered by the backend
  return entities;
};
```

This hybrid approach provides the best of both worlds: the efficiency of backend filtering when it works correctly, and the reliability of client-side filtering as a fallback when needed.

### SportsDatabase Component Architecture

The SportsDatabase component has been refactored into a modular architecture that improves maintainability, testability, and developer experience. The component allows users to manage sports database entities with the following features:

#### Modular Architecture

The SportsDatabase component has been broken down into smaller, focused components:

1. **SportsDatabase (Container Component)**
   - Main container that manages composition and routing
   - Provides the context provider for shared state

2. **SportsDatabaseContext**
   - Manages shared state across all child components
   - Provides a custom hook (useSportsDatabase) for accessing state
   - Handles data fetching, entity selection, sorting, and filtering

3. **EntityTypeSelector**
   - Displays entity type options with descriptions
   - Handles entity type selection

4. **ViewModeSelector**
   - Provides buttons for switching between entity, global, and fields views
   - Manages view mode state

5. **EntityList**
   - Displays the list of entities for the selected type
   - Handles entity selection and basic actions
   - Provides sorting and filtering capabilities

6. **EntityActions**
   - Contains export and other action buttons
   - Manages action-specific states (isExporting)

7. **EntityFilter**
   - Handles filter creation and management
   - Provides UI for building complex filters

8. **EntityFieldsView**
   - Displays available fields for the selected entity type
   - Shows field types, requirements, and descriptions

9. **GlobalEntityView**
   - Provides an overview of all entity types
   - Shows counts and recent updates

#### State Management

The component uses React Context API for state management:

- **SportsDatabaseContext**: Provides shared state and methods to all child components
- **useSportsDatabase Hook**: Custom hook for accessing context values
- **Local Component State**: For component-specific UI state

#### Key Features

- **Entity Type Selection**: Select from various entity types (leagues, teams, players, etc.)
- **Entity Listing**: View entities with sorting and filtering
- **Entity Actions**: Export entities to Google Sheets
- **Entity Fields View**: View available fields for each entity type
- **Global View**: Overview of all entity types
- **Advanced Filtering**: Filter entities based on various criteria

#### Benefits of Refactoring

1. **Improved Maintainability**: Smaller files are easier to understand and modify
2. **Better Testability**: Components can be tested in isolation
3. **Enhanced Performance**: Smaller components reduce unnecessary re-renders
4. **Code Reusability**: Components can be reused across the application
5. **Clearer Responsibilities**: Each component has a single responsibility
6. **Type Safety**: Comprehensive TypeScript interfaces and type checking

This modular architecture provides a solid foundation for future enhancements and makes the codebase more maintainable and easier to understand for new developers.

## Data Persistence and Extraction

### Database Persistence Configuration

The application uses PostgreSQL for data storage, with a specific configuration to ensure data persistence across container restarts:

```yaml
# Docker Compose configuration for database persistence
db:
  image: postgres:15
  ports:
    - "5432:5432"
  environment:
    - POSTGRES_USER=postgres
    - POSTGRES_PASSWORD=postgres
    - POSTGRES_DB=sheetgpt
  volumes:
    - postgres-data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 5s
    timeout: 5s
    retries: 5

volumes:
  postgres-data:
    # Using a named volume for better persistence
    # This ensures data is preserved across container restarts and rebuilds
```

This configuration ensures that:
1. All database data is stored in a dedicated named volume (`postgres-data`)
2. The volume persists even when containers are stopped or removed
3. Database health is monitored with regular checks

### Data Extraction and Mapping

The application includes a robust system for extracting structured data from messages and mapping it to sports database entities:

#### DataExtractionService

The `DataExtractionService` is responsible for extracting structured data from message content:

```typescript
static extractStructuredData(messageContent: string): ExtractedData | null {
  try {
    console.log('DataExtractionService: Extracting data from message content');
    
    // First, look for markdown table format
    const extractedTable = this.extractTableFromMarkdown(messageContent);
    if (extractedTable) {
      return extractedTable;
    }
    
    // Then, look for JSON-like structures
    const extractedJson = this.extractJsonStructures(messageContent);
    if (extractedJson) {
      return extractedJson;
    }
    
    // If we get here, we couldn't extract structured data
    console.log('DataExtractionService: No structured data found in message');
    return null;
  } catch (e) {
    console.error('DataExtractionService: Error extracting structured data:', e);
    return null;
  }
}
```

The service includes specialized methods for different data formats:
- `extractTableFromMarkdown`: Parses markdown tables into structured data
- `extractJsonStructures`: Identifies and parses JSON structures with special handling for sports data

#### Data Management Hook

The `useDataManagement` hook provides robust data handling for the SportDataMapper component:

```typescript
const extractSourceFields = useCallback((data: any, setDataValidity: (isValid: boolean) => void) => {
  console.log('useDataManagement: Extracting source fields from data:', data);
  
  // Check if data exists
  if (!data) {
    console.error('useDataManagement: Data is null or undefined');
    setDataValidity(false);
    return;
  }
  
  // Handle array data
  let processedData = data;
  
  // If data is not an array but has a 'rows' property that is an array, use that
  if (!Array.isArray(data) && data.rows && Array.isArray(data.rows)) {
    console.log('useDataManagement: Using data.rows as the data source');
    processedData = data.rows;
  } 
  // If data is not an array and doesn't have rows, try to convert it to an array
  else if (!Array.isArray(data)) {
    console.log('useDataManagement: Converting non-array data to array');
    try {
      // If it's an object, convert it to an array with one item
      if (typeof data === 'object' && data !== null) {
        processedData = [data];
      } else {
        // If it's something else, wrap it in an array
        processedData = [{ value: data }];
      }
    } catch (error) {
      console.error('useDataManagement: Error converting data to array:', error);
      setDataValidity(false);
      return;
    }
  }
  
  // Final validation check
  if (!Array.isArray(processedData) || processedData.length === 0) {
    console.error('useDataManagement: Processed data is not a valid array or is empty:', processedData);
    setDataValidity(false);
    return;
  }
  
  // Get the first record to extract fields
  const firstRecord = processedData[0];
  
  // Ensure the first record is an object
  if (typeof firstRecord !== 'object' || firstRecord === null) {
    console.error('useDataManagement: First record is not an object:', firstRecord);
    setDataValidity(false);
    return;
  }
  
  setDataValidity(true);
  setDataToImport(processedData);
  
  // Get all unique field names from the first record
  const fields = Object.keys(firstRecord);
  setSourceFields(fields);
  
  // Set the source field values from the first record
  setSourceFieldValues(firstRecord);
  
  console.log('useDataManagement: Extracted source fields:', fields);
  console.log('useDataManagement: First record:', firstRecord);
}, []);
```

This implementation provides:
1. Comprehensive error handling and validation
2. Support for various data formats (arrays, objects, nested structures)
3. Detailed logging for debugging
4. Robust data transformation to ensure compatibility with the mapping interface
