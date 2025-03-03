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
4. **Sports Models**: Sports database schema (League, Team, Player, Game, Stadium, etc.)

All models use UUID primary keys and define relationships using SQLAlchemy's relationship mechanism.

### Database Transaction Management

Two complementary methods for database access:
- **FastAPI Dependency Injection** (`get_db`): For most API endpoints
- **Context Manager** (`get_db_session`): For operations requiring granular transaction control

### Authentication System

JWT-based authentication system:
- Login process validates credentials and returns a JWT token
- Token contains user ID and expiration time
- Frontend stores token in localStorage and includes it in Authorization header
- Backend validates token using `get_current_user_id` dependency

### API Routes

Organized by domain:
- **Authentication**: User registration, login, token management
- **Chat**: Conversation and message management
- **Data Management**: Structured data operations
- **Sports Database**: Sports entity management
- **Export**: Data export operations
- **Admin**: Administrative operations (restricted to admin users)

## Frontend Architecture

### React Application Structure

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

- Uses environment variable `VITE_API_URL` with fallback to `http://localhost:8000`
- Axios-based API client with automatic token inclusion and error handling

### Key Components

#### Layout and Navigation
- **Layout**: Main layout wrapper with Navbar and PageContainer
- **PageHeader**: Standardized header with title, description, and actions

#### Chat Components
- **MessageThread**: Displays chat messages with "Send to Data" functionality
- **ChatInput**: Allows users to send messages
- **DataPreviewModal**: Previews extracted data before sending to Data Management

#### Data Components
- **DataTable**: Displays structured data with pagination, sorting, and editing
- **DataManagement**: Main page for managing structured data
- **Export**: Handles exporting data to various formats

#### Sports Database Components
- **SportsDatabase**: Main page for managing sports entities
- **SportDataMapper**: Maps structured data to sports database entities

## Data Flow Architecture

### Chat to Data Flow
1. User sends message to AI
2. AI responds with structured data
3. User clicks "Send to Data" button
4. System extracts and transforms data
5. Data is stored in the database
6. User is navigated to the data management page

### Chat to Sports Database Flow
1. User sends message to AI
2. AI responds with structured sports data
3. User clicks "Map to Sports Database" button
4. SportDataMapper opens with extracted data
5. System suggests field mappings
6. User adjusts mappings and initiates batch import
7. System shows real-time progress during import

### Data Transformation

Supports various data formats through a universal transformation approach:
- Row-oriented format (headers array and rows array)
- Column-oriented format (column objects with headers and values)
- Flat objects (array of objects with consistent keys)
- Special table formats for specific data

## Entity Resolution and Field Mapping

### Automatic Entity Resolution

The batch import process handles entity relationships automatically:
- Entity lookup by name
- Automatic creation of missing entities
- Enhanced field mapping with name-to-UUID conversion
- UUID validation with fallback mechanisms

### Field Mapping and Validation

- Field name prefixing for uniqueness
- UI to database field mapping conversion
- Automatic field mapping suggestions
- Required field validation
- Type validation
- Relationship validation

## Key Components in Detail

### SportDataMapper Component

A modular component for mapping structured data to sports database entities:

1. **Architecture**:
   - **Main Components**: SportDataMapperContainer (core functionality)
   - **UI Components**: FieldItem, FieldMappingArea, DroppableField
   - **Custom Hooks**: useFieldMapping, useRecordNavigation, useImportProcess, useUiState, useDataManagement

2. **Key Features**:
   - Automatic entity type detection
   - Drag-and-drop field mapping
   - Field validation
   - Batch import with progress tracking
   - Guided walkthrough for first-time users

3. **Data Flow**:
   - Extract source fields and values
   - Recommend entity type based on field analysis
   - Map source fields to entity fields
   - Navigate through records and exclude unwanted ones
   - Save mapped data to database (single record or batch)

### DataTable Component

A versatile grid for displaying structured data:

1. **Data Transformation**: Centralized transformer for various data formats
2. **Pagination**: Client-side and server-side pagination for large datasets
3. **Column Management**: Resizable, reorderable columns with visibility control
4. **Row Management**: Reorderable rows with optional numbering
5. **UI Flexibility**: Expandable/collapsible views and resizable panels

### SportsDatabase Component

A modular component for managing sports database entities:

1. **Architecture**:
   - **Container Component**: Main container with context provider
   - **Child Components**: EntityTypeSelector, ViewModeSelector, EntityList, EntityFilter, EntityFieldsView
   - **Context**: SportsDatabaseContext with useSportsDatabase hook

2. **Key Features**:
   - Entity type selection
   - Entity listing with sorting and filtering
   - Entity actions (export, etc.)
   - Entity fields view
   - Global entity overview
   - Advanced filtering

3. **Advanced Filtering**:
   - UI for creating and managing filters
   - Backend integration with dynamic query building
   - Hybrid approach with client-side fallback
   - Filter persistence across navigation
   
   #### Hybrid Filtering Implementation
   
   The Sports Database implements a hybrid filtering approach to improve reliability and performance:
   
   **Backend Filtering Improvements**:
   - Enhanced error handling in backend filter processing
   - Detailed logging for diagnosing filter issues
   - Special handling for problematic filters (e.g., 'sport' field in leagues)
   - Fallback mechanisms for database query errors
   - Fixed parameter binding issues in SQL queries
   
   **Frontend Hybrid Approach**:
   - Tries backend filtering first with automatic fallback to client-side filtering
   - Intelligent detection to determine when client-side filtering should be applied
   - Comprehensive filter operators (equals, contains, startswith, etc.)
   - Efficient client-side filtering algorithms
   
   **Implementation Example**:
   
   Backend filtering in `sports_service.py`:
   ```python
   # Add WHERE clause for filters
   params = {}
   if filters and len(filters) > 0:
       print(f"DEBUG - Service: Processing {len(filters)} filters")
       
       # Log each filter for debugging
       for i, filter_config in enumerate(filters):
           print(f"DEBUG - Service: Filter {i}: {filter_config}")
       
       where_clauses = []
       for i, filter_config in enumerate(filters):
           field = filter_config.get('field')
           operator = filter_config.get('operator')
           value = filter_config.get('value')
           
           # Skip invalid filters
           if not all([field, operator, value is not None]):
               continue
           
           # Add the filter to the WHERE clause
           param_name = f"param_{i}"
           
           # For case-insensitive LIKE searches
           if operator == 'LIKE':
               where_clauses.append(f"LOWER({field}) {operator} LOWER(:{param_name})")
           else:
               where_clauses.append(f"{field} {operator} :{param_name}")
           
           params[param_name] = value
   ```
   
   Frontend hybrid approach in `SportsDatabaseContext.tsx`:
   ```typescript
   // Fetch entities based on selected type
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
   
   **UI Improvements**:
   - Added entity count display showing number of entities matching applied filters
   - Improved filter state management with proper deep copying
   - Enhanced user feedback when filters are active
   - Filter persistence using localStorage for better user experience
   
   **Testing**:
   - Navigate to the Sports Database page
   - Select an entity type (e.g., "league")
   - Apply filters using the filter panel
   - Verify that the correct entities are displayed
   - Check console logs to see whether backend or client-side filtering was used
   - Test special case handling with specific fields (e.g., "sport" field with value "Soccer")
   
   **Future Enhancements**:
   - Add more advanced filter operators (e.g., date range filtering)
   - Implement OR logic for filters in addition to the current AND logic
   - Add the ability to save and load filter presets
   - Enhance the UI with more visual feedback about active filters

## Data Persistence and Extraction

### Database Persistence

PostgreSQL with named volume for data persistence across container restarts:
```yaml
volumes:
  postgres-data:  # Named volume for better persistence
```

### Data Extraction

Robust system for extracting structured data from messages:
- Markdown table parsing
- JSON structure identification
- Special handling for sports data
- Comprehensive error handling and validation
- Support for various data formats

## Testing Infrastructure

Jest and React Testing Library with:
- Isolated component testing with mocked dependencies
- Rendering and interaction tests
- Custom render functions with necessary providers
- Hook testing using `renderHook`
- Enhanced mocks for Headless UI components

## Next Steps

1. **Google Sheets Integration**: Complete bidirectional data flow
2. **Performance Optimization**: Code splitting, caching, virtualized lists
3. **Advanced Data Visualization**: Interactive diagrams, statistical dashboards
4. **Mobile Responsiveness**: Enhanced UI for mobile devices
5. **User Permissions**: Role-based access control, team collaboration

## SportDB Page Components

### Entity Management
The SportDB page provides comprehensive entity management through several key components:

#### Entity List View
- Uses React context (`SportsDatabaseContext`) for state management
- Implements checkbox-based selection system
- Supports both individual and bulk operations
- Real-time updates through React Query

#### Bulk Operations
- Implemented in `SportsDatabaseService.ts`
- Uses Promise.all for parallel processing
- Returns detailed success/failure results
- Optimistic UI updates with error rollback

#### Field View System
The field view system is implemented through several layers:

1. **Field Definitions**
   - Centralized in `SportsDatabaseContext`
   - Uses TypeScript interfaces for type safety
   - Supports common and entity-specific fields
   - Each field includes:
     ```typescript
     interface FieldData {
       name: string;
       type: string;
       required: boolean;
       description: string;
     }
     ```

2. **Entity Type Handling**
   - Each entity type has its own field set
   - Fields are organized by:
     - Common fields (id, name, timestamps)
     - Entity-specific fields
     - Relationship fields

3. **Field Display**
   - Dynamic rendering based on entity type
   - Responsive grid layout
   - Field type-specific formatting
   - Required field indicators

### Data Flow
1. User selects entity type
2. Context loads entity-specific fields
3. Fields are rendered in grid view
4. Changes trigger context updates
5. UI reflects current state

### Error Handling
- Validation at service layer
- Error aggregation for bulk operations
- User-friendly error messages
- Detailed console logging for debugging
