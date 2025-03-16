"""
Sports Service Module

This module is the main entry point for the sports service layer. It has been refactored
to use a domain-driven design with a facade pattern. Each entity type is managed by its own
service class, while this module provides a consistent API by delegating to the appropriate
service.

IMPORTANT: This file imports from the sports directory, which contains the actual implementation.
"""

from src.services.sports.facade import SportsService

# Re-export the SportsService class as the main entry point
__all__ = ['SportsService']