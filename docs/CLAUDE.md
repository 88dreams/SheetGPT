# Claude Integration in SheetGPT

## Overview

SheetGPT leverages Claude 3.7 Sonnet for these key AI capabilities:

1. **Structured Data Extraction** - Converting unstructured text to structured data
2. **Natural Language Database Queries** - Translating questions to SQL with context
3. **Entity Name Resolution** - Intelligent entity reference mapping across types
4. **Smart Date Processing** - Year-only date handling with contextual defaults
5. **Virtual Entity Support** - Special entity types without dedicated tables
6. **CSV Processing** - Analyzing and structuring spreadsheet data

## Implementation

### Core Integration

- **Model**: `claude-3-7-sonnet-20250219`
- **Streaming**: Server-Sent Events with sentence-based chunking and phase markers 
- **Error Handling**: Exponential backoff retry with session preservation

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

- **Model Update**: Upgraded to latest Claude 3.7 Sonnet model
- **Entity Resolution**: Improved special character handling
- **Virtual Entities**: Added support for Championship/Playoffs references
- **SQL Generation**: Enhanced extraction with multi-level fallbacks
- **Streaming Performance**: Optimized buffer management
- **UI Integration**: Proper page titles for navigation context

## Best Practices

- Implement automatic backoff for rate limits (429 errors)
- Provide fallback mechanisms for API failures
- Store API keys securely in environment variables
- Add schema validation for all extracted data
- Use streaming for responsive UI feedback

Updated: April 2, 2025