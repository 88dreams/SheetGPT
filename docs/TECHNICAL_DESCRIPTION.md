# Technical Description

This document provides a technical description of the SheetGPT project architecture and implementation.

## System Architecture

### Backend (FastAPI + PostgreSQL)

#### Core Components
```
src/
├── api/              # Domain-specific endpoints
├── models/           # SQLAlchemy models
├── schemas/          # Pydantic schemas
├── services/         # Business logic
├── scripts/          # Maintenance and migration scripts
└── utils/            # Shared utilities
```

#### Key Features
1. **Authentication**
   - JWT-based system
   - Role-based access control
   - Secure token management
   - Admin privilege verification
   - Robust error handling

2. **Database Management**
   - SQLAlchemy ORM with UUID primary keys
   - Isolated transaction handling
   - Comprehensive validation layer
   - Automated backup and restore
   - Conversation archiving
   - Database statistics and monitoring
   - Order-based conversation management

3. **API Organization**
   - Domain-driven design
   - Modular routing structure
   - Standardized response formats
   - Role-based API access
   - Structured error handling
   - Enhanced logging system

### Frontend (React + TypeScript)

#### Core Structure
```
frontend/
├── api/          # API clients
├── components/   # Reusable UI
├── contexts/     # State management
├── hooks/        # Custom hooks
├── pages/        # Route components
└── services/     # Business logic
```

#### Key Features
1. **State Management**
   - React Query for server state
   - Context API for global state
   - Local state for UI elements
   - ChatContext for optimized streaming
   - DataFlowContext for extraction pipeline

2. **Component Architecture**
   - Modular design
   - Shared components
   - Custom hooks for business logic
   - Admin dashboard components
   - Extraction services architecture
   - Error handling utilities

## Data Architecture

### Database Schema

#### Core Entities
1. **Primary Tables**
   ```
   leagues
   ├── name, sport, country
   ├── broadcast_dates
   └── → broadcast_companies
   
   teams
   ├── name, city, state
   ├── → leagues
   └── → stadiums
   
   stadiums
   ├── name, capacity
   └── → host_broadcaster
   
   players
   ├── name, position
   └── → teams
   ```

2. **Relationship Tables**
   ```
   games
   ├── date, time, status
   ├── → home_team
   ├── → away_team
   └── → stadium
   
   broadcast_rights
   ├── territory, dates
   └── → broadcast_company
   
   production_services
   ├── service_type, dates
   └── → production_company
   ```

3. **System Tables**
   ```
   archived_conversations
   ├── original_id, archived_date
   ├── conversation_data (JSON)
   └── metadata
   
   database_backups
   ├── timestamp, filename
   ├── size, backup_type
   └── status
   
   database_statistics
   ├── timestamp, entity_counts
   ├── storage_metrics
   └── performance_indicators
   
   conversations
   ├── id, title, created_at
   ├── user_id (foreign key)
   ├── order_index (for sorting)
   └── metadata
   ```

### Data Flow Patterns

1. **Chat to Data Pipeline**
   ```
   User Message → AI Processing → Data Extraction → 
   Validation → Storage → UI Update
   ```

2. **Sports Data Import**
   ```
   Source Data → Field Mapping → Entity Resolution →
   Validation → Batch Import → Progress Tracking
   ```

3. **Database Maintenance**
   ```
   Scheduled Job → Transaction Audit → Database Backup →
   Statistics Collection → Admin Dashboard Update
   ```

## Key Components

### DatabaseManagementSystem
- Purpose: Maintain database health and provide backup/restore capabilities
- Architecture: Service/CLI pattern
- Features:
  - Automated backups using pg_dump
  - Conversation archiving
  - Database statistics collection
  - Admin dashboard integration
  - CLI tools for maintenance
  - Scheduled task management

### SportDataMapper
- Purpose: Map structured data to sports entities
- Architecture: Container/Hooks pattern
- Features:
  - Auto entity detection
  - Smart field mapping
  - Batch processing
  - Progress tracking

### Entity Management
- Purpose: CRUD operations for sports entities
- Features:
  - Advanced filtering
  - Bulk operations
  - Relationship handling
  - Pagination

### Chat System
- Purpose: AI interaction and data extraction
- Features:
  - Message streaming with real-time processing
  - Structured data extraction and validation
  - Conversation management with history and reordering
  - Error handling and recovery with fallbacks
  - Background task processing
  - Rate limiting and timeout handling
  - Automatic message persistence
  - Structured data schema validation
  - Message repeat functionality
  - Enhanced extraction services architecture
  - Claude API integration

Components:
1. **ChatService**
   - Handles conversation and message management
   - Integrates with Claude API via AnthropicService
   - Handles streaming responses with buffer management
   - Processes structured data extraction
   - Manages conversation archiving and reordering
   - Handles error recovery and fallbacks

2. **AnthropicService**
   - Manages Claude API connections
   - Handles API key management
   - Processes streaming responses
   - Implements retry mechanisms
   - Handles rate limits and timeouts
   - Provides structured error responses

3. **Extraction Services**
   - DataDetectionService for entity identification
   - DataParserService for schema validation
   - DataExtractionService for workflow coordination
   - Session storage fallback mechanism

4. **Message Processing**
   ```
   User Message → Chat Context → Claude API →
   Structured Data Extraction → Session Storage →
   Response Streaming → Message Persistence
   ```

5. **Error Recovery**
   - Session storage fallbacks
   - Graceful error handling with user feedback
   - Standardized error utilities
   - Structured logging with error tracking
   - Transaction management
   - Session state preservation

## Data Management

### Database Management
1. **Backup System**
   - Scheduled backups with pg_dump
   - Configurable retention policy
   - JSON metadata storage
   - AWS S3 integration (optional)
   - Restore functionality

2. **Archiving System**
   - Soft delete with archive tables
   - JSON blob storage for archived content
   - Restore capability
   - Data pruning with age-based policies

3. **Statistics Collection**
   - Entity count tracking
   - Storage usage monitoring
   - Query performance metrics
   - Admin dashboard visualization

### Validation System
1. **Entity Validation**
   - Reference integrity
   - Required fields
   - Type checking
   - Relationship validation

2. **Field Mapping**
   - Name-to-UUID conversion
   - Automatic entity resolution
   - Type coercion
   - Error aggregation

### Transaction Management
1. **API Endpoints**
   - FastAPI dependency injection
   - Automatic cleanup
   - Admin role verification
   - Rate limiting

2. **Batch Operations**
   - Isolated sessions
   - Rollback support
   - Progress tracking
   - Error aggregation

## Error Handling

### Frontend
1. **UI Errors**
   - Form validation
   - API error display
   - Loading states
   - Optimistic updates

2. **Data Errors**
   - Field validation
   - Type checking
   - Relationship verification
   - Import validation

### Backend
1. **API Errors**
   - Standard error responses
   - Validation errors
   - Database errors
   - Authentication errors

2. **Database Errors**
   - Constraint violations
   - Transaction failures
   - Deadlock handling
   - Connection issues
   - Backup failures

## Performance Considerations

### Frontend
- React Query caching
- Pagination implementation
- Optimistic updates
- Lazy loading
- Dashboard data polling

### Backend
- Query optimization
- Connection pooling
- Batch processing
- Cache management
- Backup compression
- Archive table indexing

## Security Measures

1. **Authentication**
   - JWT validation
   - Role-based access
   - Token refresh
   - Session management
   - Admin privilege verification

2. **Data Access**
   - Field-level permissions
   - Entity ownership
   - Admin restrictions
   - API rate limiting

3. **Database Security**
   - Backup encryption
   - Secure archive access
   - Audit logging
   - Access control for maintenance operations

## Testing Infrastructure

1. **Frontend Tests**
   - Component testing
   - Hook testing
   - Integration tests
   - E2E testing
   - Admin dashboard tests

2. **Backend Tests**
   - Unit tests
   - API tests
   - Database tests
   - Integration tests
   - Database management tests
   - Backup/restore tests

This document is maintained alongside code changes to ensure accuracy.
