"""Entity resolution module for sports entities."""

# This is a minimal version of the resolver without the problematic \!= operators
class EntityResolver:
    """Simplified entity resolver."""
    
    def __init__(self, fuzzy_threshold: float = 0.8):
        """Initialize with threshold."""
        self.fuzzy_threshold = fuzzy_threshold
        
class EntityResolutionError(Exception):
    """Error for resolution failures."""
    
    def __init__(self, message, entity_type, name, context=None):
        """Initialize with error details."""
        self.message = message
        self.entity_type = entity_type
        self.name = name
        self.context = context or {}
        super().__init__(message)
        
    def to_dict(self):
        """Convert to dict."""
        return {
            "error": "entity_resolution_error",
            "message": self.message,
            "entity_type": self.entity_type,
            "name": self.name,
            "context": self.context
        }
