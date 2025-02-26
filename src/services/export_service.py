from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
import logging
import json

from src.services.sports_service import SportsService
from src.services.export.sheets_service import GoogleSheetsService as SheetsService
from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastCompany, BroadcastRights, 
    ProductionCompany, ProductionService,
    Brand, BrandRelationship
)

logger = logging.getLogger(__name__)

class ExportService:
    """Service for exporting data to external systems."""

    def __init__(self):
        self.sports_service = SportsService()
        self.sheets_service = SheetsService()

    async def export_sports_entities(
        self, 
        db: Session, 
        entity_type: str, 
        entity_ids: List[UUID],
        include_relationships: bool,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Export sports entities to Google Sheets."""
        # Get the entity model class
        if entity_type not in self.sports_service.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model = self.sports_service.ENTITY_TYPES[entity_type]
        
        # Query the entities
        entities = db.query(model).filter(model.id.in_(entity_ids)).all()
        if not entities:
            raise ValueError(f"No {entity_type} found with the provided IDs")
        
        # Convert entities to dictionaries
        entity_dicts = [self._entity_to_dict(entity) for entity in entities]
        
        # Include relationships if requested
        if include_relationships:
            entity_dicts = self._include_relationships(db, entity_type, entity_dicts, entities)
        
        # Create a Google Sheet
        sheet_title = f"{entity_type.capitalize()} Export"
        spreadsheet_id, spreadsheet_url = await self.sheets_service.create_spreadsheet(
            sheet_title, 
            user_id
        )
        
        # Format the data for the sheet
        headers, rows = self._format_for_sheet(entity_dicts)
        
        # Write data to the sheet
        await self.sheets_service.write_to_sheet(
            spreadsheet_id, 
            "Sheet1", 
            headers, 
            rows
        )
        
        # Apply formatting
        await self.sheets_service.apply_formatting(
            spreadsheet_id,
            "Sheet1",
            len(headers),
            len(rows) + 1  # +1 for header row
        )
        
        return {
            "spreadsheet_id": spreadsheet_id,
            "spreadsheet_url": spreadsheet_url,
            "entity_count": len(entities)
        }
    
    def _entity_to_dict(self, entity: Any) -> Dict[str, Any]:
        """Convert an entity to a dictionary, handling special types."""
        result = {}
        for column in entity.__table__.columns:
            value = getattr(entity, column.name)
            
            # Handle special types
            if isinstance(value, UUID):
                value = str(value)
            elif hasattr(value, "isoformat"):  # For date/datetime
                value = value.isoformat()
                
            result[column.name] = value
        return result
    
    def _include_relationships(
        self, 
        db: Session, 
        entity_type: str, 
        entity_dicts: List[Dict[str, Any]], 
        entities: List[Any]
    ) -> List[Dict[str, Any]]:
        """Include relationship data in the entity dictionaries."""
        # This is a simplified implementation
        # In a real application, you would need to handle different relationship types
        # based on the entity type
        
        for i, entity in enumerate(entities):
            # Get relationship attributes
            for relationship in entity.__mapper__.relationships:
                related_data = getattr(entity, relationship.key)
                
                if related_data is None:
                    continue
                    
                # Handle collections (one-to-many, many-to-many)
                if hasattr(related_data, "__iter__") and not isinstance(related_data, (str, bytes)):
                    related_items = []
                    for item in related_data:
                        item_dict = self._entity_to_dict(item)
                        related_items.append(item_dict)
                    entity_dicts[i][relationship.key] = related_items
                # Handle scalar (many-to-one, one-to-one)
                else:
                    entity_dicts[i][relationship.key] = self._entity_to_dict(related_data)
        
        return entity_dicts
    
    def _format_for_sheet(self, entity_dicts: List[Dict[str, Any]]) -> Tuple[List[str], List[List[Any]]]:
        """Format entity dictionaries for Google Sheets."""
        if not entity_dicts:
            return [], []
        
        # Get all unique keys from all dictionaries
        all_keys = set()
        for entity_dict in entity_dicts:
            all_keys.update(entity_dict.keys())
        
        # Sort keys for consistent output
        headers = sorted(list(all_keys))
        
        # Create rows
        rows = []
        for entity_dict in entity_dicts:
            row = []
            for key in headers:
                value = entity_dict.get(key)
                
                # Handle nested objects and arrays
                if isinstance(value, (dict, list)):
                    value = json.dumps(value)
                
                row.append(value)
            rows.append(row)
        
        return headers, rows 