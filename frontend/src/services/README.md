# Service Implementation with Development Fallbacks

## Overview

This directory contains service implementations for the SheetGPT frontend, with support for development fallbacks. The implementation allows the application to function even when the backend API is unavailable or experiencing issues.

## Key Components

- `index.ts` - Service switcher that determines whether to use real or mock implementations
- `SportsDatabaseService.ts` - Real implementation that connects to the backend API
- `SportsDatabaseService.mock.ts` - Mock implementation with hardcoded data for development

## How It Works

The service switcher in `index.ts` uses the following detection mechanism to determine which implementation to use:

1. **Global override**: Checks `window.FORCE_DEV_FALLBACKS === true`
2. **Environment variables**: Checks for `import.meta.env.VITE_ENABLE_DEV_FALLBACKS === 'true'` or `import.meta.env.VITE_MOCK_DATA === 'true'`
3. **Docker detection**: Checks if `window.location.hostname !== 'localhost'` (Docker container environments)

If any of these conditions are true, the mock implementation is used instead of the real one.

## Activating Development Fallbacks

You can activate development fallbacks in several ways:

### Method 1: Environment Variables

Set these variables in `.env.local`:

```
VITE_ENABLE_DEV_FALLBACKS=true
VITE_MOCK_DATA=true
```

### Method 2: Global Override

Add this to `index.html`:

```html
<script>
  window.FORCE_DEV_FALLBACKS = true;
  console.log('FORCE_DEV_FALLBACKS set to true in window global');
</script>
```

### Method 3: Docker Environment

Development fallbacks are automatically enabled when running in Docker container environments (when the hostname isn't 'localhost').

## Mock Data

The mock implementation provides pre-defined data for:

- Leagues (NFL, NBA, MLB, etc.)
- Divisions/Conferences
- Teams
- Stadiums
- Brands (Broadcasters, Production Companies)
- Games
- Broadcasts
- Game Broadcasts

These entities have relationships that mirror the real database schema, allowing for realistic testing of the application's functionality.

## Benefits

- **Development Resilience**: Frontend development can continue even when backend services are unavailable
- **Performance Testing**: Mock data provides consistent entities for performance testing
- **Offline Development**: Enables working on UI components without API access
- **Consistent Demo Environment**: Provides reliable data for demonstrations

## Implementation Guidelines

When adding new features:

1. Update both the real and mock service implementations
2. Ensure the mock implementation maintains consistent relationships between entities
3. Use the service switcher pattern for any new services that require development fallbacks