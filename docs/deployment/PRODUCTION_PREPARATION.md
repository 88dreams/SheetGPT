# Production Preparation Checklist

This document outlines all necessary changes to transition SheetGPT from development to production environment.

## Table of Contents

1. [Environment Configuration](#1-environment-configuration)
2. [Security Hardening](#2-security-hardening)
3. [Database Configuration](#3-database-configuration)
4. [Logging Configuration](#4-logging-configuration)
5. [Frontend Build Optimization](#5-frontend-build-optimization)
6. [Performance Enhancements](#6-performance-enhancements)
7. [Error Handling](#7-error-handling)
8. [API Validation](#8-api-validation)
9. [Monitoring Setup](#9-monitoring-setup)
10. [Hard-coded Value Check](#10-hard-coded-value-check)
11. [Pre-Deployment Testing](#11-pre-deployment-testing)
12. [Implementation Workflow](#12-implementation-workflow)

---

## 1. Environment Configuration

### API Base URL Configuration

Update frontend API client to use environment-based URLs:

```typescript
// Path: frontend/src/utils/apiClient.ts

// Change from:
const API_BASE_URL = 'http://localhost:8000/api/v1';

// To:
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
```

### Environment Variables Files

Create `.env.production` in frontend directory:

```
VITE_API_URL=/api/v1
VITE_ENVIRONMENT=production
```

### Authentication Settings

Update security settings for production:

```python
# Path: src/utils/security.py

# JWT Settings
ACCESS_TOKEN_EXPIRE_MINUTES = 15 if ENVIRONMENT == "production" else 60
REFRESH_TOKEN_EXPIRE_DAYS = 30 if ENVIRONMENT == "production" else 7

# Cookie Settings
COOKIE_SETTINGS = {
    "secure": ENVIRONMENT == "production",  # Only transmit over HTTPS
    "httponly": True,
    "samesite": "strict" if ENVIRONMENT == "production" else "lax",
    "max_age": 60 * 60 * 24 * 30 if ENVIRONMENT == "production" else 60 * 60 * 24
}
```

---

## 2. Security Hardening

### Update CORS Settings

```python
# Path: src/main.py or similar

# Change from:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# To:
from src.core.config import ENVIRONMENT

allowed_origins = ["https://yourdomain.com"] if ENVIRONMENT == "production" else ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Remove Debug Settings

```python
# Path: src/main.py or similar

# Disable debug mode in production
DEBUG = False if ENVIRONMENT == "production" else True

# Conditional debug routes
if ENVIRONMENT != "production":
    app.include_router(debug_router)
```

### API Rate Limiting

```python
# Path: src/main.py or similar middleware config

# Add rate limiting in production
if ENVIRONMENT == "production":
    from src.api.middleware.rate_limit import RateLimitingMiddleware
    
    app.add_middleware(
        RateLimitingMiddleware,
        calls_per_minute=60
    )
```

### Add Content Security Policy

```python
# Path: src/api/middleware/security.py

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    if ENVIRONMENT == "production":
        # CSP Headers for production
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.anthropic.com;"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
    return response
```

---

## 3. Database Configuration

### Connection Pool Settings

```python
# Path: src/utils/database.py

# Adjust database pool settings based on environment
if ENVIRONMENT == "production":
    DATABASE_POOL_SIZE = 20
    DATABASE_MAX_OVERFLOW = 10
    DATABASE_POOL_TIMEOUT = 30
else:
    DATABASE_POOL_SIZE = 5
    DATABASE_MAX_OVERFLOW = 2
    DATABASE_POOL_TIMEOUT = 15

engine = create_engine(
    DATABASE_URL,
    pool_size=DATABASE_POOL_SIZE,
    max_overflow=DATABASE_MAX_OVERFLOW,
    pool_timeout=DATABASE_POOL_TIMEOUT
)
```

### Database Connection Retry Logic

```python
# Path: src/utils/database.py

def get_db_connection():
    retries = 5 if ENVIRONMENT == "production" else 1
    retry_delay = 2  # seconds
    
    for attempt in range(retries):
        try:
            connection = engine.connect()
            return connection
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(retry_delay)
                continue
            raise
```

### Migration Check

Before deploying:

```bash
# Create migration for any pending changes
alembic revision --autogenerate -m "pre_production_updates"

# Apply and test migrations locally
alembic upgrade head
```

---

## 4. Logging Configuration

### Update Logging Settings

```python
# Path: src/config/logging_config.py

import os
from src.core.config import ENVIRONMENT

# Base logging configuration
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        },
        "json": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "class": "pythonjsonlogger.jsonlogger.JsonFormatter"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "DEBUG",
            "formatter": "standard",
            "stream": "ext://sys.stdout"
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "INFO",
            "formatter": "standard",
            "filename": "/var/log/sheetgpt/app.log" if ENVIRONMENT == "production" else "logs/app.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 10
        },
        "json": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "WARNING",
            "formatter": "json",
            "filename": "/var/log/sheetgpt/app.json" if ENVIRONMENT == "production" else "logs/app.json",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 10
        }
    },
    "loggers": {
        "": {
            "handlers": ["console", "file"],
            "level": "WARNING" if ENVIRONMENT == "production" else "DEBUG",
            "propagate": True
        },
        "src": {
            "handlers": ["console", "file", "json"] if ENVIRONMENT == "production" else ["console", "file"],
            "level": "INFO" if ENVIRONMENT == "production" else "DEBUG",
            "propagate": False
        },
        "uvicorn": {
            "handlers": ["json"] if ENVIRONMENT == "production" else ["console"],
            "level": "WARNING" if ENVIRONMENT == "production" else "INFO",
            "propagate": False
        }
    }
}

# Make sure log directories exist
os.makedirs("/var/log/sheetgpt", exist_ok=True) if ENVIRONMENT == "production" else os.makedirs("logs", exist_ok=True)
```

---

## 5. Frontend Build Optimization

### Update Vite Configuration

```typescript
// Path: frontend/vite.config.ts

export default defineConfig(({ mode }) => ({
  build: {
    minify: mode === 'production',
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        manualChunks: mode === 'production' ? {
          vendor: ['react', 'react-dom'],
          ui: ['antd'],
          // Add other chunks as needed
        } : undefined,
      },
    },
    chunkSizeWarningLimit: 1000, // Increase from default
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  // Other settings...
}));
```

### Remove Development Components

```typescript
// Path: frontend/src/App.tsx or similar

// Change from:
return (
  <Layout>
    <NavBar />
    <MainContent />
    <DebugPanel />
  </Layout>
);

// To:
return (
  <Layout>
    <NavBar />
    <MainContent />
    {import.meta.env.MODE === 'development' && <DebugPanel />}
  </Layout>
);
```

### Add Production Config Check

```typescript
// Path: frontend/src/main.tsx or similar

if (import.meta.env.PROD) {
  console.log = () => {}; // Disable console.log in production
}

// Validate environment config
const validateConfig = () => {
  const requiredVars = ['VITE_API_URL', 'VITE_ENVIRONMENT'];
  
  for (const v of requiredVars) {
    if (!import.meta.env[v] && import.meta.env.PROD) {
      console.error(`Missing required environment variable: ${v}`);
    }
  }
};

validateConfig();
```

---

## 6. Performance Enhancements

### Add Caching Headers

```python
# Path: src/api/middleware/cache.py

@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    response = await call_next(request)
    
    if ENVIRONMENT == "production":
        if request.url.path.startswith("/static/"):
            # Static assets - cache for 1 year
            response.headers["Cache-Control"] = "public, max-age=31536000"
        elif request.url.path.startswith("/api/v1/sports/") and request.method == "GET":
            # Read-only API endpoints - cache for 5 minutes
            response.headers["Cache-Control"] = "private, max-age=300"
        else:
            # Default - no caching for API endpoints
            response.headers["Cache-Control"] = "no-store, max-age=0"
    
    return response
```

### Add API Response Compression

```python
# Path: src/main.py

from fastapi.middleware.gzip import GZipMiddleware

# Add compression for API responses in production
if ENVIRONMENT == "production":
    app.add_middleware(
        GZipMiddleware,
        minimum_size=1000  # Only compress responses larger than 1KB
    )
```

### Optimize Database Queries

Add indexes to frequently queried fields:

```python
# Path: src/models/sports_models.py

class League(Base):
    __tablename__ = "leagues"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)  # Add index for frequent name lookups
    sport = Column(String, nullable=False, index=True)  # Add index for sport filtering
```

---

## 7. Error Handling

### Add Production Error Handler

```python
# Path: src/api/middleware/error_handlers.py

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    error_id = str(uuid.uuid4())
    log_context = {
        "request_path": request.url.path,
        "error_id": error_id,
        "client_ip": request.client.host
    }
    
    if ENVIRONMENT == "production":
        # Log full error details but return minimal info to user
        logger.error(
            f"Unhandled exception: {str(exc)}",
            exc_info=exc,
            extra=log_context
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal server error",
                "error_id": error_id,
                "message": "An unexpected error occurred. Our team has been notified."
            }
        )
    else:
        # In development, return full error details
        logger.error(f"Development error:", exc_info=exc)
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": str(exc),
                "error_id": error_id,
                "traceback": traceback.format_exc(),
                "request_path": request.url.path
            }
        )
```

### Frontend Error Boundary

```tsx
// Path: frontend/src/components/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service in production
    if (import.meta.env.PROD) {
      console.error('Error caught by boundary:', error);
      // Send to error monitoring service
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="error-boundary p-4 border border-red-300 rounded bg-red-50">
          <h2 className="text-red-800 text-lg font-semibold">Something went wrong</h2>
          <p className="text-red-700 mt-2">
            {import.meta.env.PROD 
              ? 'The application encountered an unexpected error. Please try again or contact support.'
              : this.state.error?.message}
          </p>
          <button 
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use in App.tsx:

```tsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
```

---

## 8. API Validation

### Stricter Validation in Production

```python
# Path: src/api/middleware/validation.py

class StrictValidationMiddleware:
    async def __call__(self, request: Request, call_next):
        try:
            # In production, be strict about validation
            response = await call_next(request)
            return response
        except pydantic.ValidationError as e:
            if ENVIRONMENT == "production":
                # Log the error with request details
                logger.warning(
                    f"Validation error: {str(e)}",
                    extra={
                        "path": request.url.path,
                        "method": request.method,
                        "client_ip": request.client.host,
                    }
                )
                
                # Return standardized error format without details
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={
                        "error": "Validation Error",
                        "message": "The request contains invalid data."
                    }
                )
            else:
                # In development, return detailed errors
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={
                        "error": "Validation Error",
                        "message": str(e),
                        "details": e.errors()
                    }
                )

# Add in main.py
if ENVIRONMENT == "production":
    app.add_middleware(StrictValidationMiddleware)
```

---

## 9. Monitoring Setup

### Add Health Check Endpoint

```python
# Path: src/api/routes/health.py

from fastapi import APIRouter, Depends
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db

router = APIRouter()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint that verifies database connectivity"""
    
    # Check database connection
    try:
        result = await db.execute("SELECT 1")
        db_healthy = result.scalar() == 1
    except Exception as e:
        db_healthy = False
        
    # Basic memory usage check
    memory_info = {}
    try:
        import psutil
        process = psutil.Process()
        memory_info = {
            "rss_mb": process.memory_info().rss / (1024 * 1024),
            "percent": process.memory_percent()
        }
    except ImportError:
        memory_info = {"status": "psutil not available"}
    
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database": "connected" if db_healthy else "disconnected",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": ENVIRONMENT,
        "memory": memory_info
    }

# Add to main.py
app.include_router(health_router, prefix="/health", tags=["health"])
```

### Add Structured Request Logging

```python
# Path: src/api/middleware/logging.py

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    # Only log in production or if explicitly enabled in dev
    if ENVIRONMENT == "production" or DEBUG_REQUEST_LOGGING:
        process_time = time.time() - start_time
        
        log_data = {
            "path": request.url.path,
            "method": request.method,
            "status_code": response.status_code,
            "process_time_ms": round(process_time * 1000, 2),
            "client_ip": request.client.host,
            "user_agent": request.headers.get("user-agent", "")
        }
        
        # Only log details for errors
        if 400 <= response.status_code < 600:
            logger.warning(f"HTTP {response.status_code} error", extra=log_data)
        else:
            # For successful requests, log at INFO level
            logger.info(f"HTTP {response.status_code}", extra=log_data)
    
    return response
```

---

## 10. Hard-coded Value Check

Run these commands to find potential hard-coded values:

```bash
# Search for localhost URLs
grep -r "localhost" --include="*.py" --include="*.tsx" --include="*.ts" .

# Search for http:// URLs (which should be https:// in production)
grep -r "http://" --include="*.py" --include="*.tsx" --include="*.ts" .

# Search for potential hardcoded secrets
grep -r "key\|secret\|password\|token" --include="*.py" --include="*.tsx" --include="*.ts" .

# Search for DEBUG, DEVELOPMENT, etc.
grep -r "DEBUG\|DEVELOPMENT" --include="*.py" --include="*.tsx" --include="*.ts" .
```

Common places to check:

1. API client configurations
2. Database connection strings  
3. Authentication settings
4. File path references
5. External service URLs
6. Test credentials

---

## 11. Pre-Deployment Testing

### Test Production Build Locally

```bash
# Test backend with production settings
export ENVIRONMENT=production
export DEBUG=False
uvicorn src.main:app --host 0.0.0.0 --port 8000

# Test frontend production build
cd frontend
npm run build
npx serve -s dist
```

### Test Database Migrations

```bash
# Create a test database
createdb sheetgpt_test

# Run migrations
DATABASE_URL=postgresql://localhost/sheetgpt_test alembic upgrade head
```

### Security Testing

Run basic security checks:

```bash
# Install security scanning tools
pip install bandit safety

# Run security scans
bandit -r ./src
safety check

# For frontend
cd frontend
npm audit
```

---

## 12. Implementation Workflow

Follow this workflow to implement these changes:

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/production-readiness
   ```

2. **Make Changes Incrementally**
   - Environment Configuration
   - Security Settings
   - Database Configuration
   - Error Handling
   - Performance Optimizations
   - etc.

3. **Test Each Section**
   - Verify settings work in both dev and production modes
   - Test with ENVIRONMENT=production locally
   - Ensure dev workflow still functions

4. **Create Pull Request**
   - Detailed description of changes
   - Checklist of completed items
   - Testing process followed

5. **After Deployment**
   - Verify health check endpoint
   - Check logging configuration
   - Confirm security headers
   - Test authentication flows
   - Monitor performance

---

## Notes

- **Environment Variable Management**: Store all production credentials in Digital Ocean App Platform environment variables, not in code
- **Database Backup**: Perform a backup before deploying these changes
- **Gradual Rollout**: Consider deploying to a staging environment first
- **Database SSL**: Ensure database connections use SSL in production
- **API Versioning**: Consider implementing API versioning if not already present