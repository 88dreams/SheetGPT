# SheetGPT Development Progress

## Latest Update

### 2025-03-28: System-wide fixes and EntityList Component Refactoring

- Fixed Docker containerization issues:
  - Updated docker-compose.yml to properly mount tests directory
  - Fixed cross-container API communication with proper proxy configuration
  - Resolved hostname resolution issues between browser and Docker containers
  - Updated Vite proxy configuration with better error handling and logging

- Improved Documentation System:
  - Fixed documentation endpoints in backend API
  - Removed unnecessary authentication from docs endpoints
  - Added debug logging for documentation route troubleshooting
  - Fixed route prefix duplication in FastAPI routing

- Fixed API Client Configuration:
  - Implemented smarter API URL detection using relative URLs from browser
  - Enhanced error handling in API requests
  - Fixed token refresh mechanism in Docker environment
  - Added better debugging for network failures

- Completed the refactoring of the EntityList component which had grown to over 1300 lines:
  - Implemented proper component organization pattern with focused components and hooks
  - Added File System Access API support for saving files natively with browser picker
  - Fixed CSV export utility to use callback pattern instead of direct imports
  - Ensured backward compatibility with existing functionality

- Added comprehensive test suite for refactored components:
  - EntityListHeader.test.tsx: Tests for the list header component
  - EntityTable.test.tsx: Tests for the data table component
  - Pagination.test.tsx: Tests for the pagination controls
  - ExportDialog.test.tsx: Tests for the export dialog
  - useColumnVisibility.test.ts: Tests for the column visibility hook
  - useEntityExport.test.ts: Tests for the export functionality hook

- Improved Testing Infrastructure:
  - Updated docker-compose.yml to mount tests directory in the frontend-test container
  - Added custom Jest configuration (jest.entitylist.config.js) for running tests
  - Created npm script for running EntityList tests: npm run test:entitylist
  - Created detailed documentation for the testing approach (ENTITYLIST_TESTING.md)
  - Updated CLAUDE.md with instructions for running tests

## Previous Updates

### 2025-03-25: Production Service FK Updates

- Fixed foreign key relationship for production_service entities
- Updated database schema to ensure consistent referencing
- Applied migration to fix existing references
- Added checks to validate data integrity before and after migration

### 2025-03-18: Entity Nickname Functionality

- Added nickname field to division_conference entities
- Created migration to add the field to the database schema
- Updated UI components to display and edit nicknames
- Added badge styling for nickname display (bg-blue-100 text-blue-800)
- Implemented inline editing with proper validation (max 20 chars)

### 2025-03-17: Division Conference Updates

- Merged multiple migrations for division_conference updates
- Fixed entity resolution for division_conference entities
- Updated UI to display division conference information correctly

### 2025-03-13: League Nickname Support

- Added nickname field to leagues for display purposes
- Created migration to add the field to database schema
- Added UI support for nickname editing with validation
- Standardized nickname display across entity types

### 2025-03-10: Conversation Ordering

- Added conversation_order field to track conversation priority
- Implemented UI for drag-and-drop reordering of conversations
- Created backend support for persisting conversation order
- Added migration to support the new field

### 2025-03-01: Data Export Enhancement

- Implemented Google Sheets API integration for direct exports
- Added support for selecting Google Drive folders
- Enabled column visibility filtering for exports
- Created export dialog with file naming options
- Added CSV fallback when Google authentication fails

### 2025-02-28: Database Constraints and Cleanup

- Added unique constraints to prevent duplicate entities
- Implemented cleanup scripts to deduplicate existing data
- Fixed relationship references for impacted entities
- Created migrations to enforce new constraints

### 2025-02-27: Broadcast Data Model Enhancements

- Added host_broadcaster column to identify primary broadcasters
- Updated UI to support the new field with appropriate controls
- Fixed missing fields in game_broadcast and related models
- Applied migrations for schema changes

### 2025-02-25: Sports Database Models

- Added comprehensive sports entity models
- Implemented hierarchical relationships between entities
- Created migrations for all new tables
- Added admin field for user management

### 2025-02-21: Initial Migration

- Set up initial database schema
- Created alembic configuration for migrations
- Implemented base models for core functionality