# SheetGPT Production Readiness Guide

This document outlines the steps taken to prepare SheetGPT for production deployment, particularly focusing on security, performance, and reliability improvements.

## Environment-Specific Configuration

### Backend Environment Variables

The application now uses environment-specific settings with the `ENVIRONMENT` variable:

```python
# Environment setting
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
```

This controls various aspects of the application:

- Security settings (token expiry, cookie security)
- Database connection pooling
- CORS origins
- Logging levels and formats
- Cache control policies
- Error detail visibility

### Frontend Environment Configuration

The frontend now includes a production-specific environment file (`frontend/.env.production`):

```
VITE_API_URL=/api/v1
VITE_ENVIRONMENT=production
VITE_ENABLE_QUERY_VALIDATION=true
VITE_LOG_LEVEL=error
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_ANALYTICS=true
VITE_CACHE_TTL=300
VITE_MAX_UPLOAD_SIZE=5242880
VITE_ENABLE_SERVICE_WORKER=true
VITE_ENABLE_OFFLINE_MODE=true
```

## Security Enhancements

### Content Security Policy

A comprehensive Content Security Policy (CSP) has been implemented for production environments:

```python
response.headers["Content-Security-Policy"] = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline'; "  # Allow inline scripts for React
    "style-src 'self' 'unsafe-inline'; "   # Allow inline styles for React
    "img-src 'self' data: blob:; "         # Allow data URIs and blobs for images
    "font-src 'self'; "
    "connect-src 'self' https://api.anthropic.com; "
    "frame-ancestors 'none'; "             # Prevent embedding in iframes
    "form-action 'self'; "                 # Only allow forms to submit to same origin
    "upgrade-insecure-requests; "          # Upgrade HTTP to HTTPS
    "block-all-mixed-content"              # Block mixed content
)
```

### Security Headers

Additional security headers added to protect against common web vulnerabilities:

```python
response.headers["X-Content-Type-Options"] = "nosniff"
response.headers["X-XSS-Protection"] = "1; mode=block"
response.headers["X-Frame-Options"] = "DENY"
response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
```

### Rate Limiting

Added a rate limiting middleware that applies different limits based on endpoint types:

- 60 requests per minute for general API endpoints
- 10 requests per minute for authentication endpoints
- 30 requests per minute for data-intensive operations (sheets, exports)

Limits are tracked by client IP address with proper headers that indicate limits and remaining requests.

### Trusted Host Validation

Implemented TrustedHostMiddleware to ensure requests come from legitimate sources:

```python
if ENVIRONMENT == "production":
    # Parse allowed hosts from CORS origins, removing protocol
    allowed_hosts: List[str] = []
    for origin in settings.CORS_ORIGINS:
        if "://" in origin:
            host = origin.split("://")[1]
            allowed_hosts.append(host)
    
    if allowed_hosts:
        app.add_middleware(
            TrustedHostMiddleware, 
            allowed_hosts=allowed_hosts
        )
```

### Documentation Endpoints

Disabled interactive API documentation in production:

```python
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="An intelligent interface for structured conversations with Claude and spreadsheet integration",
    version="0.1.0",
    docs_url="/api/docs" if ENVIRONMENT != "production" else None,  # Disable docs in production
    redoc_url="/api/redoc" if ENVIRONMENT != "production" else None,  # Disable redoc in production
    openapi_url="/api/openapi.json" if ENVIRONMENT != "production" else None,  # Disable OpenAPI in production
)
```

### CORS Configuration

Strict CORS configuration with explicit method and header allowances:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],  # Be explicit about allowed methods
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],  # Be explicit about allowed headers
    expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    max_age=86400  # Cache preflight requests for 24 hours
)
```

## Performance Optimizations

### Compression Middleware

Added GZip compression for API responses in production:

```python
if ENVIRONMENT == "production":
    app.add_middleware(
        GZipMiddleware,
        minimum_size=1000  # Only compress responses larger than 1KB
    )
```

### Cache Control

Implemented intelligent caching strategy based on resource type and request method:

- Static assets: Long caching (up to 1 year for hashed resources)
- Read-only API endpoints: Short caching (5 minutes for sports data, 1 day for documentation)
- Dynamic endpoints: No caching
- Images: 1 day caching

### Database Connection Pooling

Optimized database connection pooling with environment-specific settings:

```python
DATABASE_POOL_SIZE: int = 20 if ENVIRONMENT == "production" else 5
DATABASE_MAX_OVERFLOW: int = 10 if ENVIRONMENT == "production" else 2
DATABASE_POOL_TIMEOUT: int = 30 if ENVIRONMENT == "production" else 15
```

## Observability Improvements

### Enhanced Logging

Comprehensive logging system with environment-specific configuration:

- Production: JSON-formatted logs with structured data for easier parsing
- Development: Human-readable logs with detailed context
- Log separation by type (app, error, debug, request, security)
- Environment-specific log paths and rotation policies

### Request Tracing

Implemented request tracing with unique request IDs that flow through the entire request lifecycle:

- Generated on request entry
- Added to request state for access by handlers
- Included in all logs related to the request
- Returned in response headers for client-side correlation
- Added to error responses for debugging

### Health Check Endpoint

Enhanced health check endpoint with comprehensive system diagnostics:

- Database connectivity testing with timing information
- Memory usage monitoring
- Disk space monitoring
- System information (platform, Python version)
- Application uptime tracking

### Request Logging

Detailed request logging with timing information:

```python
log_request(
    request_id=request_id,
    method=method,
    path=path,
    status_code=response.status_code,
    duration_ms=duration_ms,
    user_id=user_id,
    ip_address=client
)
```

### Security Event Logging

Dedicated security event logging for authentication and authorization failures:

```python
log_security_event(
    event_type="AUTHENTICATION_FAILURE",
    description=f"Authentication failed: {exc.message}",
    ip_address=client_ip,
    details={...}
)
```

## Error Handling

### Standardized Error Responses

All error responses now follow a consistent format with request tracing:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "status_code": 400,
  "details": {
    "request_id": "uuid4-identifier",
    "timestamp": "2025-04-01T12:34:56.789Z",
    "additional_context": "Additional error details"
  }
}
```

### Environment-Specific Error Details

Detailed error information is only included in development:

```python
# In development, include original error for debugging
if ENVIRONMENT != "production":
    error.details["original_error"] = error_message
    error_response["details"]["traceback"] = tb_str
```

### Enhanced Exception Handlers

Comprehensive exception handlers with proper logging and context:

- Custom application error handlers
- SQLAlchemy error handler
- Authentication/authorization error handlers with security logging
- Generic exception handler with traceback logging

## Application Lifecycle

### Startup and Shutdown Events

Implemented proper application lifecycle logging and management:

```python
@app.on_event("startup")
async def startup_event():
    """Execute startup tasks when the application starts."""
    app_logger.info("Application starting up")
    app.state.startup_time = datetime.utcnow()
    
    # Log environment information
    app_logger.info(f"Environment: {ENVIRONMENT}")
    app_logger.info(f"Debug mode: {settings.DEBUG}")
    app_logger.info(f"Platform: {platform.platform()}")
    app_logger.info(f"Python version: {sys.version.split()[0]}")

@app.on_event("shutdown")
async def shutdown_event():
    """Execute cleanup tasks when the application shuts down."""
    app_logger.info("Application shutting down")
    
    # Calculate uptime
    if hasattr(app.state, "startup_time"):
        uptime_seconds = (datetime.utcnow() - app.state.startup_time).total_seconds()
        app_logger.info(f"Application uptime: {uptime_seconds/3600:.2f} hours")
```

## Frontend Production Optimizations

- Service worker enablement for offline support
- Error reporting configuration
- Reduced log level in production
- Configurable cache TTL
- Upload size limitations
- Query validation for safer database operations

## Next Steps

- [ ] Set up automated database backups
- [ ] Configure advanced error monitoring (e.g., Sentry)
- [ ] Implement CI/CD pipeline with quality checks
- [ ] Add application metrics collection
- [ ] Set up alerting for critical system events
- [ ] Implement circuit breakers for external service calls
- [ ] Add load testing and performance benchmarks
- [ ] Create database query optimization checks
- [ ] Configure CDN for static assets
- [ ] Set up scheduled maintenance tasks
- [ ] Fix PostgreSQL SSL connection configuration (change ssl=true to sslmode=require)

## Deployment Checklist

1. Set all required environment variables
2. Verify database connection settings
3. Test authentication in production mode
4. Confirm CORS settings are correct for production domain
5. Check compression middleware is active
6. Verify rate limiting is functioning
7. Test health check endpoint provides required metrics
8. Ensure logs are being written to correct location
9. Confirm cache headers are set correctly
10. Verify security headers are applied properly
11. Test error handling returns standardized responses
12. Check frontend is loading with production settings
13. Verify database pooling is properly configured
14. Test CSP doesn't block legitimate resources
15. Confirm request tracing works across the system