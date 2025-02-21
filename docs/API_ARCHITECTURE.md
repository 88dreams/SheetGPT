# API Architecture

## Overview

SheetGPT implements a modern, scalable architecture based on FastAPI for the backend, with clear separation of concerns and modular design. The architecture is designed to handle real-time conversations while maintaining structured data organization and efficient export capabilities.

## Core Components

### 1. API Layer (FastAPI)
- **Why FastAPI?** 
  - Modern, fast, and async-capable framework
  - Automatic OpenAPI documentation
  - Type checking and validation using Pydantic
  - Excellent WebSocket support for real-time chat
- **Current Implementation**:
  - Async request handling
  - JWT-based authentication
  - Modular routing with prefix support
  - Environment-based configuration
  - ChatGPT integration with structured responses

### 2. Service Layer
- **Authentication Service** (Implemented)
  - User registration and login
  - Password hashing with bcrypt
  - JWT token generation and validation
  - Protected route access control
  
- **Conversation Service** (Implemented)
  - ChatGPT interactions with GPT-4
  - Conversation context management
  - Message history tracking
  - Structured data extraction
  - Custom response formatting
  
- **Data Structure Service** (Planned)
  - Processes ChatGPT responses into structured formats
  - Maintains data schemas and validation
  - Handles data versioning and updates

- **Export Service** (Planned)
  - Manages connections to Google Sheets API
  - Handles Excel file generation
  - Implements data formatting for different export types

### 3. Data Layer
- **Schema Design**
  - SQLAlchemy ORM models
  - UUID primary keys
  - Timestamp tracking (created, updated, deleted)
  - JSON fields for flexible data structures
  - Relationship management between models

- **Storage Strategy**
  - PostgreSQL with async support
  - Connection pooling for performance
  - Alembic migrations for schema changes
  - Soft deletion for data retention
  - Efficient query optimization

### 4. Export Layer
- **Google Sheets Service** (Implemented)
  - OAuth2 authentication ✓
  - Template management (planned)
  - Data conversion ✓
  - Real-time updates (planned)
  - Error handling ✓

- **Template System** (In Progress)
  - Predefined layouts
  - Dynamic mapping
  - Formatting rules
  - Validation rules

- **Export Management** (Implemented)
  - Job tracking ✓
  - Status monitoring ✓
  - Error recovery ✓
  - Rate limiting (planned)

## Data Flow

1. User Input → Authentication Service
   - Request validation
   - Token verification
   - User context injection

2. Authenticated Request → Conversation Service
   - Message validation
   - Context preparation
   - ChatGPT interaction
   - Response processing
   - Structured data extraction

3. Service Layer → Data Layer
   - Async database operations
   - Transaction management
   - Data integrity checks
   - Relationship maintenance

4. Export Flow → Google Sheets (Implemented)
   - OAuth2 authentication ✓
   - Token management ✓
   - Spreadsheet creation ✓
   - Data conversion ✓
   - Status tracking ✓

## Design Principles

1. **Modularity**
   - Independent service components
   - Clear interface boundaries
   - Dependency injection pattern
   - Reusable utilities
   - Pluggable AI models

2. **Scalability**
   - Async database operations
   - Connection pooling
   - Stateless authentication
   - Resource cleanup
   - Efficient context management

3. **Maintainability**
   - Type annotations
   - Consistent code formatting
   - Comprehensive documentation
   - Error tracking
   - Version control

4. **Extensibility**
   - Modular router structure
   - Plugin-style services
   - Configurable components
   - Feature flags support
   - Custom data formats

5. **Export Integration**
   - Template-based design
   - Asynchronous processing
   - Batch operations
   - Error recovery
   - Real-time updates

## Security Considerations

- **Authentication**
  - Secure password hashing (bcrypt)
  - JWT token expiration
  - Protected route decorators
  - Role-based access (planned)
  - Session management
  - OAuth2 token management
  - API key security
  - Service account management

- **Data Protection**
  - Environment-based secrets
  - Database connection security
  - Input validation
  - SQL injection prevention
  - API key management
  - Export permissions
  - Sheet access control
  - Data retention policies

- **API Security**
  - CORS configuration
  - Rate limiting (planned)
  - Request validation
  - Error message sanitization
  - OpenAI key protection
  - Rate limiting per service
  - Quota management
  - Access auditing

## Future Considerations

1. **Authentication Enhancements**
   - Refresh token implementation
   - OAuth integration
   - Two-factor authentication
   - Session management
   - Role-based permissions

2. **Performance Optimization**
   - Response caching
   - Query optimization
   - Batch processing
   - Connection pooling tuning
   - Context window optimization

3. **Monitoring**
   - Performance metrics
   - Error tracking
   - Usage analytics
   - Health checks
   - Cost monitoring

4. **Integration**
   - Additional AI models
   - Export formats
   - Third-party services
   - Webhook support
   - API versioning

5. **Export Enhancements**
   - Additional export formats
   - Advanced templates
   - Real-time collaboration
   - Data validation rules
   - Custom formatting options 