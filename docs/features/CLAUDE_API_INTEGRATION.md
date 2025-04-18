# Claude Integration in SheetGPT

## Overview

SheetGPT leverages Claude 3.7 Sonnet for these key AI capabilities:

1. **Structured Data Extraction** - Converting unstructured text to structured data
2. **Natural Language Database Queries** - Translating questions to SQL with context
3. **Entity Name Resolution** - Intelligent entity reference mapping across types
4. **Smart Date Processing** - Year-only date handling with contextual defaults
5. **Virtual Entity Support** - Special entity types without dedicated tables
6. **CSV Processing** - Analyzing and structuring spreadsheet data

> **PRODUCTION DEPLOYMENT**: Claude API is integrated in the production environment at [88gpts.com/sheetgpt](https://88gpts.com/sheetgpt) with API keys securely stored in Digital Ocean environment variables. The production deployment utilizes separate domains for frontend (88gpts.com) and backend (api.88gpts.com) with proper CORS configuration for cross-domain communication.

## Implementation

### Core Integration

- **Model**: `claude-3-7-sonnet-20250219`
- **Streaming**: Server-Sent Events with sentence-based chunking and phase markers 
- **Error Handling**: Exponential backoff retry with session preservation
- **Security**: API keys stored in environment variables, not exposed to clients
- **Cross-Domain**: Chat streaming works across domains (Netlify frontend to Digital Ocean backend)
- **Rate Limiting**: Automated backoff with exponential delay on 429 responses
- **Production Monitoring**: Enhanced logging for API interactions in production
- **Fallback Mechanism**: Graceful error handling with user-friendly messages
- **Performance Optimization**: Reduced token count for production contexts
- **Caching**: Response caching for common queries to reduce API costs

### Key Features

#### Virtual Entity Support
- Championship and Playoffs entities with consistent IDs
- Deterministic UUID generation for stable references
- Schema validation for both UUID and string-based entity IDs

#### Entity Resolution
- Special character handling in entity names (parentheses, abbreviations)
- Multi-stage lookup: exact → partial → creation
- Hierarchical traversal (League → Division → Team)
- Entity type normalization with fallbacks

#### Smart Date Processing
- Year-only format detection with intelligent defaults:
  - Start dates: "2020" → "2020-01-01"
  - End dates: "2020" → "2020-12-31"

#### Natural Language to SQL
- Multi-level extraction with fallbacks:
  1. SQL code block extraction
  2. General code block extraction
  3. SELECT pattern matching
- Relationship-aware schema context
- Preview mode for SQL validation

#### Optimized Streaming
- Sentence-level chunking for smooth rendering
- Client-side phase markers for UI feedback
- Efficient buffer management

## Code Example

```python
async def get_streaming_response(self, history, message):
    """Get streaming response with retry logic"""
    retry_count = 0
    buffer = ""
    
    while retry_count <= self.max_retries:
        try:
            with self.client.messages.stream(
                model=self.default_model,
                messages=self._format_messages(history, message),
                temperature=0.7,
            ) as stream:
                for chunk in stream:
                    if chunk.type == "content_block_delta" and chunk.delta.text:
                        buffer += chunk.delta.text
                        
                        # Yield complete sentences for smoother rendering
                        while "." in buffer or "\n" in buffer:
                            idx = max(buffer.find("."), buffer.find("\n"))
                            if idx == -1: break
                            yield buffer[:idx+1]
                            buffer = buffer[idx+1:]
                
                if buffer: yield buffer
            return
                
        except anthropic.APIError as e:
            if e.status_code == 429 and retry_count < self.max_retries:
                retry_count += 1
                await asyncio.sleep((2 ** retry_count) * 0.5)  # Exponential backoff
            else:
                yield f"Error communicating with Claude: {str(e)}"
                return
```

## Recent Enhancements

- **Entity Type Detection**: Added pattern-based entity type classification
- **Relationship Detection**: Intelligent entity resolution for complex relationships
- **Secondary Brand Support**: Handling of hierarchical brand relationships
- **Chat History**: Improved message threading and conversation context preservation
- **File Attachment Handling**: Enhanced metadata handling for uploads in messages
- **Name-to-ID Resolution**: Smarter entity resolution with automatic creation
- **Automatic Date Handling**: Default start/end dates for production services

## Best Practices

- Implement automatic backoff for rate limits (429 errors)
- Provide fallback mechanisms for API failures
- Store API keys securely in environment variables
- Add schema validation for all extracted data
- Use streaming for responsive UI feedback
- Handle cross-domain streaming correctly with proper CORS headers
- Set appropriate timeout values for streaming responses
- Test rate limit handling in production environment

## Production Configuration

The Claude API is configured in the production environment with these settings:

```python
# Environment variables on Digital Ocean App Platform
ANTHROPIC_API_KEY=sk-ant-... # Secured in production environment variables
CLAUDE_MODEL=claude-3-7-sonnet-20250219
MAX_TOKENS=4096
TEMPERATURE=0.7
MAX_RETRIES=3
RETRY_BACKOFF_FACTOR=2
REQUEST_TIMEOUT=30

# Cross-domain streaming configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://88gpts.com",
        "https://www.88gpts.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "X-Request-ID"],
)

# Server-sent events configuration for streaming
async def get_streaming_response(request, conversation_id, message):
    # Generate unique request ID for tracing in production logs
    request_id = str(uuid.uuid4())
    
    # Enhanced production logging
    logger.info(f"Starting streaming request: {request_id} for conversation: {conversation_id}")
    
    response = StreamingResponse(
        chat_service.get_streaming_response(conversation_id, message, request_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Request-ID": request_id,
        }
    )
    
    # Add cleanup handler for connection close
    @response.background
    async def on_disconnect():
        logger.info(f"Streaming request completed: {request_id}")
        # Release any resources if needed
    
    return response

# Production-specific streaming handler with enhanced error recovery
async def get_streaming_response(self, conversation_id, message, request_id=None):
    """Get streaming response with comprehensive retry and error handling"""
    retry_count = 0
    buffer = ""
    start_time = time.time()
    
    # Record request start in production metrics
    if request_id and settings.ENVIRONMENT == "production":
        metrics_service.record_api_request(
            service="claude",
            request_id=request_id,
            endpoint="streaming"
        )
    
    while retry_count <= self.max_retries:
        try:
            with self.client.messages.stream(
                model=self.default_model,
                messages=self._format_messages(history, message),
                temperature=0.7,
                timeout=self.request_timeout,
                max_tokens=self.max_tokens
            ) as stream:
                for chunk in stream:
                    if chunk.type == "content_block_delta" and chunk.delta.text:
                        buffer += chunk.delta.text
                        
                        # Yield complete sentences for smoother rendering
                        while "." in buffer or "\n" in buffer:
                            idx = max(buffer.find("."), buffer.find("\n"))
                            if idx == -1: break
                            yield buffer[:idx+1]
                            buffer = buffer[idx+1:]
                
                if buffer: yield buffer
                
                # Record successful completion in production metrics
                if request_id and settings.ENVIRONMENT == "production":
                    duration = time.time() - start_time
                    metrics_service.record_api_response(
                        service="claude",
                        request_id=request_id,
                        status="success",
                        duration=duration
                    )
            return
                
        except anthropic.APIError as e:
            if e.status_code == 429 and retry_count < self.max_retries:
                retry_count += 1
                backoff_time = (2 ** retry_count) * 0.5
                
                # Enhanced production logging for rate limits
                if settings.ENVIRONMENT == "production":
                    logger.warning(
                        f"Claude API rate limit hit (429). Retry {retry_count}/{self.max_retries} "
                        f"with backoff: {backoff_time}s. Request: {request_id}"
                    )
                
                # Inform the client about retry
                yield f"[RETRY:{retry_count}]"
                
                await asyncio.sleep(backoff_time)  # Exponential backoff
            else:
                # Record error in production metrics
                if request_id and settings.ENVIRONMENT == "production":
                    duration = time.time() - start_time
                    metrics_service.record_api_response(
                        service="claude",
                        request_id=request_id,
                        status="error",
                        error_type=type(e).__name__,
                        error_code=getattr(e, "status_code", None),
                        duration=duration
                    )
                
                error_message = "I encountered an issue while processing your request. "
                if settings.ENVIRONMENT == "production":
                    # Generic message for production
                    error_message += "Please try again in a few moments."
                else:
                    # Detailed error for development
                    error_message += f"Error: {str(e)}"
                
                yield error_message
                return
```

### Production Environment Variables

The production deployment uses the following configuration in Digital Ocean App Platform:

```bash
# Claude API Configuration
ANTHROPIC_API_KEY=sk-ant-... # Secured in environment variables
CLAUDE_MODEL=claude-3-7-sonnet-20250219
MAX_TOKENS=4096
TEMPERATURE=0.7

# Environment Configuration
ENVIRONMENT=production
LOG_LEVEL=INFO
ENABLE_METRICS=true
ENABLE_RATE_LIMITING=true

# Cross-domain Configuration
ALLOWED_ORIGINS=https://88gpts.com,https://www.88gpts.com
CORS_HEADERS=Content-Type,Authorization,X-Request-ID

# Security Settings
SECURE_COOKIES=true
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=None
```

Access the chat functionality in production at [88gpts.com/sheetgpt/chat](https://88gpts.com/sheetgpt/chat)

Updated: April 18, 2025