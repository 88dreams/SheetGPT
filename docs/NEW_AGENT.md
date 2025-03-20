# NEW AGENT QUICK START

## Project Overview
SheetGPT combines AI-powered chat with structured data management and a sports database. Core features:
- Claude AI integration for data extraction and natural language queries
- Sports database with comprehensive entity relationships
- Data import/export tools with Google Sheets integration
- Database management system with backup and archiving

## Architecture

### Backend
- FastAPI + PostgreSQL with SQLAlchemy ORM
- Domain-driven design with facade pattern for services
- Modular architecture with generic base services and inheritance
- Claude API integration with streaming response handling
- Transaction management with proper error recovery

### Frontend
- React with TypeScript and custom hook-based architecture
- Feature-based folder organization for maintainability
- Single-responsibility components with optimized rendering
- Advanced data grid with sorting, filtering, and column management
- Performance optimizations to prevent render loops and dependency issues

## Key Components

1. **Database Management System**
   - Backup/restore functionality with CLI tools
   - Conversation archiving with JSON blob storage
   - Database statistics and monitoring dashboard
   - Scheduled maintenance tasks

2. **Entity Resolution System**
   - Name or UUID-based entity references
   - Automatic entity creation for missing references
   - Special character handling in entity names
   - Hierarchical relationship resolution

3. **SportDataMapper**
   - Interactive field mapping with drag-and-drop
   - Batch import with progress tracking
   - Smart entity type detection from field patterns
   - Record navigation with validation
   - Intelligent error handling with user guidance

4. **Entity Management**
   - Entity-specific form components with relationship fields
   - Bulk update system for mass entity changes
   - Column drag-and-drop with persistence
   - Toggle between UUID and human-readable names
   - Division/Conference hierarchy management
   - Advanced filtering with multiple operators

5. **Database Query System**
   - Natural language to SQL using Claude AI
   - Multi-level SQL extraction with fallbacks
   - Safety validation with whitelisted operations
   - Entity name resolution in query results
   - Export to CSV or Google Sheets

## Current Status

### Complete
- ✅ User authentication with JWT and role-based access
- ✅ Sports database with Division/Conference hierarchy model
- ✅ Claude AI chat with streaming responses
- ✅ Natural language database query system
- ✅ Entity management with relationship handling
- ✅ Database backup and conversation archiving
- ✅ Bulk entity operations with field preservation
- ✅ CSV and structured data extraction
- ✅ Entity name resolution system
- ✅ File upload processing in chat

### In Progress
- 🔄 Google Sheets export reliability
- 🔄 API endpoint testing
- 🔄 Frontend test coverage
- 🔄 Automated database maintenance
- 🔄 Mobile responsive design

## Critical Information

1. **Entity Hierarchy**
   ```
   Primary:
   - Leagues (with optional nickname)
   - Broadcast Companies
   - Production Companies
   
   Secondary:
   - Division/Conferences (requires leagues)
   - Teams (requires leagues + division/conferences + stadiums)
   - Stadiums (may have host_broadcaster)
   - Players (requires teams)
   
   Relationship:
   - Games (requires teams + stadiums)
   - Broadcast Rights (may reference division/conferences)
   - Production Services
   ```

2. **Key Architecture Patterns**
   - UUID primary keys throughout with relationship mappings
   - Facade pattern in backend services to delegate to specialized services
   - Hook-based modular frontend with single responsibility hooks
   - Feature-focused folder structure for complex components
   - Streaming response architecture with buffer management
   - Entity name resolution with special character handling

## Common Issues and Quick Solutions

1. **Database Operations**
   - Database tools: `python src/scripts/db_management.py [command]`
   - Backup: `python src/scripts/db_management.py backup`
   - Stats: `python src/scripts/db_management.py stats`
   - Archive conversations instead of deleting them

2. **Entity Relationships**
   - Use name-based references when possible
   - System automatically resolves names to UUIDs
   - Respect entity creation order (primary → secondary → relationship)
   - Division/Conference entities require league_id
   - Teams require division_conference_id

3. **Frontend Development**
   - Extract context variables at component start
   - Add null checks before accessing nested properties
   - Use optimistic updates with proper error fallbacks
   - Apply React.memo for expensive components
   - Keep column visibility consistent between entity and query views

## Essential Documentation
- TECHNICAL_DESCRIPTION.md - Component details
- API_ARCHITECTURE.md - Backend structure
- CLAUDE.md - AI integration specifics
- PROGRESS.md - Latest updates

## Development Workflow
```bash
# Start services
docker-compose up

# Run backend tests
docker-compose run --rm backend pytest

# Run frontend tests
./run-tests.sh

# Apply database migrations
docker-compose run --rm backend python src/scripts/alembic_wrapper.py upgrade

# Create sample data
docker-compose run --rm backend python src/scripts/create_sample_sports_data.py
```

## Recent Key Improvements

1. **SportDataMapper Workflow** (March 31, 2025)
   - Separated mapping from data operations
   - Made league_id optional for broadcast rights
   - Added default dates for missing fields
   - Improved entity type detection from content
   - Enhanced error handling for constraints

2. **Component Architecture** (March 17-20, 2025)
   - Refactored large components with hook-based architecture
   - Consolidated BulkEditModal implementations
   - Extracted business logic into specialized hooks
   - Used feature-based folder organization
   - Created entity-specific field components
   - Advanced BulkEditModal refactoring (March 20):
     - Created proper component directory structure with organized files
     - Implemented single-responsibility hooks for focused concerns
     - Added proper lifecycle management to prevent infinite loops
     - Separated UI from business logic for maintainability
     - Maintained explicit dependency tracking for all effects

3. **UI Enhancements** (March 22, 2025)
   - Persistent column drag-and-drop functionality
   - Names/IDs toggle for relationship fields
   - Fixed circular dependencies in state management
   - Data-driven column generation from API responses
   - Division/Conference dropdowns organized by league

4. **Division/Conference Model** (March 13, 2025)
   - Added as sub-unit of Leagues with nickname field
   - Created hierarchy: League → Division/Conference → Team 
   - Made division_conference required for teams
   - Added proper constraint handling

## Current Focus

### High Priority
- Google Sheets export reliability improvements
- API endpoint testing for sports database
- Database management monitoring tools
- Entity relationship validation enhancements
- Frontend component test coverage

### Technical Debt
- Mobile responsive design implementation
- Performance optimization for large datasets
- Documentation updates for recent changes
- Improved error handling for edge cases
- Test coverage expansion

## Quick Reference

### Key Commands
```bash
# Backend operations
python src/scripts/db_management.py backup
python src/scripts/db_management.py stats
python src/scripts/db_management.py cleanup --older-than=30d
python src/scripts/alembic_wrapper.py revision --autogenerate -m "migration_name"

# Frontend operations
docker-compose run --rm frontend npm run lint
docker-compose run --rm frontend npm run typecheck
```

### Development Guidelines
- Maintain data integrity with proper validation
- Follow entity dependency order for creation/deletion 
- Use archiving instead of deletion for important data
- Add null checks before accessing nested properties
- Update documentation alongside code changes
- Write tests for any new functionality
- Respect the project's modular architecture