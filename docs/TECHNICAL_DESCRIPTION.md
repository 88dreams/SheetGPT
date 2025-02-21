# Technical Description

## Code Organization

### 1. Frontend Layer
```
src/
└── frontend/
    ├── components/     # React components
    ├── hooks/         # Custom React hooks
    ├── styles/        # CSS and styling
    └── utils/         # Frontend utilities
```

- **Components**: Modular React components for the chat interface, data display, and export controls
- **State Management**: React Context for local state, Redux for complex state management
- **Styling**: Tailwind CSS for responsive design and consistent UI

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