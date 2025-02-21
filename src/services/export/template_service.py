from typing import Dict, Any, Optional
import json
import os
from pathlib import Path
from fastapi import HTTPException
from src.config.sheets_config import GoogleSheetsConfig

class SheetTemplate:
    """Manages Google Sheets templates for data export."""
    
    def __init__(self):
        self.config = GoogleSheetsConfig()
        self.templates_path = Path(self.config.TEMPLATES_PATH)
        
    async def load_template(self, template_name: str = "default") -> Dict[str, Any]:
        """Load a template configuration from file."""
        try:
            template_file = self.templates_path / f"{template_name}.json"
            if not template_file.exists():
                template_file = self.templates_path / "default.json"
                
            with open(template_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load template: {str(e)}"
            )
            
    async def list_templates(self) -> list[str]:
        """List all available templates."""
        try:
            if not self.templates_path.exists():
                return ["default"]
                
            templates = [f.stem for f in self.templates_path.glob("*.json")]
            return templates if templates else ["default"]
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to list templates: {str(e)}"
            )
            
    async def create_template(self, name: str, template_data: Dict[str, Any]) -> None:
        """Create a new template."""
        try:
            if not self.templates_path.exists():
                os.makedirs(self.templates_path)
                
            template_file = self.templates_path / f"{name}.json"
            with open(template_file, 'w') as f:
                json.dump(template_data, f, indent=4)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create template: {str(e)}"
            )
            
    async def get_formatting(self, template_name: str, section: str) -> Optional[Dict[str, Any]]:
        """Get formatting rules for a specific section of the template."""
        template = await self.load_template(template_name)
        return template.get(section, {}) 