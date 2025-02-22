# API Architecture

## Overview

The SheetGPT API is built using FastAPI, providing a modern, fast, and type-safe backend for the application. The architecture follows RESTful principles and implements a clean, modular design.

## Core Components

### 1. API Layer
- **FastAPI Application**
  - Route registration
  - Middleware configuration
  - OpenAPI documentation
  - CORS and security settings

- **Endpoint Structure**
  ```
  /api/v1/
  ├── auth/
  │   ├── register
  │   ├── login
  │   └── me
  ├── chat/
  │   ├── conversations
  │   └── messages
  ├── data/
  │   ├── by-message/{message_id}
  │   ├── columns
  │   └── history
  └── export/
      ├── sheets
      └── templates
  ```

### 2. Service Layer
- **Authentication Service**
  - User management
  - Token handling
  - Password hashing

- **Chat Service**
  - Conversation management
  - Message processing
  - GPT integration
  - Data extraction

- **Data Management Service**
  - Structured data operations
  - Column configuration
  - Change tracking
  - Data validation

- **Export Service**
  - Google Sheets integration
  - Template management
  - Export processing
  - Status tracking

### 3. Database Layer
- **Models**
  - User
  - Conversation
  - Message
  - StructuredData
  - DataColumn
  - DataChangeHistory

- **Database Operations**
  - Async SQLAlchemy
  - Transaction management
  - Connection pooling
  - Migration handling

## Design Principles

### 1. Modularity
- Separation of concerns
- Independent services
- Reusable components
- Clear dependencies

### 2. Type Safety
- Pydantic models
- Type hints
- Schema validation
- Error handling

### 3. Security
- JWT authentication
- Role-based access
- Input validation
- Rate limiting

### 4. Performance
- Async operations
- Connection pooling
- Query optimization
- Caching strategy

## Data Flow

### 1. Request Flow
```
Client Request
  → Authentication Middleware
  → Route Handler
  → Service Layer
  → Database Layer
  → Response Processing
  → Client Response
```

### 2. WebSocket Flow (Future)
```
Client Connection
  → Authentication
  → Channel Subscription
  → Message Processing
  → Broadcast/Direct Message
  → Client Update
```

## Integration Points

### 1. External Services
- OpenAI GPT API
- Google Sheets API
- Authentication providers
- Monitoring services

### 2. Internal Services
- Frontend application
- Background tasks
- Caching layer
- Logging system

## Error Handling

### 1. HTTP Errors
- Standard HTTP status codes
- Detailed error messages
- Error tracking
- Client-friendly responses

### 2. Validation Errors
- Request validation
- Data validation
- Business rule validation
- Response validation

## Security Measures

### 1. Authentication
- JWT tokens
- Token refresh
- Session management
- Access control

### 2. Data Protection
- Input sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

## Monitoring and Logging

### 1. Application Metrics
- Request tracking
- Performance metrics
- Error rates
- Resource usage

### 2. Logging
- Structured logging
- Error tracking
- Audit trails
- Performance monitoring

## Future Enhancements

### 1. Planned Features
- Real-time updates
- Advanced caching
- Rate limiting
- API versioning

### 2. Scalability
- Horizontal scaling
- Load balancing
- Database sharding
- Cache distribution

## Authentication System

### Overview
The authentication system uses a token-based approach with JWT (JSON Web Tokens). The system is designed to be secure, performant, and provide a smooth user experience.

### Components

1. Authentication Hook (`useAuth`)
   - Central management of authentication state
   - Handles login, logout, and registration
   - Manages token storage and validation
   - Implements throttling and caching for performance
   - Provides mount-aware state updates

2. Token Management
   - Storage: LocalStorage for persistence
   - Validation: Regular checks with throttling
   - Cleanup: Automatic removal on 401 errors
   - State: Tracked via React state and refs

3. API Client Integration
   - Automatic token injection in requests
   - Error handling for auth failures
   - Retry logic for failed requests
   - Comprehensive request logging

### State Management
```typescript
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isReady: boolean
}
```

### Performance Optimizations
1. Auth Check Throttling
   - Minimum 5-second interval between checks
   - Caching of successful checks
   - Prevention of simultaneous checks

2. Component Lifecycle Management
   - Mount status tracking
   - Cleanup on unmount
   - Prevention of state updates after unmount

3. Error Handling
   - Specific handling for 401 errors
   - Automatic token cleanup
   - User-friendly error messages
   - Detailed logging for debugging

### Security Considerations
1. Token Storage
   - Secure storage in localStorage
   - Automatic cleanup on expiry/error
   - No sensitive data in token payload

2. Request Security
   - HTTPS only
   - Token-based authentication
   - Protected routes
   - CORS configuration

### Future Enhancements
1. Token refresh mechanism
2. Remember me functionality
3. Session timeout handling
4. Enhanced security measures

## Authentication Endpoints

### POST /api/v1/auth/register
Register a new user
- Request:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- Response:
  ```json
  {
    "email": "user@example.com",
    "is_active": true,
    "is_superuser": false
  }
  ```

### POST /api/v1/auth/login
Authenticate user and get token
- Request:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- Response:
  ```json
  {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "bearer",
    "expires_in": 1800
  }
  ```

### GET /api/v1/auth/me
Get current user information (requires authentication)
- Response:
  ```json
  {
    "email": "user@example.com",
    "is_active": true,
    "is_superuser": false
  }
  ``` 