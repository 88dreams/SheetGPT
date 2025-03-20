# Claude Integration in SheetGPT

## Overview

SheetGPT leverages Anthropic's Claude for various AI-powered features:

1. **Structured Data Extraction**: Converting unstructured text to structured data
2. **Natural Language Database Queries**: Translating natural language questions to SQL
3. **Entity Name Resolution**: Assisting with entity reference resolution and disambiguation
4. **Data Analysis**: Providing insights on user-uploaded data
5. **File Processing**: Analyzing uploaded CSV and text files with automatic structure detection
6. **Smart Date Handling**: Processing and correcting date formats with contextual intelligence
7. **Entity Relationship Traversal**: Determining appropriate league associations for broadcast rights
8. **Web Search Integration**: Processing search operations with special handling
9. **Code Review**: Analyzing and providing feedback on code

## Implementation Details

### API Integration

The Claude integration is implemented in `src/services/anthropic_service.py` with these advanced components:

- **Model Version**: Currently using `claude-3-7-sonnet-20250219`
- **Streaming Architecture**: 
  - Server-Sent Events (SSE) format for real-time updates
  - Sentence-based chunking for optimal rendering
  - Stream phase markers for client-side processing
  - Dynamic buffer management for memory efficiency
- **Error Handling**: 
  - Retry mechanism with exponential backoff
  - Fallback strategies for API failures
  - Graceful error messages for user feedback
  - Session preservation during connection issues
- **Prompt Engineering**: 
  - Specialized prompts for different use cases
  - Schema-aware context for database queries
  - Structured output format with markers
  - Context window optimization techniques
- **Performance Optimization**:
  - Configurable timeouts for external operations
  - Memory-efficient streaming with progressive rendering
  - Request animation frames for smooth UI transitions
  
### Entity Integration and Relationship Handling

Claude assists with complex entity management challenges:

- **Cross-Entity Type Mapping**:
  - Automatically detecting when a brand can serve as a broadcast company
  - Suggesting appropriate entity types for ambiguous imports
  - Resolving entity references across different entity types
  - Validating relationship integrity across the database
  
- **Smart Date Processing**:
  - Detecting year-only date formats in user input
  - Intelligently setting appropriate values for start/end dates:
    - January 1st for start dates
    - December 31st for end dates
  - Providing format guidance for users
  
- **Relationship Traversal**:
  - Identifying appropriate league associations based on entity relationships:
    - Direct league relationship (broadcast_right for a league)
    - Team's league for team broadcast rights
    - Division/conference's league for regional broadcast rights
    - Game's league for game broadcast rights
  - Handling special cases with "Not Associated" designation
  - Adapting to various entity relationship paths

### Database Query System

Claude powers our sophisticated natural language to SQL conversion:

1. User asks a question about the database
2. System provides Claude with enhanced context:
   - Complete database schema information
   - Table relationships and constraints
   - Field descriptions and data types
   - Sample data for context
   - Comprehensive safety constraints
3. Claude generates SQL with multi-level extraction:
   - Primary extraction from SQL-tagged code blocks
   - Fallback to general code block extraction
   - Last resort pattern matching for SELECT statements
4. User can:
   - Edit the generated SQL before execution
   - Use "Translate" button to generate SQL without execution
   - Execute queries directly
   - Save queries for future reference
5. Results are enhanced with entity name resolution:
   - UUID fields automatically mapped to human-readable names
   - Support for division/conference relationships
   - Toggle between UUID and name display
6. Results can be exported to:
   - CSV files (client-side generation)
   - Google Sheets (with OAuth authentication)
   - Database with proper error handling

### Entity Name Resolution

When users reference entities by name instead of UUID:

1. Enhanced entity recognition process:
   - Intelligent name processing with special character handling
   - Support for partial names with smart matching
   - Entity type normalization (e.g., 'conference' → 'division_conference')
   - Name extraction for entities with parentheses
2. Multi-stage resolution strategy:
   - Exact name matching with case insensitivity
   - Partial name matching as fallback
   - Smart entity type detection from name content
3. Relationship handling:
   - Hierarchical relationship recognition (League → Division/Conference → Team)
   - Auto-creation of missing entities with appropriate defaults
   - Default date handling (April 1, 1976) for missing dates
4. UI feedback:
   - User-friendly notifications for entity creation
   - Clear error messages for constraint violations
   - Guidance for correcting missing or invalid data

### File Processing

Claude analyzes uploaded files with advanced detection:

1. File upload capabilities directly in chat interface
2. Automatic format detection:
   - CSV structure analysis with header detection
   - Column type inference
   - Relationship identification
3. Data mapping assistance:
   - Field matching to database entities
   - Suggested entity types based on content
   - Interactive field mapping through UI
4. Processing options:
   - Direct import to database
   - Structured preview with editing
   - Validation with constraint checking

### Streaming Implementation

The system implements an advanced streaming architecture:

1. **Server-Side:**
   - SSE (Server-Sent Events) formatting with proper data prefixes
   - Chunk buffer management for optimal response delivery
   - Stream phase markers for client notification:
     - `[STREAM_START]` - Indicates beginning of response
     - `[PHASE:SEARCHING]` - Indicates active search operations
     - `[PHASE:THINKING]` - Indicates processing or analysis
     - `[PHASE:COMPLETE]` - Indicates successful completion
     - `[STREAM_END]` - Marks end of stream for cleanup
   - Special command detection (e.g., `[SEARCH]` prefix)
   - Exception handling with graceful error messages

2. **Client-Side:**
   - Progressive rendering with sentence-level chunking
   - Smooth UI transitions with request animation frames
   - Visual indicators for stream phases
   - Markdown rendering with code syntax highlighting
   - Auto-scrolling with user override capability

3. **Error Handling:**
   - Retry logic with exponential backoff for transient errors
   - Rate limit detection and appropriate waiting periods
   - Session storage for preserving partial responses
   - Fallback strategies for service interruptions
   - User-friendly notifications for different error types

### Recent Claude-Related Improvements

- **Claude Model Upgrade (March 2025)**
  - Upgraded from claude-3-sonnet-20240229 to claude-3-7-sonnet-20250219
  - Enhanced instruction following capability
  - Improved structured data extraction
  - Better context handling for complex queries

- **Natural Language Query Enhancements (March 31, 2025)**
  - Improved SQL generation with multi-level extraction:
    - Regex pattern matching for SQL code blocks
    - Fallback extraction for general code blocks
    - Smart SELECT statement detection as last resort
  - Enhanced schema context for more accurate queries
  - Added toggle for translation-only mode
  - Improved error handling for malformed queries

- **Entity Name Resolution Improvements (March 29, 2025)**
  - Enhanced name processing with special character handling
  - Support for entities with parentheses in names
  - Smart entity type detection from name content
  - Entity type normalization for consistent processing
  - Default date handling with configurable fallbacks

- **Stream Processing Optimization (March 25, 2025)**
  - Implemented memory-efficient buffer management
  - Added phase markers for client-side processing
  - Enhanced error handling during streaming
  - Improved chunking for sentence-based rendering
  - Added stream monitoring with appropriate logging

- **File Processing Integration (March 20, 2025)**
  - Added file upload capabilities in chat interface
  - Implemented smart CSV detection and parsing
  - Enhanced data structure inference for uploaded files
  - Integrated with SportDataMapper for advanced mapping
  - Added validation and constraint checking for imports

- **Component Architecture Refactoring (March 20, 2025)**
  - Refactored BulkEditModal with proper directory structure and hooks
  - Used Claude to identify component architecture issues and solutions
  - Applied single-responsibility principle to all components and hooks
  - Created specialized hooks with focused concerns:
    - useFieldManagement for field selection and categorization
    - useRelationships for relationship data loading
    - useFieldDetection for detecting fields from query results
    - useBulkUpdate for processing bulk updates
    - useModalLifecycle for component lifecycle management
  - Implemented clean separation of UI from business logic
  - Fixed infinite render loop issues with proper lifecycle management
  - Added explicit dependency tracking in all hooks

## Technical Implementation

### API Client Configuration

```python
class AnthropicService:
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=config.API_KEY_ANTHROPIC
        )
        self.default_model = "claude-3-7-sonnet-20250219"
        self.logger = logging.getLogger("anthropic_service")
        self.max_retries = 3
        
    async def get_streaming_response(
        self, 
        history: List[Dict[str, str]], 
        message: str
    ) -> AsyncGenerator[str, None]:
        """Get streaming response with retry logic."""
        retry_count = 0
        buffer = ""
        
        while retry_count <= self.max_retries:
            try:
                # Format history into messages array
                messages = self._format_messages(history, message)
                
                # Create streaming completion with configurable parameters
                with self.client.messages.stream(
                    model=self.default_model,
                    max_tokens=4000,
                    messages=messages,
                    temperature=0.7,
                ) as stream:
                    # Process stream chunks
                    for chunk in stream:
                        if chunk.type == "content_block_delta" and chunk.delta.text:
                            buffer += chunk.delta.text
                            
                            # Yield complete sentences for smoother rendering
                            while "." in buffer or "\n" in buffer:
                                idx = max(buffer.find("."), buffer.find("\n"))
                                if idx == -1:
                                    break
                                    
                                yield buffer[:idx+1]
                                buffer = buffer[idx+1:]
                            
                    # Yield any remaining content
                    if buffer:
                        yield buffer
                        
                return
                
            except anthropic.APIError as e:
                # Handle rate limits with exponential backoff
                if e.status_code == 429 and retry_count < self.max_retries:
                    retry_count += 1
                    wait_time = (2 ** retry_count) * 0.5  # Exponential backoff
                    self.logger.warning(f"Rate limited. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    # Non-recoverable error
                    self.logger.error(f"Claude API error: {str(e)}")
                    yield f"Error communicating with Claude: {str(e)}"
                    return
```

### Streaming Response Format

The system formats streaming responses using the SSE (Server-Sent Events) standard:

```python
def _format_sse_message(self, data: str) -> str:
    """Format string as Server-Sent Events message."""
    return f"data: {data}\n\n"
```

## Usage Guidelines

1. **Rate Limiting**: 
   - Automatic detection of rate limit errors (429)
   - Exponential backoff with configurable retry attempts
   - Appropriate logging for monitoring usage patterns
   - Graceful degradation for quota exhaustion

2. **Error Handling**: 
   - UI provides fallback mechanisms if Claude is unavailable
   - Session storage for preserving partial responses
   - Appropriate user notifications based on error type
   - Backend logging for operational monitoring

3. **Prompt Security**: 
   - Input validation to prevent prompt injection
   - Content filtering for appropriate usage
   - Parameter validation before API calls
   - Context window size monitoring

4. **Authentication**: 
   - API keys securely managed via environment variables
   - No client-side exposure of credentials
   - Request validation with appropriate headers
   - Monitoring for unauthorized access attempts

5. **Response Processing**: 
   - Schema validation for structured data extraction
   - Format verification for expected outputs
   - Fallback mechanisms for unexpected responses
   - Appropriate error handling for malformed data

## Resources

- [Claude 3 Official Documentation](https://docs.anthropic.com/claude/docs)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Claude 3 Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/guides-for-claude-3)
- [Streaming API Documentation](https://docs.anthropic.com/claude/reference/messages-streaming)
- [Rate Limits & Quotas](https://docs.anthropic.com/claude/reference/rate-limits)