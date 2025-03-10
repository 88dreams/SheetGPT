import os
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import time
from datetime import datetime

# Create logs directory if it doesn't exist
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Log file paths with timestamp-based naming
def get_log_paths():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return {
        'app': LOGS_DIR / f"app_{timestamp}.log",
        'error': LOGS_DIR / f"error_{timestamp}.log",
        'debug': LOGS_DIR / f"debug_{timestamp}.log",
        'chat': LOGS_DIR / f"chat_{timestamp}.log"
    }

# Maximum number of log files to keep
MAX_LOG_FILES = 10
MAX_BYTES = 10 * 1024 * 1024  # 10MB per file

# Logging format
LOG_FORMAT = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

def cleanup_old_logs():
    """Keep only the most recent MAX_LOG_FILES log files for each type."""
    for prefix in ['app_', 'error_', 'debug_', 'chat_']:
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

def setup_logger(name: str) -> logging.Logger:
    """Set up a logger with file and console handlers."""
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    # Prevent duplicate handlers
    if logger.handlers:
        return logger

    # Clean up old log files before creating new ones
    cleanup_old_logs()

    # Get current log paths
    log_paths = get_log_paths()

    # Console Handler (INFO and above)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(LOG_FORMAT)
    logger.addHandler(console_handler)

    # App Log Handler (INFO and above)
    app_handler = RotatingFileHandler(
        log_paths['app'],
        maxBytes=MAX_BYTES,
        backupCount=0  # We handle rotation ourselves
    )
    app_handler.setLevel(logging.INFO)
    app_handler.setFormatter(LOG_FORMAT)
    logger.addHandler(app_handler)

    # Error Log Handler (ERROR and above)
    error_handler = RotatingFileHandler(
        log_paths['error'],
        maxBytes=MAX_BYTES,
        backupCount=0  # We handle rotation ourselves
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(LOG_FORMAT)
    logger.addHandler(error_handler)

    # Debug Log Handler (DEBUG and above)
    debug_handler = RotatingFileHandler(
        log_paths['debug'],
        maxBytes=MAX_BYTES,
        backupCount=0  # We handle rotation ourselves
    )
    debug_handler.setLevel(logging.DEBUG)
    debug_handler.setFormatter(LOG_FORMAT)
    logger.addHandler(debug_handler)

    # Chat Log Handler (INFO and above, specific to chat operations)
    chat_handler = RotatingFileHandler(
        log_paths['chat'],
        maxBytes=MAX_BYTES,
        backupCount=0  # We handle rotation ourselves
    )
    chat_handler.setLevel(logging.INFO)
    chat_handler.setFormatter(LOG_FORMAT)
    logger.addHandler(chat_handler)

    return logger

# Create main application logger
app_logger = setup_logger('sheetgpt')

# Create service-specific loggers
chat_logger = setup_logger('sheetgpt.chat')
db_logger = setup_logger('sheetgpt.db')
api_logger = setup_logger('sheetgpt.api')

# Log startup information
app_logger.info("Logging system initialized")
app_logger.info(f"Log directory: {LOGS_DIR.absolute()}")
app_logger.info(f"Maximum log files per type: {MAX_LOG_FILES}")
app_logger.info(f"Maximum file size: {MAX_BYTES/1024/1024:.1f}MB")