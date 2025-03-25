# Claude Integration in SheetGPT

## Overview

SheetGPT leverages Claude 3.7 for these AI-powered features:

1. **Structured Data Extraction**: Converting text to structured data
2. **Natural Language Database Queries**: Translating questions to SQL
3. **Entity Name Resolution**: Resolving entity references across types
4. **Smart Date Handling**: Processing year-only dates intelligently
5. **Virtual Entity Support**: Handling special entity types without tables
6. **File Processing**: Analyzing CSV files with structure detection

## Current Implementation

### API Integration

- **Model**: `claude-3-7-sonnet-20250219`
- **Streaming Architecture**: 
  - Server-Sent Events (SSE) with sentence-based chunking
  - Stream phase markers for client-side processing
  - Optimized buffer management
- **Error Handling**: 
  - Retry mechanism with exponential backoff
  - Session preservation during connection issues

### Key Features

#### Virtual Entity Support
- Support for Championship and Playoffs without dedicated tables
- Deterministic UUID generation for consistent references
- Schema validation supporting both UUID and string entity IDs

#### Entity Name Resolution
- Special character handling in entity names (including parentheses)
- Multi-stage lookup: exact match → partial match → creation
- Entity type normalization (e.g., 'conference' → 'division_conference')
- Hierarchical relationship traversal (League → Division → Team)

#### Smart Date Processing
- Year-only date format detection:
  - January 1st for start dates (e.g., "2020" → "2020-01-01")
  - December 31st for end dates (e.g., "2020" → "2020-12-31")

#### Natural Language to SQL
- Multi-level SQL extraction from Claude responses:
  1. SQL code block extraction (primary)
  2. General code block extraction (fallback)
  3. SELECT statement pattern matching (last resort)
- Enhanced schema context with relationship information
- Translation-only mode for SQL preview without execution

#### Streaming Implementation
- Sentence-level chunking for smooth progressive rendering
- Phase markers for client notification:
  - `[STREAM_START]`, `[PHASE:SEARCHING]`, `[PHASE:THINKING]`, `[STREAM_END]`
- Optimized buffer management for memory efficiency

## Technical Example

```python
class AnthropicService:
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=config.API_KEY_ANTHROPIC
        )
        self.default_model = "claude-3-7-sonnet-20250219"
        self.max_retries = 3
        
    async def get_streaming_response(
        self, 
        history: List[Dict[str, str]], 
        message: str
    ) -> AsyncGenerator[str, None]:
        """Get streaming response with retry logic"""
        retry_count = 0
        buffer = ""
        
        while retry_count <= self.max_retries:
            try:
                messages = self._format_messages(history, message)
                
                with self.client.messages.stream(
                    model=self.default_model,
                    max_tokens=4000,
                    messages=messages,
                    temperature=0.7,
                ) as stream:
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
                    
                    if buffer:
                        yield buffer
                        
                return
                
            except anthropic.APIError as e:
                if e.status_code == 429 and retry_count < self.max_retries:
                    retry_count += 1
                    wait_time = (2 ** retry_count) * 0.5  # Exponential backoff
                    await asyncio.sleep(wait_time)
                else:
                    yield f"Error communicating with Claude: {str(e)}"
                    return
```

## Recent Improvements

- **Model Upgrade**: Upgraded to claude-3-7-sonnet-20250219
- **SQL Generation**: Enhanced extraction with multi-level fallbacks
- **Entity Resolution**: Added parentheses support in entity names
- **Virtual Entities**: Added Championship/Playoffs support without tables
- **Streaming**: Optimized buffer management for better performance

## Usage Guidelines

- **Rate Limiting**: Automatic backoff for 429 errors
- **Error Handling**: Fallbacks for API failures
- **API Security**: Environment variable key management
- **Response Processing**: Schema validation with fallbacks

## Resources

- [Claude 3 Documentation](https://docs.anthropic.com/claude/docs)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Streaming API Documentation](https://docs.anthropic.com/claude/reference/messages-streaming)