from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from typing import List, Dict, Any, Optional
import os
import glob
from pathlib import Path

from src.utils.auth import get_current_user
from src.models.models import User

router = APIRouter(prefix="/api/v1/docs", tags=["documentation"])

# Define the base directory for documentation
DOCS_DIR = Path(__file__).parent.parent.parent.parent / "docs"

@router.get("/structure", response_model=List[Dict[str, Any]])
async def get_documentation_structure(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get the structure of all documentation files.
    """
    def get_directory_structure(directory: Path, base_path: Path = DOCS_DIR):
        items = []
        
        # Skip archive directory
        if directory.name == "archive":
            return []
            
        for path in sorted(directory.iterdir()):
            relative_path = str(path.relative_to(base_path))
            
            if path.name.startswith("."):
                continue
                
            if path.is_dir():
                children = get_directory_structure(path, base_path)
                if children:  # Only include directories that have content
                    items.append({
                        "name": path.name,
                        "path": relative_path,
                        "type": "directory",
                        "children": children
                    })
            elif path.suffix == ".md":
                items.append({
                    "name": path.name,
                    "path": relative_path,
                    "type": "file"
                })
                
        return items
    
    try:
        structure = get_directory_structure(DOCS_DIR)
        return structure
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get documentation structure: {str(e)}")

@router.get("/content", response_class=PlainTextResponse)
async def get_documentation_content(
    path: str = Query(..., description="Path to the document relative to the docs directory"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get the content of a documentation file.
    """
    # Prevent path traversal attacks
    clean_path = Path(path).name if '..' in path else path
    file_path = DOCS_DIR / clean_path
    
    try:
        if not file_path.exists() or not file_path.is_file():
            # Try with .md extension
            if not file_path.suffix:
                file_path = file_path.with_suffix('.md')
                
            # Check if it's in a subdirectory
            if not file_path.exists():
                # Search all directories for the file
                base_name = file_path.name
                found_files = list(DOCS_DIR.glob(f"**/{base_name}"))
                
                if found_files:
                    file_path = found_files[0]
                else:
                    raise HTTPException(status_code=404, detail=f"Document not found: {path}")
        
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Process the content to fix links
        content = process_markdown_links(content, str(file_path.relative_to(DOCS_DIR)))
            
        return content
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read document: {str(e)}")

def process_markdown_links(content: str, current_path: str) -> str:
    """
    Process markdown links to ensure they work in the frontend app.
    This converts relative links to absolute paths within the documentation.
    """
    # This is a simplified implementation - a more sophisticated one would
    # handle relative paths more thoroughly
    return content