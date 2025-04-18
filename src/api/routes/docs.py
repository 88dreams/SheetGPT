from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from typing import List, Dict, Any, Optional
import os
import glob
from pathlib import Path

from src.utils.auth import get_current_user
from src.models.models import User

router = APIRouter(prefix="/docs", tags=["documentation"])

# Define the base directory for documentation
DOCS_DIR = Path(__file__).parent.parent.parent.parent / "docs"
print(f"Documentation directory: {DOCS_DIR.absolute()}")

# Add a backup path for Docker environment
DOCKER_DOCS_DIR = Path("/app/docs")
if not DOCS_DIR.exists() and DOCKER_DOCS_DIR.exists():
    print(f"Using Docker docs path: {DOCKER_DOCS_DIR}")
    DOCS_DIR = DOCKER_DOCS_DIR

@router.get("/structure", response_model=List[Dict[str, Any]])
async def get_documentation_structure():
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
        print(f"Getting documentation structure from: {DOCS_DIR}")
        print(f"Directory exists: {DOCS_DIR.exists()}")
        print(f"Is directory: {DOCS_DIR.is_dir() if DOCS_DIR.exists() else 'N/A'}")
        print(f"Directory contents: {list(DOCS_DIR.iterdir()) if DOCS_DIR.exists() and DOCS_DIR.is_dir() else 'N/A'}")
        
        structure = get_directory_structure(DOCS_DIR)
        print(f"Structure found: {len(structure)} top-level items")
        return structure
    except Exception as e:
        import traceback
        print(f"Error getting documentation structure: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get documentation structure: {str(e)}")

@router.get("/content", response_class=PlainTextResponse)
async def get_documentation_content(
    path: str = Query(..., description="Path to the document relative to the docs directory")
):
    """
    Get the content of a documentation file.
    """
    # Prevent path traversal attacks
    clean_path = Path(path).name if '..' in path else path
    file_path = DOCS_DIR / clean_path
    
    try:
        print(f"Requested document path: {path}")
        print(f"Looking for file at: {file_path}")
        print(f"File exists: {file_path.exists()}")
        print(f"Is file: {file_path.is_file() if file_path.exists() else 'N/A'}")
        
        if not file_path.exists() or not file_path.is_file():
            # Try with .md extension
            if not file_path.suffix:
                file_path = file_path.with_suffix('.md')
                print(f"Trying with .md extension: {file_path}")
                print(f"File with .md exists: {file_path.exists()}")
                
            # Check if it's in a subdirectory
            if not file_path.exists():
                # Search all directories for the file
                base_name = file_path.name
                print(f"Searching for file globally: {base_name}")
                
                # More reliable glob with path check
                found_files = []
                try:
                    found_files = list(DOCS_DIR.glob(f"**/{base_name}"))
                    print(f"Found files: {[str(f) for f in found_files]}")
                except Exception as glob_error:
                    print(f"Error during glob: {str(glob_error)}")
                
                if found_files:
                    file_path = found_files[0]
                    print(f"Using found file: {file_path}")
                else:
                    print(f"No matching files found for: {base_name}")
                    raise HTTPException(status_code=404, detail=f"Document not found: {path}")
        
        print(f"Opening file: {file_path}")
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            print(f"File content length: {len(content)} characters")
            
        # Process the content to fix links
        content = process_markdown_links(content, str(file_path.relative_to(DOCS_DIR)))
        print("Content processed successfully")
            
        return content
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error getting documentation content: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to read document: {str(e)}")

def process_markdown_links(content: str, current_path: str) -> str:
    """
    Process markdown links to ensure they work in the frontend app.
    This converts relative links to absolute paths within the documentation.
    """
    # This is a simplified implementation - a more sophisticated one would
    # handle relative paths more thoroughly
    return content