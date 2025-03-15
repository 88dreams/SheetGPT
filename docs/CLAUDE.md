# Claude Integration in SheetGPT

## Overview

SheetGPT uses Anthropic's Claude for various AI-powered features:

1. **Structured Data Extraction**: Converting unstructured text to data
2. **Natural Language Database Queries**: Translating questions to SQL
3. **Entity Name Resolution**: Assisting with entity reference resolution
4. **Data Analysis**: Providing insights on user-uploaded data

## Implementation Details

### API Integration

The Claude integration is implemented in `src/services/anthropic_service.py` with these key components:

- **Stream Handling**: Properly manages streaming responses
- **Error Handling**: Robust error handling with appropriate fallbacks
- **Prompt Engineering**: Specialized prompts for different use cases
- **Context Management**: Efficient handling of context windows

### Database Query System

Claude powers our natural language to SQL conversion:

1. User asks a question about the database
2. System provides Claude with:
   - Database schema information
   - Sample data for context
   - Safety constraints
3. Claude generates SQL query
4. User can edit or directly execute the query
5. Results are displayed and can be exported

### Entity Name Resolution

When users reference entities by name instead of UUID:

1. Claude helps identify potential entity references
2. System validates against existing entities
3. If multiple matches, Claude helps disambiguate
4. New entities can be auto-created if needed

### Recent Improvements (March 21, 2025)

- Enhanced error messaging for Claude API failures
- Improved prompt for entity name resolution in broadcast rights
- Added fallback mechanisms for API interruptions
- Optimized context window usage for better performance
- Implemented better Claude error handling at service layer
- Enhanced streaming response buffering

## Usage Guidelines

1. **Rate Limiting**: System implements appropriate rate limiting
2. **Error Fallbacks**: UI provides graceful degradation if Claude is unavailable
3. **Prompt Security**: All prompts are validated to prevent injection attacks
4. **Authentication**: API keys are securely managed via environment variables
5. **Response Validation**: All Claude responses undergo validation before use

## Resources

- [Official Claude Documentation](https://docs.anthropic.com/claude/docs)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/guide-to-anthropics-prompt-engineering-resources)