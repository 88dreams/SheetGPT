import os
import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from src.core.config import ENVIRONMENT, settings
from src.config.logging_config import log_request, log_security_event

async def add_security_headers(request: Request, call_next):
    """Add security headers to responses in production."""
    response = await call_next(request)
    
    if ENVIRONMENT == "production":
        # CSP Headers for production with enhanced security
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
        
        # Other security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        
    return response

async def add_cache_headers(request: Request, call_next):
    """Add appropriate cache headers based on resource type and method."""
    response = await call_next(request)
    
    path = request.url.path
    method = request.method
    
    # Don't cache API responses by default
    cache_control = "no-store, max-age=0"
    
    if ENVIRONMENT == "production":
        # Static resources can be cached longer
        if path.startswith("/static/"):
            # Use versioning or hashes in filenames for better caching
            if any(path.endswith(ext) for ext in [".js", ".css"]):
                # Longest cache for bundled assets with hash in filename
                if "." in path.split("/")[-1]:
                    cache_control = "public, max-age=31536000, immutable"
                else:
                    # One week for other static assets
                    cache_control = "public, max-age=604800"
            else:
                # One month for other static assets
                cache_control = "public, max-age=2592000"
                
        # Read-only API endpoints can have short caches
        elif method == "GET":
            if path.startswith("/api/v1/sports/"):
                # Sports data can be cached briefly (5 minutes)
                cache_control = "private, max-age=300, must-revalidate"
            elif path.startswith("/api/v1/docs/"):
                # Documentation can be cached longer (1 day)
                cache_control = "public, max-age=86400"
            elif not any(sensitive in path for sensitive in ["/auth/", "/user/", "/chat/"]):
                # Other read-only endpoints - very short cache (1 minute)
                cache_control = "private, max-age=60, must-revalidate"
                
        # Images can be cached
        elif any(path.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"]):
            cache_control = "public, max-age=86400"  # 1 day
            
    # Set cache control header
    response.headers["Cache-Control"] = cache_control
    
    # Add Vary header for better caching
    response.headers["Vary"] = "Accept, Accept-Encoding"
    
    return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging API requests with timing and request ID tracking."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Store request ID in request state for access by route handlers
        request.state.request_id = request_id
        
        # Extract basic request information
        method = request.method
        path = request.url.path
        client = request.client.host if request.client else None
        
        # Extract user ID if available (will be populated by auth middleware)
        user_id = None
        if hasattr(request.state, "user") and request.state.user:
            user_id = str(request.state.user.id)
        
        # Record start time
        start_time = time.time()
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = round((time.time() - start_time) * 1000, 2)
            
            # Add request ID to response headers for client-side correlation
            response.headers["X-Request-ID"] = request_id
            
            # Log regular requests
            log_request(
                request_id=request_id,
                method=method,
                path=path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                user_id=user_id,
                ip_address=client
            )
            
            # Log potential security events
            if response.status_code == 401:
                log_security_event(
                    event_type="AUTHENTICATION_FAILURE",
                    description=f"Authentication failed for path: {path}",
                    user_id=user_id,
                    ip_address=client
                )
            elif response.status_code == 403:
                log_security_event(
                    event_type="AUTHORIZATION_FAILURE",
                    description=f"Authorization failed for path: {path}",
                    user_id=user_id,
                    ip_address=client
                )
            elif response.status_code == 429:
                log_security_event(
                    event_type="RATE_LIMIT_EXCEEDED",
                    description=f"Rate limit exceeded for path: {path}",
                    user_id=user_id,
                    ip_address=client
                )
                
            return response
            
        except Exception as exc:
            # Calculate duration even for exceptions
            duration_ms = round((time.time() - start_time) * 1000, 2)
            
            # Log the exception request
            log_request(
                request_id=request_id,
                method=method,
                path=path,
                status_code=500,  # Assumed to be a server error
                duration_ms=duration_ms,
                user_id=user_id,
                ip_address=client
            )
            
            # Re-raise the exception for the global exception handler
            raise

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting API requests in production."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.rate_limits = {}
        # Default rate limits (requests per minute)
        self.default_limit = 60
        self.auth_limit = 10
        self.sheet_limit = 30
        
    async def dispatch(self, request: Request, call_next):
        # Only apply rate limiting in production
        if ENVIRONMENT != "production":
            return await call_next(request)
            
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        
        # Determine rate limit based on path
        limit = self.default_limit
        if "/auth/" in path:
            limit = self.auth_limit
        elif "/sheets/" in path or "/export/" in path:
            limit = self.sheet_limit
            
        # Check if client has exceeded rate limit
        current_time = int(time.time() / 60)  # Current minute
        rate_key = f"{client_ip}:{current_time}"
        
        if rate_key in self.rate_limits:
            self.rate_limits[rate_key] += 1
            if self.rate_limits[rate_key] > limit:
                # Log rate limit event
                user_id = None
                if hasattr(request.state, "user") and request.state.user:
                    user_id = str(request.state.user.id)
                    
                log_security_event(
                    event_type="RATE_LIMIT_EXCEEDED",
                    description=f"Rate limit exceeded ({self.rate_limits[rate_key]}/{limit}): {path}",
                    user_id=user_id,
                    ip_address=client_ip
                )
                
                # Return rate limit response
                return Response(
                    content={"error": "Rate limit exceeded"},
                    status_code=429,
                    headers={
                        "Retry-After": "60",
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str((current_time + 1) * 60)
                    }
                )
        else:
            self.rate_limits[rate_key] = 1
            
            # Clean up old entries (from previous minutes)
            self.rate_limits = {k: v for k, v in self.rate_limits.items() 
                               if k.split(":")[1] == str(current_time)}
                
        # Add rate limit headers
        response = await call_next(request)
        remaining = max(0, limit - self.rate_limits.get(rate_key, 0))
        
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str((current_time + 1) * 60)
        
        return response