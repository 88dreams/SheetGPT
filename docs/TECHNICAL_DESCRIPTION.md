# Technical Description

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

### Component Structure

1. **Layout Components**
   - AppLayout
   - Navbar
   - Sidebar
   - Footer

2. **Authentication Components**
   - LoginForm
   - RegisterForm
   - PasswordReset

3. **Chat Components**
   - ChatInterface
   - MessageList
   - MessageInput
   - ConversationList

4. **Data Management Components**
   - DataTable
   - ColumnManager
   - DataToolbar
   - ExportDialog
   - ChangeHistory

### State Management

1. **Authentication State**
   - User information
   - Token management
   - Login status

2. **Chat State**
   - Active conversation
   - Message history
   - Real-time updates

3. **Data Management State**
   - Structured data
   - Column configurations
   - Change history
   - Export status

### API Integration

1. **Authentication API**
   - Login/Logout
   - Token refresh
   - Password management

2. **Chat API**
   - Conversation management
   - Message handling
   - WebSocket connection

3. **Data Management API**
   - Data operations
   - Column management
   - Export functionality

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
- **LoadingSpinner**
  - Reusable loading indicator
  - Configurable sizes (small, medium, large)
  - Consistent styling with Tailwind CSS
  - Used across all async operations

- **Notification**
  - Toast notification system
  - Supports success, error, and info types
  - Auto-dismissal with configurable duration
  - Consistent styling across the application

#### Context Providers
- **NotificationContext**
  - Global notification management
  - Provides showNotification method
  - Handles notification lifecycle
  - Ensures consistent notification display

#### Authentication Components
- **Login**
  - Form validation
  - Loading states during submission
  - Error handling with notifications
  - Disabled controls during processing

- **Register**
  - Extended form validation
  - Password confirmation
  - Loading states and error handling
  - User feedback during registration

#### Chat Interface
- **ConversationList**
  - Displays all user conversations
  - Handles conversation selection
  - Loading states for data fetching
  - New conversation creation

- **MessageThread**
  - Displays conversation messages
  - Handles different message types
  - Loading states for message fetching
  - Auto-scrolling to latest messages

- **ChatInput**
  - Message composition
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