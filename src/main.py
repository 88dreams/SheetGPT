import os
import platform
import sys
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.sessions import SessionMiddleware
from typing import Dict, Any, List
from starlette.middleware.base import BaseHTTPMiddleware

from src.api.middleware.security import (
    add_security_headers, 
    add_cache_headers, 
    RequestLoggingMiddleware,
    RateLimitMiddleware
)

from src.api.routes import api as api_router
from src.api.middleware.error_handlers import setup_error_handlers
# Import with fallback mechanisms
try:
    from src.core.config import ENVIRONMENT, settings
except ImportError:
    import os
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    from src.core.config import settings

try:
    from src.config.logging_config import app_logger, api_logger, security_logger
except ImportError:
    import logging
    # Create loggers if they don't exist
    app_logger = logging.getLogger("sheetgpt")
    api_logger = logging.getLogger("sheetgpt.api")
    security_logger = logging.getLogger("sheetgpt.security")
from src.utils.errors import EntityValidationError

# Create FastAPI application with environment-appropriate settings
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="An intelligent interface for structured conversations with Claude and spreadsheet integration",
    version="0.1.0",
    docs_url="/api/docs" if ENVIRONMENT != "production" else None,  # Disable docs in production
    redoc_url="/api/redoc" if ENVIRONMENT != "production" else None,  # Disable redoc in production
    openapi_url="/api/openapi.json" if ENVIRONMENT != "production" else None,  # Disable OpenAPI in production
)

# A simple middleware to print every request path
class DebugRequestMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        print(f"DEBUG MIDDLEWARE: Received request for path: {request.url.path}")
        response = await call_next(request)
        return response

# Add the new debug middleware at the very top
app.add_middleware(DebugRequestMiddleware)

# Configure CORS with environment-specific origins
if ENVIRONMENT == "production":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],  # Be explicit about allowed methods
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],  # Be explicit about allowed headers
        expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
        max_age=86400  # Cache preflight requests for 24 hours
    )
    app_logger.info(f"Added CORS middleware with specific origins: {settings.CORS_ORIGINS}")
else:
    # In development, we need specific origins when using credentials
    development_origins = [
        "https://localhost:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=development_origins,  # Cannot use wildcard with credentials
        allow_credentials=True,
        allow_methods=["*"],  # Allow all methods
        allow_headers=["*"],  # Allow all headers
        expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
        max_age=86400  # Cache preflight requests for 24 hours
    )
    app_logger.info(f"Added CORS middleware with specific origins for development: {development_origins}")

# In production, add trusted host middleware
if ENVIRONMENT == "production":
    # Parse allowed hosts from CORS origins, removing protocol
    allowed_hosts: List[str] = []
    for origin in settings.CORS_ORIGINS:
        if "://" in origin:
            host = origin.split("://")[1]
            allowed_hosts.append(host)
    
    if allowed_hosts:
        # Include the IP-based hostnames for development testing
        allowed_hosts.extend(["*", "localhost"])
        app.add_middleware(
            TrustedHostMiddleware, 
            allowed_hosts=allowed_hosts
        )
        app_logger.info(f"Added TrustedHostMiddleware with allowed hosts: {allowed_hosts}")

# Add compression middleware for API responses in production
if ENVIRONMENT == "production":
    app.add_middleware(
        GZipMiddleware,
        minimum_size=1000  # Only compress responses larger than 1KB
    )
    app_logger.info("Added GZip compression middleware")

# Add session middleware to support session-based authentication
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=60 * 60 * 24,  # 1 day in seconds
    same_site="lax",
    https_only=settings.COOKIE_SECURE,
)
app_logger.info("Added session middleware")

# Add request logging middleware in all environments
app.add_middleware(RequestLoggingMiddleware)
app_logger.info("Added request logging middleware")

# Add rate limiting middleware in production
if ENVIRONMENT == "production":
    app.add_middleware(RateLimitMiddleware)
    app_logger.info("Added rate limiting middleware")

# Add security middleware
app.middleware("http")(add_security_headers)
app_logger.info("Added security headers middleware")

# Add cache control middleware
app.middleware("http")(add_cache_headers)
app_logger.info("Added cache control middleware")

# Add error handling middleware
@app.middleware("http")
async def errors_handling(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        # Generate request ID for traceability
        if not hasattr(request.state, "request_id"):
            import uuid
            request.state.request_id = str(uuid.uuid4())
            
        request_id = request.state.request_id
        api_logger.error(
            f"Middleware error: {str(exc)}", 
            exc_info=True,
            extra={"request_id": request_id}
        )
        
        # Ensure CORS headers are present in error responses
        response = JSONResponse(
            status_code=500,
            content={
                "error": "ServerError",
                "message": "Internal server error",
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            },
        )
        
        # Add request ID to response
        response.headers["X-Request-ID"] = request_id
        
        # Add CORS headers explicitly for error responses
        origin = request.headers.get('origin')
        # In production, check against whitelist; in development, allow all origins
        if origin and (ENVIRONMENT != "production" or origin in settings.CORS_ORIGINS):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers['Access-Control-Allow-Headers'] = "Authorization, Content-Type, X-Request-ID"
        
        return response

# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Generate request ID for traceability
    if not hasattr(request.state, "request_id"):
        import uuid
        request.state.request_id = str(uuid.uuid4())
        
    request_id = request.state.request_id
    api_logger.error(
        f"Validation error: {str(exc)}", 
        exc_info=True,
        extra={"request_id": request_id}
    )
    
    # Convert validation errors to our standardized format
    field_errors = {}
    for error in exc.errors():
        field_path = '.'.join(str(loc) for loc in error['loc'])
        field_errors[field_path] = error['msg']
    
    # Create a standardized validation error
    error = EntityValidationError(
        message="Request validation failed",
        field_errors=field_errors,
        details={
            "validation_errors": exc.errors(),
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    response = JSONResponse(
        status_code=error.status_code,
        content=error.to_dict(),
    )
    
    # Add request ID to response
    response.headers["X-Request-ID"] = request_id
    
    # Add CORS headers
    origin = request.headers.get('origin')
    # In production, check against whitelist; in development, allow all origins
    if origin and (ENVIRONMENT != "production" or origin in settings.CORS_ORIGINS):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers['Access-Control-Allow-Headers'] = "Authorization, Content-Type, X-Request-ID"
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Generate request ID for traceability
    if not hasattr(request.state, "request_id"):
        import uuid
        request.state.request_id = str(uuid.uuid4())
        
    request_id = request.state.request_id
    api_logger.error(
        f"HTTP error: {str(exc.detail)}", 
        exc_info=True,
        extra={"request_id": request_id}
    )
    
    # Map to our standardized format
    error_response = {
        "error": "HTTPException",
        "message": str(exc.detail),
        "details": {
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat()
        },
        "status_code": exc.status_code
    }
    
    response = JSONResponse(
        status_code=exc.status_code,
        content=error_response,
    )
    
    # Add request ID to response
    response.headers["X-Request-ID"] = request_id
    
    # Add CORS headers
    origin = request.headers.get('origin')
    # In production, check against whitelist; in development, allow all origins
    if origin and (ENVIRONMENT != "production" or origin in settings.CORS_ORIGINS):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers['Access-Control-Allow-Headers'] = "Authorization, Content-Type, X-Request-ID"
    return response

# Setup our customized error handlers
setup_error_handlers(app)

# Include API Router
app.include_router(
    api_router.router,
    prefix=settings.API_V1_PREFIX
)

# Mount the exports directory to serve static files
exports_dir = Path("data/exports")
if not exports_dir.exists():
    os.makedirs(exports_dir, exist_ok=True)
    app_logger.info(f"Created exports directory: {exports_dir.absolute()}")

app.mount("/api/v1/exports", StaticFiles(directory=exports_dir), name="exports")
app_logger.info(f"Mounted exports directory: {exports_dir.absolute()}")

# API info endpoint
@app.get("/api")
async def api_info() -> Dict[str, str]:
    """API information endpoint."""
    app_logger.info("API info endpoint accessed")
    return {
        "name": settings.PROJECT_NAME,
        "version": "0.1.0",
        "status": "operational",
        "environment": ENVIRONMENT
    }

# Check for frontend build directory and serve frontend if available
frontend_dist = Path("frontend/dist")
if frontend_dist.exists() and frontend_dist.is_dir():
    app_logger.info(f"Found frontend build at {frontend_dist.absolute()}")
    
    # Mount static files from frontend build
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="static")
    app_logger.info("Mounted frontend assets")
    
    @app.get("/", include_in_schema=False)
    async def serve_frontend():
        """Serve the frontend index.html"""
        app_logger.info("Serving frontend index.html")
        return FileResponse(frontend_dist / "index.html")
    
    # Handle all frontend routes to enable client-side routing
    @app.get("/{path:path}", include_in_schema=False)
    async def serve_frontend_paths(path: str):
        # If path starts with "api", let it fall through to the API routes
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
            
        # Check if the path exists as a static file
        file_path = frontend_dist / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
            
        # Otherwise serve index.html for client-side routing
        app_logger.info(f"Serving index.html for client-side route: /{path}")
        return FileResponse(frontend_dist / "index.html")
else:
    app_logger.warning(f"Frontend build not found at {frontend_dist.absolute()}")
    
    # Fallback if frontend build doesn't exist
    @app.get("/")
    async def root() -> Dict[str, str]:
        """Root endpoint returning API information."""
        app_logger.info("Root endpoint accessed (frontend not found)")
        return {
            "name": settings.PROJECT_NAME,
            "version": "0.1.0",
            "status": "operational",
            "environment": ENVIRONMENT,
            "frontend_status": "not found at " + str(frontend_dist.absolute())
        }

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint with comprehensive system diagnostics."""
    app_logger.info("Health check endpoint accessed")
    
    # System information
    system_info = {
        "platform": platform.platform(),
        "python_version": sys.version.split()[0],
        "process_id": os.getpid()
    }
    
    # Database connection check
    db_connection = {"status": "unknown", "details": None}
    try:
        # Simple database connectivity check
        from sqlalchemy import text, create_engine
        from src.utils.database import SQLALCHEMY_DATABASE_URL
        
        sync_engine = create_engine(SQLALCHEMY_DATABASE_URL)

        start_time = datetime.utcnow()
        with sync_engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            db_healthy = result.scalar() == 1
            
            # Get database version
            db_version = conn.execute(text("SELECT version()")).scalar()
            
            # Calculate query time
            query_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            
        db_connection = {
            "status": "connected" if db_healthy else "error",
            "query_time_ms": round(query_time_ms, 2),
            "version": db_version
        }
    except Exception as e:
        app_logger.error(f"Database health check failed: {str(e)}", exc_info=True)
        db_connection = {
            "status": "disconnected",
            "error": str(e)
        }
        
    # Memory usage
    memory_info = {"status": "unknown"}
    try:
        import psutil
        process = psutil.Process()
        memory = process.memory_info()
        
        memory_info = {
            "status": "available",
            "rss_mb": round(memory.rss / (1024 * 1024), 2),
            "vms_mb": round(memory.vms / (1024 * 1024), 2),
            "percent": round(process.memory_percent(), 2),
            "cpu_percent": round(process.cpu_percent(interval=0.1), 2),
            "threads": len(process.threads())
        }
    except ImportError:
        memory_info = {"status": "psutil not available"}
    except Exception as e:
        memory_info = {
            "status": "error",
            "error": str(e)
        }
        
    # Check disk space
    disk_info = {"status": "unknown"}
    try:
        import shutil
        total, used, free = shutil.disk_usage("/")
        disk_info = {
            "status": "available",
            "total_gb": round(total / (1024**3), 2),
            "used_gb": round(used / (1024**3), 2),
            "free_gb": round(free / (1024**3), 2),
            "percent_used": round(used * 100 / total, 2)
        }
    except Exception as e:
        disk_info = {
            "status": "error",
            "error": str(e)
        }
    
    # Overall status
    overall_status = "healthy"
    if db_connection.get("status") != "connected":
        overall_status = "unhealthy"
    if memory_info.get("status") == "error":
        overall_status = "degraded"
    
    percent_used = float(disk_info.get("percent_used", 0))
    free_gb = float(disk_info.get("free_gb", 0))

    if disk_info.get("status") == "error" or (
        percent_used > 90 and free_gb < 1
    ):
        overall_status = "degraded"
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "environment": ENVIRONMENT,
        "database": db_connection,
        "system": system_info,
        "memory": memory_info,
        "disk": disk_info,
        "uptime_hours": round((datetime.utcnow() - app.state.startup_time).total_seconds() / 3600, 2)
        if hasattr(app.state, "startup_time") else None
    }

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
    
    # Log security information without sensitive details
    security_logger.info(
        "Application security initialized",
        extra={
            "cors_origins_count": len(settings.CORS_ORIGINS),
            "has_auth_key": bool(settings.SECRET_KEY != "dev_secret_key"),
            "token_expiry_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            "cookie_secure": settings.COOKIE_SECURE,
        }
    )

@app.on_event("shutdown")
async def shutdown_event():
    """Execute cleanup tasks when the application shuts down."""
    app_logger.info("Application shutting down")
    
    # Calculate uptime
    if hasattr(app.state, "startup_time"):
        uptime_seconds = (datetime.utcnow() - app.state.startup_time).total_seconds()
        app_logger.info(f"Application uptime: {uptime_seconds/3600:.2f} hours")

if __name__ == "__main__":
    import uvicorn
    app_logger.info("Starting application server")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )