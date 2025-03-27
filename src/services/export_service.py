from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
import logging
import json

from src.services.sports_service import SportsService
from src.services.export.sheets_service import GoogleSheetsService as SheetsService
from src.config.sheets_config import GoogleSheetsConfig
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
        self.sheets_config = GoogleSheetsConfig()

    async def export_sports_entities(
        self, 
        db: AsyncSession, 
        entity_type: str, 
        entity_ids: List[UUID],
        include_relationships: bool,
        user_id: UUID,
        visible_columns: Optional[List[str]] = None,
        target_folder: Optional[str] = None,
        export_all: bool = False,  # New parameter to force exporting all entities
        file_name: Optional[str] = None,  # New parameter for custom file name
        use_drive_picker: bool = False  # New parameter to use Drive picker instead of folder name
    ) -> Dict[str, Any]:
        """Export sports entities to Google Sheets."""
        # Log input parameters for debugging
        logging.info(f"Export request - entity_type: {entity_type}, entity_count: {len(entity_ids)}")
        logging.info(f"Export request - visible_columns: {visible_columns}")
        logging.info(f"Export request - include_relationships: {include_relationships}")
        logging.info(f"Export request - target_folder: {target_folder}")
        logging.info(f"Export request - export_all: {export_all}")
        logging.info(f"Export request - file_name: {file_name}")
        logging.info(f"Export request - use_drive_picker: {use_drive_picker}")
        
        # Initialize Google Sheets service
        is_initialized = await self.sheets_service.initialize_from_token(
            token_path=self.sheets_config.TOKEN_PATH
        )
        
        if not is_initialized:
            # Let's export as CSV instead since Google Sheets is not authenticated
            return {
                "csv_export": True,
                "status": "error",
                "message": "Google Sheets service is not initialized. Please authenticate with Google Sheets first.",
                "entity_type": entity_type,
                "entity_count": len(entity_ids)
            }
        
        # Get the entity model class
        if entity_type not in self.sports_service.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model = self.sports_service.ENTITY_TYPES[entity_type]
        
        # Query the entities - using async SQLAlchemy
        entities = []
        
        # CRITICAL CHANGE: Always query ALL entities of this type 
        # This is the direct fix for the "export only shows paginated entities" issue
        logging.info(f"EXPLICITLY QUERYING ALL ENTITIES of type {entity_type}")
        stmt = select(model)
        result = await db.execute(stmt)
        entities = result.scalars().all()
        
        if not entities:
            raise ValueError(f"No {entity_type} found to export")
        
        # Log entity count
        logging.info(f"Found {len(entities)} {entity_type} entities to export")
        
        # Convert entities to dictionaries
        entity_dicts = [self._entity_to_dict(entity) for entity in entities]
        
        # Add related names to the entities (important for UI columns like broadcast_company_name)
        from src.services.sports.entity_name_resolver import EntityNameResolver
        entity_dicts = await EntityNameResolver.get_entities_with_related_names(db, entity_type, entity_dicts)
        
        # Clean the entity fields to remove any that shouldn't be included
        entity_dicts = [
            EntityNameResolver.clean_entity_fields(entity_type, item)
            for item in entity_dicts
        ]
        
        # Include relationships if requested
        if include_relationships:
            entity_dicts = await self._include_relationships(db, entity_type, entity_dicts, entities)
        
        # Create a custom sheet title if file_name is provided, otherwise use default
        sheet_title = file_name if file_name else f"{entity_type.capitalize()} Export"
        
        # If using Drive picker, pass None as the target_folder to skip folder creation
        folder_to_use = None if use_drive_picker else target_folder
        
        # Create the spreadsheet with the appropriate title and folder settings
        spreadsheet_id, spreadsheet_url, folder_id, folder_url = await self.sheets_service.create_spreadsheet(
            sheet_title, 
            user_id,
            folder_to_use,  # Either pass the target folder name or None for Drive picker
            use_drive_picker=use_drive_picker  # Pass the picker flag to the sheets service
        )
        
        # Debug log for any visible columns type issues
        if visible_columns is not None:
            logging.info(f"visible_columns type: {type(visible_columns)}")
            if isinstance(visible_columns, list) and len(visible_columns) > 0:
                logging.info(f"First column type: {type(visible_columns[0])}")
                logging.info(f"Sample column values: {visible_columns[:5]}")
        
        # Format the data for the sheet with visible columns
        headers, rows = self._format_for_sheet(entity_dicts, visible_columns)
        
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
            "entity_count": len(entities),
            "folder_id": folder_id,
            "folder_url": folder_url
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
    
    async def _include_relationships(
        self, 
        db: AsyncSession, 
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
    
    def _format_for_sheet(
        self, 
        entity_dicts: List[Dict[str, Any]], 
        visible_columns: Optional[List[str]] = None
    ) -> Tuple[List[str], List[List[Any]]]:
        """Format entity dictionaries for Google Sheets."""
        if not entity_dicts:
            return [], []
        
        # Get all unique keys from all dictionaries
        all_keys = set()
        for entity_dict in entity_dicts:
            all_keys.update(entity_dict.keys())
        
        # Debug: log the first entity dict keys
        if entity_dicts and len(entity_dicts) > 0:
            logging.info(f"First entity dict keys: {sorted(list(entity_dicts[0].keys()))}")
            logging.info(f"All unique keys across entities: {sorted(list(all_keys))}")
        
        # Use visible columns if provided, otherwise use all keys
        if visible_columns and len(visible_columns) > 0:
            # Log visible columns for debugging
            logging.info(f"Using visible columns for export: {visible_columns}")
            # Filter to include only valid columns that exist in the data
            headers = []
            for col in visible_columns:
                if col in all_keys:
                    headers.append(col)
                else:
                    logging.warning(f"Requested visible column '{col}' not found in data")
                    # Check for similar column names that might be a match
                    similar_cols = [k for k in all_keys if col.lower() in k.lower()]
                    if similar_cols:
                        logging.info(f"Similar columns found: {similar_cols}")
            
            # Note: Removed the code that forces the ID column to be included
            # This way we fully respect the visible columns from the UI
        else:
            # Log fallback to all columns
            logging.info(f"No visible columns specified, using all keys for export")
            # Sort keys for consistent output
            headers = sorted(list(all_keys))
        
        logging.info(f"Final export headers: {headers}")
        
        # Create rows - including ALL rows, not just paginated ones
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
        
        logging.info(f"Total rows for export: {len(rows)}")
        return headers, rows 