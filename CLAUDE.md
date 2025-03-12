# SheetGPT Development Guide

## Build/Test/Lint Commands

### Docker Environment
- Start all services: `docker-compose up`
- Start specific service: `docker-compose up backend` or `docker-compose up frontend`
- Rebuild containers: `docker-compose build`
- Rebuild single container: `docker-compose build frontend` or `docker-compose build backend`

### Backend (Python)
- Run server: `docker-compose up backend`
- Lint: `docker-compose run --rm backend bash -c "black . && isort . && flake8"`
- Type check: `docker-compose run --rm backend mypy`
- Run tests: `docker-compose run --rm backend pytest` or for specific tests: `docker-compose run --rm backend pytest tests/path/to/test_file.py::TestClass::test_function`
- Apply migrations: `docker-compose run --rm backend python src/scripts/alembic_wrapper.py upgrade`
- Generate migration: `docker-compose run --rm backend python src/scripts/alembic_wrapper.py revision --autogenerate -m "migration_name"`

### Frontend (React/TypeScript)
- Run dev server: `docker-compose up frontend`
- Run tests: `./run-tests.sh` or `docker-compose run --rm frontend-test`
- Run specific test: `docker-compose run --rm frontend-test npm test -- --testPathPattern=ComponentName`
- Lint: `docker-compose run --rm frontend npm run lint`
- TypeCheck: `docker-compose run --rm frontend npm run typecheck`

### Database Management
- Run backup: `python src/scripts/db_management.py backup`
- View statistics: `python src/scripts/db_management.py stats`
- Cleanup old data: `python src/scripts/db_management.py cleanup --older-than=30d`
- Restore backup: `python src/scripts/db_management.py restore --file=backup_20250309.sql`
- Archive conversation: `python src/scripts/db_management.py archive --conversation-id=12345`
- Scheduled backup: `python src/scripts/scheduled_backup.py`
- Reset conversation order: `python src/scripts/db_management.py reset-order --user-id=user_uuid`

## Code Style

- Python: Black formatter (88 char line length), strict typing with MyPy
- TypeScript: Follow React best practices with functional components and hooks
- Use early returns for readability and descriptive variable names with handleX prefix for event handlers
- Prefer const arrow functions over function declarations
- Always use proper typing (avoid 'any')
- Use TailwindCSS for styling; avoid CSS files when possible
- Follow proper error handling patterns with try/catch blocks
- Components should follow single responsibility principle
- Use dedicated error utilities for standardized error handling
- Implement session storage fallbacks for API failures
- Structure components with clean separation of concerns
- Modularize functionality into composable hooks
- Implement exhaustive input validation before processing
- Use helper functions for repeated operations 
- Add debug logging for complex operations
- Store complex logic in dedicated services
- Never trust third-party API data without validation
- Always handle edge cases gracefully

## React DnD Implementation Notes

- For drag and drop functionality, prefer react-beautiful-dnd over react-dnd 
- The conversation reordering feature has unresolved issues with state updates
- Future implementation should handle optimistic UI updates consistently
- Keep drag-drop interactions simple, with minimal state changes during hover events
- Update local state immediately on drop, then send API request as side effect
- For list reordering, use index-based API (instead of order field) where possible
- Always provide visual feedback during drag operations

## Database Guidelines

- Prefer archiving over deletion for important data
- Use transactions for critical operations
- Handle database errors with proper try/except blocks
- Monitor database growth patterns
- Run scheduled backups regularly
- Use admin tools for database maintenance tasks
- Implement proper migration testing
- Use order_index fields for sortable collections
- Structure PostgreSQL queries properly for JSONB fields
- Follow entity dependency order in operations

## Error Handling Guidelines

- Use structured error types from errors.ts utility
- Implement appropriate fallback mechanisms
- Provide clear user feedback for errors
- Use session storage for temporary data preservation
- Log errors with appropriate context and severity
- Handle network failures gracefully
- Use optimistic UI updates with recovery patterns
- Validate data at multiple levels (client, API, database)
- Implement CSV fallbacks for export functionality
- Add debug logging for complex operations 
- Use try/catch blocks with specific error handling
- Provide alternative formats for data export when APIs fail
- Always validate input/output data structure before processing

## Claude API Integration

- API key stored in environment variables
- Implement proper rate limiting awareness
- Handle streaming responses with buffer management
- Provide fallbacks for API failures
- Follow Anthropic's usage guidelines
- Include appropriate model parameters
- Structure prompts for optimal response quality
- Implement robust error handling