"""
Middleware modules for FastAPI application
"""
from src.api.middleware.error_handlers import setup_error_handlers

__all__ = ["setup_error_handlers"]