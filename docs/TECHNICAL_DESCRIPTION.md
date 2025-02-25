# Technical Description

## Frontend Architecture

### 1. Authentication System
- **Location**: `frontend/src/hooks/useAuth.ts`
- **Purpose**: Manages user authentication state and operations
- **Key Features**:
  - JWT token management
  - Authentication state tracking
  - Throttled auth checks
  - Automatic cleanup
- **Implementation Details**:
  - Uses React hooks for state management
  - Implements mount-aware state updates
  - Handles token storage in localStorage
  - Provides login, logout, and registration functions

### 2. Chat Interface
- **Location**: `frontend/src/pages/Chat.tsx`
- **Purpose**: Main chat interface with conversation management
- **Components**:
  - ConversationList: Displays and manages conversations
  - MessageThread: Renders message history with "Send to Data" button
    - Enhanced data extraction with robust error handling
    - Processing state tracking to prevent duplicate operations
    - Automatic cleanup of duplicate data entries
    - Verification steps to ensure data creation success
    - Visual feedback during data processing
  - ChatInput: Handles message input with format selection
- **Features**:
  - Real-time message updates
  - Structured data extraction
  - Loading states and error handling
  - Conversation management

### 3. Data Interface
- **Location**: `frontend/src/pages/DataManagement.tsx`
- **Purpose**: Structured data viewing and manipulation
- **Components**:
  - DataTable: Displays structured data in grid format
    - Row-based data structure
    - Toggle controls for headers and row numbers
    - Vertical layout with Data Grid above Chat Data
    - Enhanced data transformation for various formats
  - DataToolbar: Provides data management tools
    - Export options
    - Simplified interface with focused functionality
  - Conversation Data List: Displays available data sets
    - Per-row delete functionality with trash icons
    - Clear visual indication of selected data
- **Layout**:
  - Sidebar: Lists available data sets with delete options
  - Main content: Shows Data Tools, Data Grid, and Chat Data
  - Data Grid: Displays structured data in tabular format
  - Chat Data: Shows raw JSON data for reference
- **Features**:
  - Improved data transformation handling
  - Enhanced UI with clearer section separation
  - Better visual hierarchy with important content on top
  - Streamlined tools and controls

### 4. Data Extraction Service
- **Location**: `frontend/src/services/DataExtractionService.ts`
- **Purpose**: Handles extraction and transformation of structured data from chat messages
- **Key Functions**:
  - `extractStructuredData`: Extracts JSON structures from message content
  - `appendRows`: Adds new rows to existing structured data with metadata
  - `transformToRowFormat`: Converts various data formats to standardized row objects
- **Supported Data Formats**:
  - Row-oriented with headers and rows arrays
  - Column-oriented (Google Sheets format)
  - Flat objects array
  - Special Table Data format
- **Implementation Details**:
  - Uses regex to find JSON structures in message content
  - Handles multiple data transformation scenarios
  - Preserves metadata across transformations
  - Ensures consistent row structure for display
  - Manages conversation title and other metadata

### 5. API Client
- **Location**: `frontend/src/utils/api.ts`
- **Purpose**: Centralized API communication
- **Features**:
  - Type-safe API calls
  - Authentication header management
  - Error handling
  - Request/response logging
- **Endpoints**:
  - Authentication
  - Chat operations
  - Data management
    - Row operations
    - Column operations
    - Cell updates
  - Export functionality

## Backend Architecture

### 1. API Routes
- **Location**: `src/api/routes/`
- **Purpose**: API endpoint definitions
- **Key Routes**:
  - `auth.py`: Authentication endpoints
  - `chat.py`: Chat and conversation management
  - `data_management.py`: Structured data operations
    - Row management endpoints
    - Column configuration
    - Cell updates
    - Change tracking
- **Features**:
  - Route registration
  - Request validation
  - Response handling
  - Error management

### 2. Services
- **Location**: `src/services/`
- **Purpose**: Business logic implementation
- **Key Services**:
  - `chat.py`: Chat and GPT integration
  - `data_management.py`: Data operations
    - Row-based data structure
    - Data transformation
    - Change tracking
    - Validation
  - `auth.py`: Authentication logic
- **Features**:
  - Database operations
  - External API integration
  - Data processing
  - Error handling

### 3. Database Models
- **Location**: `src/models/`
- **Purpose**: Database schema definitions
- **Key Models**:
  - User
  - Conversation
  - Message
  - StructuredData
    - Row-based data structure
    - Column configuration
  - DataColumn
  - DataChangeHistory
- **Features**:
  - SQLAlchemy models
  - Relationship definitions
  - Type definitions
  - Validation rules

### 4. Schemas
- **Location**: `src/schemas/`
- **Purpose**: Data validation and serialization
- **Key Schemas**:
  - Authentication schemas
  - Chat schemas
  - Data management schemas
    - Row operations
    - Column updates
    - Cell modifications
- **Features**:
  - Pydantic models
  - Request/response validation
  - Type safety
  - Documentation

## Data Flow

### 1. Authentication Flow
```
1. User submits credentials
2. Backend validates and generates JWT
3. Frontend stores token
4. Token used for subsequent requests
5. Regular token validation checks
```

### 2. Chat Flow
```
1. User sends message
2. Message stored in database
3. GPT processes message
4. Structured data extracted
5. Response streamed to client
```

### 3. "Send to Data" Flow
```
1. User clicks "Send to Data" button
   - Button disabled and shows "Processing..." state
   - Message ID tracked in processing state

2. Check for existing data
   - Query all structured data to find matches by message ID
   - If multiple entries found, keep most recent and delete others
   - If found, navigate to existing data

3. Extract and parse data
   - Split message content at "---DATA---" marker
   - Parse JSON data
   - Transform to standardized format with headers and rows

4. Final verification before creation
   - One last check for existing data to prevent race conditions
   - If found, navigate to existing data

5. Create structured data
   - Send data to backend with proper metadata
   - If API call fails, verify if data was actually created
   - If created despite error, use the created data

6. Navigate to data view
   - Wait for backend processing to complete
   - Invalidate queries to refresh data
   - Navigate to data management page
   - Button restored to original state
```

### 4. Data Management Flow
```
1. User requests data
2. Backend retrieves and transforms to row format
3. Frontend displays in grid layout
4. User can:
   - Drag and drop to reorder
   - Edit cells inline
   - Add/delete rows
   - Configure columns
5. Changes tracked in history
```

### 5. Data Verification Flow
```
1. User navigates to data page with message ID
2. Initial check for data by message ID
3. If not found immediately:
   - Start verification process with visual feedback
   - Check all structured data for matching message ID
   - Try direct API call as fallback
   - Implement retry with increasing backoff (up to 5 attempts)
   - Show verification status to user
4. Once data is found or max attempts reached:
   - Display data if found
   - Show error if verification fails
```

### 6. Row Operations Flow
```
1. Add Row:
   - User clicks "Add Row"
   - Empty row created with column defaults
   - Row added to database
   - UI updates with new row

2. Delete Row:
   - User clicks delete button
   - Row removed from database
   - UI updates to reflect change
   - Change recorded in history

3. Update Row:
   - User edits cell value
   - Update sent to backend
   - Database updated
   - UI refreshes with new value
   - Change tracked in history
```

## Technical Considerations

### 1. Performance
- Async operations for database access
- Connection pooling
- Query optimization
- Frontend state management
- Caching strategies
- Efficient data transformation

### 2. Security
- JWT authentication
- Input validation
- SQL injection prevention
- XSS protection
- CORS configuration
- Data validation

### 3. Error Handling
- Global error boundaries
- API error handling
- User feedback
- Logging and monitoring
- Recovery strategies
- Data validation errors
- Verification steps for critical operations
- Automatic retry mechanisms with backoff
- State restoration after errors

### 4. State Management
- React Query for server state
- Local state with hooks
- Mount-aware updates
- Cleanup on unmount
- Error recovery
- Processing state tracking
- Operation locking to prevent duplicates
- Comprehensive button state management

## Development Workflow

### 1. Local Development
- Docker Compose setup
- Hot reloading
- TypeScript compilation
- ESLint configuration
- Development tools
- Component testing

### 2. Testing
- Unit tests
- Integration tests
- End-to-end tests
- Test coverage
- CI/CD pipeline
- Component testing

### 3. Deployment
- Production build process
- Environment configuration
- Database migrations
- Monitoring setup
- Backup strategies
- Performance monitoring

## Future Considerations

### 1. Scalability
- Horizontal scaling
- Load balancing
- Database sharding
- Caching distribution
- Performance optimization
- Bulk operations

### 2. Features
- Real-time updates
- Advanced data visualization
- Bulk operations
- Export functionality
- Template system
- Advanced filtering

### 3. Maintenance
- Code documentation
- Performance monitoring
- Security updates
- Database maintenance
- Backup procedures
- Feature testing

## Backend Architecture

### Core Components

1. **FastAPI Application**
   - Main application entry point
   - Route registration and middleware configuration
   - Dependency injection setup
   - CORS and security settings

2. **Database Layer**
   - PostgreSQL database
   - SQLAlchemy ORM for database operations
   - Alembic for database migrations
   - Connection pooling and transaction management

3. **Authentication System**
   - JWT-based authentication
   - Password hashing with bcrypt
   - Token refresh mechanism
   - Session management

4. **WebSocket Handler**
   - Real-time chat functionality
   - Connection management
   - Message broadcasting
   - Client state tracking

5. **Data Management System**
   - Structured data extraction
   - Column configuration
   - Change history tracking
   - Export functionality
   - Data validation and transformation

### Service Layer

1. **AuthService**
   - User authentication and authorization
   - Token generation and validation
   - Password management
   - Session handling

2. **UserService**
   - User profile management
   - User preferences
   - Account settings

3. **ChatService**
   - Conversation management
   - Message handling
   - Real-time updates
   - Chat history

4. **DataManagementService**
   - Structured data operations
   - Column management
   - Change tracking
   - Data validation
   - Export handling

### Database Models

1. **User Model**
```python
class User(Base):
    id: UUID
    email: str
    hashed_password: str
    full_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
```

2. **Conversation Model**
```python
class Conversation(Base):
    id: UUID
    title: str
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    is_archived: bool
```

3. **Message Model**
```python
class Message(Base):
    id: UUID
    conversation_id: UUID
    content: str
    role: str
    created_at: datetime
```

4. **StructuredData Model**
```python
class StructuredData(Base):
    id: UUID
    conversation_id: UUID
    user_id: UUID
    data_type: str
    schema_version: str
    data: Dict
    meta_data: Dict
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
```

5. **Column Model**
```python
class Column(Base):
    id: UUID
    structured_data_id: UUID
    name: str
    data_type: str
    format: str
    formula: str
    order: int
    is_active: bool
    meta_data: Dict
    created_at: datetime
    updated_at: datetime
```

6. **DataChangeHistory Model**
```python
class DataChangeHistory(Base):
    id: UUID
    structured_data_id: UUID
    user_id: UUID
    change_type: str
    change_data: Dict
    created_at: datetime
```

## Frontend Architecture

### 1. API Client
- **Centralized Request Handling**
  - Unified request function with type safety
  - Automatic token management
  - Consistent error handling
  - Environment-aware configuration

- **Authentication Flow**
  - JWT-based authentication
  - Token storage in localStorage
  - Automatic token inclusion in requests
  - Protected route handling

- **Type Safety**
  - Strong TypeScript integration
  - API response type definitions
  - Environment variable typing
  - Runtime type checking

### 2. Component Structure
- **Layout Components**
  - Main layout with navigation
  - Protected route wrapper
  - Responsive design patterns

- **Feature Components**
  - Chat interface with real-time updates
  - Data management interface
  - Modal components for actions
  - Loading and error states

- **State Management**
  - React Query for server state
  - Context for global state
  - Local state for UI components

### 3. Error Handling
- **Client-Side Validation**
  - Form input validation
  - Data type checking
  - Environment variable validation

- **API Error Handling**
  - Consistent error format
  - User-friendly error messages
  - Error boundary implementation
  - Retry mechanisms (planned)

## Security Implementation

1. **Authentication**
   - JWT token validation
   - Password hashing
   - Session management

2. **Authorization**
   - Role-based access
   - Resource ownership
   - Permission checks

3. **Data Protection**
   - Input validation
   - SQL injection prevention
   - XSS protection

## Error Handling

1. **Frontend Error Handling**
   - API error handling
   - Form validation
   - Error boundaries
   - User notifications

2. **Backend Error Handling**
   - Exception middleware
   - Validation errors
   - Database errors
   - Custom error types

## Testing Strategy

1. **Unit Tests**
   - Service layer tests
   - Model tests
   - Utility function tests

2. **Integration Tests**
   - API endpoint tests
   - Database integration tests
   - Authentication flow tests

3. **Frontend Tests**
   - Component tests
   - State management tests
   - API integration tests

## Deployment Configuration

1. **Environment Setup**
   - Development
   - Staging
   - Production

2. **Database Configuration**
   - Connection settings
   - Migration scripts
   - Backup strategy

3. **Security Settings**
   - CORS configuration
   - Rate limiting
   - SSL/TLS setup

## Code Organization

### 1. Frontend Layer
```
src/
└── frontend/
    ├── components/     # React components
    │   ├── common/     # Shared components
    │   │   ├── LoadingSpinner.tsx  # Loading indicator
    │   │   └── Notification.tsx    # Toast notifications
    │   ├── Layout/    # Layout components
    │   │   └── Layout.tsx         # Main layout wrapper
    │   └── chat/      # Chat interface components
    │       ├── ConversationList.tsx  # Conversation management
    │       ├── MessageThread.tsx     # Message display
    │       ├── ChatInput.tsx         # Message input
    │       └── NewConversationModal.tsx # New chat modal
    ├── contexts/      # React contexts
    │   └── NotificationContext.tsx  # Global notification management
    ├── hooks/         # Custom React hooks
    │   └── useAuth.ts # Authentication state
    ├── pages/         # Page components
    │   ├── Chat.tsx   # Main chat interface
    │   ├── Login.tsx  # Authentication
    │   └── Register.tsx
    └── styles/        # CSS and styling
```

### 2. Component Architecture

#### Common Components
- **LoadingSpinner**: A reusable loading spinner component that supports different sizes (small, medium, large) and custom styling through className props. Used across the application to indicate loading states.

#### Context Providers
- **NotificationContext**: Global notification management
  - Provides showNotification method
  - Handles notification lifecycle
  - Ensures consistent notification display

#### Authentication Components
- **Login**: Form validation
  - Loading states during submission
  - Error handling with notifications
  - Disabled controls during processing

- **Register**: Extended form validation
  - Password confirmation
  - Loading states and error handling
  - User feedback during registration

#### Chat Interface
- **ConversationList**: Displays all user conversations
  - Handles conversation selection
  - Loading states for data fetching
  - New conversation creation

- **MessageThread**: Displays conversation messages
  - Handles different message types
  - Loading states for message fetching
  - Auto-scrolling to latest messages

- **ChatInput**: Message composition
  - Send message handling
  - Loading states during sending
  - Error handling with notifications

### 3. State Management
- React Query for server state
- Context for global state
- Local state for component-specific data
- Loading states for async operations

### 4. Error Handling
- Global notification system
- Consistent error messages
- Error recovery flows
- User-friendly error display

### 5. Loading States
- Global loading indicators
- Component-specific loading states
- Disabled controls during loading
- Loading spinners for async operations

### 6. Styling
- Tailwind CSS for utility-first styling
- Consistent color scheme
- Responsive design
- Accessible components

### 7. Authentication Flow
- Protected routes
- Token-based authentication
- Loading states during auth checks
- Error handling for auth failures

### 8. Data Flow
1. User Action
   - Trigger loading state
   - Disable relevant controls
   - Show loading indicator

2. API Request
   - Send request with proper headers
   - Handle response or error
   - Update loading state

3. State Update
   - Update local/global state
   - Show success/error notification
   - Re-enable controls

4. UI Update
   - Reflect new state in UI
   - Clear loading indicators
   - Update related components

### 2. Backend API Layer
```
src/
└── api/
    ├── routes/        # API endpoints
    │   ├── api.py    # Main router configuration
    │   ├── auth.py   # Authentication endpoints
    │   └── chat.py   # ChatGPT conversation endpoints
    ├── middleware/    # Request processing
    ├── validators/    # Input validation
    └── responses/     # Response formatting
```

- **FastAPI Routes**: RESTful endpoints for chat, data management, and exports
- **Authentication Routes**:
  - POST /api/v1/auth/register - User registration
  - POST /api/v1/auth/login - User authentication
  - GET /api/v1/auth/me - Current user info
- **Chat Routes**:
  - POST /api/v1/chat/conversations - Create conversation
  - GET /api/v1/chat/conversations - List conversations
  - GET /api/v1/chat/conversations/{id} - Get conversation
  - PATCH /api/v1/chat/conversations/{id} - Update conversation
  - POST /api/v1/chat/conversations/{id}/messages - Send/receive messages
- **WebSocket Support**: Real-time chat communication (planned)
- **Rate Limiting**: Request throttling for API stability (planned)

### 3. Services Layer
```
src/
└── services/
    ├── user.py       # User authentication & management
    ├── chat.py       # ChatGPT integration
    ├── data/         # Data processing (planned)
    └── export/       # Export functionality
        └── sheets_service.py  # Google Sheets integration
```

- **User Service**: 
  - User registration and authentication
  - Password hashing with bcrypt
  - JWT token generation and validation
- **Chat Service**:
  - OpenAI API integration
  - Conversation management
  - Message history tracking
  - Structured data extraction
  - Context window management
- **Data Service**: Structures and processes chat responses (planned)
- **Export Service**: 
  - Google Sheets integration
  - OAuth2 authentication flow
  - Spreadsheet CRUD operations
  - Data conversion utilities
  - Token management

### 4. Data Models
```
src/
└── models/
    ├── base.py       # Base model with timestamps
    └── models.py     # Database models
```

- **Base Model**: 
  - Common fields: created_at, updated_at, deleted_at
  - Soft deletion support
- **Database Models**:
  - User: Authentication and profile data
  - Conversation: Chat session management
    - Title and description
    - User relationship
    - Messages collection
    - Structured data collection
  - Message: Individual chat messages
    - Role (user/assistant/system)
    - Content storage
    - Metadata support
  - StructuredData: Processed chat responses
    - Data type classification
    - Schema versioning
    - JSON data storage
    - Format metadata

### 5. Utilities
```
src/
└── utils/
    ├── config.py     # Environment configuration
    ├── database.py   # Database connection
    ├── security.py   # Authentication utilities
    └── helpers.py    # Common functions
```

- **Configuration**: Environment-based settings with pydantic
- **Database**: Async SQLAlchemy setup with connection pooling
- **Security**: JWT handling and password hashing
- **Helpers**: Shared utility functions

## Key Technical Decisions

1. **Database Implementation**:
   - PostgreSQL with async support
   - SQLAlchemy async ORM
   - Alembic migrations
   - JSON fields for flexible data

2. **Authentication Implementation**:
   - JWT-based authentication
   - Bcrypt password hashing
   - Async database operations
   - Protected route decorators

3. **ChatGPT Integration**:
   - OpenAI API async client
   - GPT-4 Turbo model
   - Context management (10 messages)
   - Structured data extraction
   - Custom response formatting

4. **Data Processing**:
   - Async processing for large datasets
   - Stream processing for real-time updates
   - Batch processing for exports
   - Schema versioning for flexibility

5. **Google Sheets Integration**:
   - Web application OAuth2 flow
   - Token-based authentication
   - Async operations
   - Error handling and recovery
   - Template-based formatting (planned)

6. **Testing Strategy**:
   - Unit tests with pytest
   - Integration tests with TestClient
   - E2E tests with Playwright
   - Mock OpenAI responses

## Performance Considerations

1. **Database Optimization**:
   - Connection pooling implemented
   - Async operations for better concurrency
   - Indexed fields for common queries
   - Soft deletion for data retention

2. **API Performance**:
   - Async request handling
   - Response pagination
   - Rate limiting (planned)
   - Caching strategy (planned)

3. **ChatGPT Integration**:
   - Efficient context window
   - Response streaming support
   - Error handling and retries
   - Rate limit management

4. **Security Measures**:
   - Secure password hashing
   - JWT token expiration
   - Environment-based secrets
   - CORS configuration

## Monitoring and Observability

1. **Logging**:
   - Structured JSON logging
   - Debug level configuration
   - Operation tracking
   - Error handling

2. **Error Handling**:
   - Global exception handlers
   - Detailed error responses
   - Database transaction management
   - OpenAI error handling

3. **Development Tools**:
   - Black for code formatting
   - Flake8 for linting
   - MyPy for type checking
   - Alembic for migrations

## Authentication System

### Database Schema
The user authentication system is built on a PostgreSQL database with the following key models:

```sql
-- User Model
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

### Authentication Flow
1. **Registration**
   - User submits email and password
   - Password is hashed using bcrypt
   - User record is created in database
   - JWT token is generated and returned

2. **Login**
   - User provides email and password
   - Password is verified against hashed value
   - JWT token is generated with user ID
   - Token is returned to client

3. **Token Management**
   - Tokens include user ID and expiration
   - Frontend stores token in memory
   - Token is included in Authorization header
   - Protected routes verify token validity

### Security Measures
- Passwords are hashed using bcrypt
- JWT tokens are signed with a secret key
- Email addresses must be unique
- Automatic token expiration
- Protected routes require valid token

## Frontend Components

### Common Components
- `LoadingSpinner`: A reusable loading spinner component that supports different sizes (small, medium, large) and custom styling through className props. Used across the application to indicate loading states.

### Chat Components
- `NewConversationModal`: A modal component for creating new conversations. Features include:
  - Title and optional description input fields
  - Loading state handling during conversation creation
  - Form validation
  - Error handling through notification system
  - Disabled controls during submission
  - Visual feedback during loading

### API Integration
The frontend communicates with the backend through a centralized API client (`api.ts`) that:
- Manages authentication tokens
- Handles API requests with proper headers
- Provides type-safe interfaces for API responses
- Implements chat-related endpoints (createConversation, getConversations, sendMessage) 

### TypeScript Configuration

1. **Environment Variables**
   - Type definitions for Vite environment variables
   - Consistent type declarations across the application
   - Runtime type safety for configuration values
   - Development and production environment handling

2. **Type Safety**
   - Strict type checking enabled
   - Comprehensive interface definitions
   - Proper type exports and imports
   - Environment-aware type declarations

3. **Module System**
   - ES Modules for all TypeScript files
   - Proper module augmentation
   - Type declaration files (.d.ts)
   - Module resolution configuration 

## Authentication Implementation

### useAuth Hook Implementation
The authentication system is built around a custom React hook that manages all aspects of user authentication. Here's a detailed breakdown of its implementation:

```typescript
// Core state management
const [authState, setAuthState] = useState<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isReady: false
})

// Performance optimization refs
const authCheckInProgress = React.useRef(false)
const initialAuthCheckDone = React.useRef(false)
const isMounted = React.useRef(true)
const lastAuthCheck = React.useRef<number>(0)
const AUTH_CHECK_THROTTLE = 5000
```

### Key Functions

1. Login Process
```typescript
const login = async (email: string, password: string) => {
  // Set loading state
  setAuthState(prev => ({ ...prev, isLoading: true }))
  
  try {
    // Get token from login endpoint
    const response = await api.auth.login({ email, password })
    localStorage.setItem('auth_token', response.access_token)
    
    // Fetch user data immediately
    const user = await api.auth.me()
    
    // Update auth state directly
    setAuthState({
      user,
      isAuthenticated: true,
      isLoading: false,
      isReady: true
    })
    lastAuthCheck.current = Date.now()
    
    return true
  } catch (error) {
    // Handle errors and cleanup
    localStorage.removeItem('auth_token')
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isReady: true
    })
    return false
  }
}
```

2. Auth Check Process
```typescript
const checkAuthStatus = async (force: boolean = false) => {
  // Prevent duplicate checks
  if (authCheckInProgress.current) return
  
  // Apply throttling
  const now = Date.now()
  if (!force && now - lastAuthCheck.current < AUTH_CHECK_THROTTLE) return
  
  // Perform check and update state
  authCheckInProgress.current = true
  try {
    const user = await api.auth.me()
    setAuthState({
      user,
      isAuthenticated: true,
      isLoading: false,
      isReady: true
    })
    lastAuthCheck.current = now
  } catch (error) {
    // Handle 401 errors
    if (error.message.includes('401')) {
      localStorage.removeItem('auth_token')
    }
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isReady: true
    })
  } finally {
    authCheckInProgress.current = false
  }
}
```

### Recent Improvements

1. Race Condition Fix
   - Removed dependency on async state updates
   - Direct user data fetch after login
   - Immediate state updates

2. Performance Optimization
   - Added throttling for auth checks
   - Implemented check caching
   - Prevented duplicate checks

3. Component Lifecycle
   - Added mount tracking
   - Proper cleanup on unmount
   - Prevention of state updates after unmount

4. Error Handling
   - Specific handling for 401 errors
   - Automatic token cleanup
   - Comprehensive error logging 