import os
import json
import logging
import logging.config
import logging.handlers
import socket
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from pathlib import Path
import time
from datetime import datetime
from typing import Dict, Any, Optional
from src.core.config import ENVIRONMENT, settings

# Create appropriate logs directory based on environment
if ENVIRONMENT == "production":
    # In production, use /var/log/sheetgpt if possible, otherwise fallback
    try:
        LOGS_DIR = Path("/var/log/sheetgpt")
        LOGS_DIR.mkdir(exist_ok=True, parents=True)
    except PermissionError:
        # Fallback to local logs directory if /var/log isn't writable
        LOGS_DIR = Path("logs")
        LOGS_DIR.mkdir(exist_ok=True)
else:
    # In development, use local logs directory
    LOGS_DIR = Path("logs")
    LOGS_DIR.mkdir(exist_ok=True)

# Configuration constants based on environment
if ENVIRONMENT == "production":
    # Production settings
    MAX_LOG_FILES = 30  # Keep more history in production
    MAX_BYTES = 25 * 1024 * 1024  # 25MB per file in production
    BACKUP_COUNT = 10  # Keep 10 backup files
    LOG_LEVEL = settings.LOG_LEVEL  # From settings (WARNING by default)
    CONSOLE_LOG_LEVEL = "WARNING"  # Less verbose console output in production
else:
    # Development settings
    MAX_LOG_FILES = 10
    MAX_BYTES = 10 * 1024 * 1024  # 10MB per file
    BACKUP_COUNT = 3  # Fewer backups in development
    LOG_LEVEL = settings.LOG_LEVEL  # From settings (DEBUG by default)
    CONSOLE_LOG_LEVEL = "INFO"  # More verbose console output in development

# Log file paths with environment-specific naming
def get_log_paths() -> Dict[str, Path]:
    """Get log file paths with appropriate naming based on environment"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    hostname = socket.gethostname()
    
    if ENVIRONMENT == "production":
        # In production, include hostname in log files for multi-server setups
        return {
            'app': LOGS_DIR / f"app_{hostname}.log",
            'error': LOGS_DIR / f"error_{hostname}.log",
            'debug': LOGS_DIR / f"debug_{hostname}.log", 
            'chat': LOGS_DIR / f"chat_{hostname}.log",
            'request': LOGS_DIR / f"request_{hostname}.log",
            'security': LOGS_DIR / f"security_{hostname}.log"
        }
    else:
        # In development, use timestamp for easier debugging
        return {
            'app': LOGS_DIR / f"app_{timestamp}.log",
            'error': LOGS_DIR / f"error_{timestamp}.log",
            'debug': LOGS_DIR / f"debug_{timestamp}.log",
            'chat': LOGS_DIR / f"chat_{timestamp}.log",
            'request': LOGS_DIR / f"request_{timestamp}.log"
        }

# Create appropriate formatters based on environment
if ENVIRONMENT == "production":
    # JSON formatter for structured logging in production
    class JsonFormatter(logging.Formatter):
        """JSON log formatter for structured logging in production"""
        
        def format(self, record: logging.LogRecord) -> str:
            log_data = {
                "timestamp": datetime.fromtimestamp(record.created).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "hostname": socket.gethostname(),
                "environment": ENVIRONMENT,
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno
            }
            
            # Add exception info if present
            if record.exc_info:
                log_data["exception"] = {
                    "type": record.exc_info[0].__name__,
                    "message": str(record.exc_info[1]),
                    "traceback": self.formatException(record.exc_info)
                }
                
            # Add any extra attributes
            for key, value in record.__dict__.items():
                if key not in [
                    'args', 'asctime', 'created', 'exc_info', 'exc_text', 'filename',
                    'funcName', 'id', 'levelname', 'levelno', 'lineno', 'module',
                    'msecs', 'message', 'msg', 'name', 'pathname', 'process',
                    'processName', 'relativeCreated', 'stack_info', 'thread', 'threadName'
                ] and not key.startswith('_'):
                    log_data[key] = value
                    
            return json.dumps(log_data)
    
    # Use JSON formatter for file logs in production
    LOG_FORMAT = JsonFormatter()
    
    # Keep human-readable format for console logs
    CONSOLE_FORMAT = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
else:
    # Simpler formatter for development
    LOG_FORMAT = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    CONSOLE_FORMAT = LOG_FORMAT

def cleanup_old_logs():
    """Keep only the most recent MAX_LOG_FILES log files for each type."""
    for prefix in ['app_', 'error_', 'debug_', 'chat_', 'request_', 'security_']:
        # Get all log files of this type
        log_files = sorted(
            [f for f in LOGS_DIR.glob(f"{prefix}*.log")],
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )
        
        # Remove older files beyond MAX_LOG_FILES
        for old_file in log_files[MAX_LOG_FILES:]:
            try:
                old_file.unlink()
            except Exception as e:
                print(f"Error deleting old log file {old_file}: {e}")

class RequestContextFilter(logging.Filter):
    """Add request-specific context to log records when available."""
    
    def __init__(self, request_id_var: str = 'request_id'):
        super().__init__()
        self.request_id_var = request_id_var
        self._thread_local_storage = {}
        
    def set_context(self, request_id: str, user_id: Optional[str] = None, 
                   ip_address: Optional[str] = None, path: Optional[str] = None):
        """Set context for the current request."""
        import threading
        thread_id = threading.get_ident()
        self._thread_local_storage[thread_id] = {
            'request_id': request_id,
            'user_id': user_id,
            'ip_address': ip_address,
            'path': path
        }
        
    def clear_context(self):
        """Clear context after request is complete."""
        import threading
        thread_id = threading.get_ident()
        if thread_id in self._thread_local_storage:
            del self._thread_local_storage[thread_id]
            
    def filter(self, record):
        """Add request context to log record."""
        import threading
        thread_id = threading.get_ident()
        if thread_id in self._thread_local_storage:
            for key, value in self._thread_local_storage[thread_id].items():
                setattr(record, key, value)
        return True

# Create a single instance of the request context filter
request_filter = RequestContextFilter()

def setup_logger(name: str) -> logging.Logger:
    """Set up a logger with environment-appropriate handlers and formatting."""
    logger = logging.getLogger(name)
    
    # Set base log level from configuration
    log_level = getattr(logging, LOG_LEVEL)
    logger.setLevel(log_level)

    # Prevent duplicate handlers
    if logger.handlers:
        return logger

    # Clean up old log files before creating new ones
    cleanup_old_logs()

    # Get current log paths
    log_paths = get_log_paths()

    # Console Handler (level based on environment)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, CONSOLE_LOG_LEVEL))
    console_handler.setFormatter(CONSOLE_FORMAT)
    logger.addHandler(console_handler)

    # App Log Handler
    if ENVIRONMENT == "production":
        # In production, use timed rotating handler for daily rotation
        app_handler = TimedRotatingFileHandler(
            log_paths['app'],
            when='midnight',
            interval=1,
            backupCount=BACKUP_COUNT
        )
    else:
        # In development, use size-based rotation
        app_handler = RotatingFileHandler(
            log_paths['app'],
            maxBytes=MAX_BYTES,
            backupCount=BACKUP_COUNT
        )
    app_handler.setLevel(logging.INFO)
    app_handler.setFormatter(LOG_FORMAT)
    logger.addHandler(app_handler)

    # Error Log Handler (ERROR and above)
    error_handler = RotatingFileHandler(
        log_paths['error'],
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(LOG_FORMAT)
    logger.addHandler(error_handler)

    # Debug Log Handler (DEBUG and above)
    # Only add in development or if explicitly requested in production
    if ENVIRONMENT != "production" or LOG_LEVEL == "DEBUG":
        debug_handler = RotatingFileHandler(
            log_paths['debug'],
            maxBytes=MAX_BYTES,
            backupCount=BACKUP_COUNT
        )
        debug_handler.setLevel(logging.DEBUG)
        debug_handler.setFormatter(LOG_FORMAT)
        logger.addHandler(debug_handler)

    # Chat Log Handler (specific to chat operations)
    if 'chat' in name:
        chat_handler = RotatingFileHandler(
            log_paths['chat'],
            maxBytes=MAX_BYTES,
            backupCount=BACKUP_COUNT
        )
        chat_handler.setLevel(logging.INFO)
        chat_handler.setFormatter(LOG_FORMAT)
        logger.addHandler(chat_handler)
        
    # Request Log Handler (for API requests)
    if 'api' in name:
        request_handler = RotatingFileHandler(
            log_paths['request'],
            maxBytes=MAX_BYTES,
            backupCount=BACKUP_COUNT
        )
        request_handler.setLevel(logging.INFO)
        request_handler.setFormatter(LOG_FORMAT)
        # Add request context filter
        request_handler.addFilter(request_filter)
        logger.addHandler(request_handler)
        
    # Security Log Handler (for security events in production)
    if ENVIRONMENT == "production" and ('security' in name or 'auth' in name):
        security_handler = RotatingFileHandler(
            log_paths['security'],
            maxBytes=MAX_BYTES,
            backupCount=BACKUP_COUNT
        )
        security_handler.setLevel(logging.INFO)
        security_handler.setFormatter(LOG_FORMAT)
        logger.addHandler(security_handler)

    return logger

# Create main application logger
app_logger = setup_logger('sheetgpt')

# Create service-specific loggers
chat_logger = setup_logger('sheetgpt.chat')
db_logger = setup_logger('sheetgpt.db')
api_logger = setup_logger('sheetgpt.api')
auth_logger = setup_logger('sheetgpt.auth')
security_logger = setup_logger('sheetgpt.security')

# Log startup information
app_logger.info("Logging system initialized")
app_logger.info(f"Environment: {ENVIRONMENT}")
app_logger.info(f"Log directory: {LOGS_DIR.absolute()}")
app_logger.info(f"Log level: {LOG_LEVEL}")
app_logger.info(f"Maximum log files per type: {MAX_LOG_FILES}")
app_logger.info(f"Maximum file size: {MAX_BYTES/1024/1024:.1f}MB")

def log_request(
    request_id: str,
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None
) -> None:
    """Log API request information in a structured format."""
    # Set request context for the current thread
    request_filter.set_context(
        request_id=request_id,
        user_id=user_id,
        ip_address=ip_address,
        path=path
    )
    
    # Log request with all relevant information
    api_logger.info(
        f"Request {request_id}: {method} {path} {status_code} {duration_ms}ms",
        extra={
            "request_id": request_id,
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "user_id": user_id,
            "ip_address": ip_address
        }
    )
    
    # Clear context after logging
    request_filter.clear_context()

def log_security_event(
    event_type: str,
    description: str,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """Log security-related events."""
    security_logger.warning(
        f"Security event: {event_type} - {description}",
        extra={
            "event_type": event_type,
            "description": description,
            "user_id": user_id,
            "ip_address": ip_address,
            "details": details or {}
        }
    )