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

@router.get("/structure", response_model=List[Dict[str, Any]], response_model_exclude_none=True)
async def get_documentation_structure():
    """
    Get the structure of all documentation files.
    """
    # Files to hide from the UI but keep in the filesystem
    HIDDEN_FILES = [
        "DIGITAL_OCEAN_SSL_FIX.md",
        "PERFORMANCE_MEASUREMENTS.md",
        "PERFORMANCE_OPTIMIZATION.md",
        "RELATIONSHIP_LOADING.md",
        "SPORT_FIELD_FEATURE.md",
        "SPORTDATAMAPPER_ISSUE.md",
        "NETLIFY_DEPLOYMENT_STEPS.md",  # This file has been consolidated into FRONTEND_DEPLOYMENT.md
        "PRODUCTION_PREPARATION.md"     # No longer needed as production deployment is complete
    ]
    
    def get_directory_structure(directory: Path, base_path: Path = DOCS_DIR):
        items = []
        
        # Skip archive directory
        if directory.name == "archive":
            return []
            
        for path in sorted(directory.iterdir()):
            relative_path = str(path.relative_to(base_path))
            
            if path.name.startswith("."):
                continue
            
            # Skip files that should be hidden from UI
            if path.name in HIDDEN_FILES:
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

@router.get("/content", response_class=PlainTextResponse, status_code=200)
async def get_documentation_content(
    path: str = Query(..., description="Path to the document relative to the docs directory")
):
    """
    Get the content of a documentation file.
    Returns the content as plain text with Content-Type: text/plain.
    """
    # Ensure plain text content type
    from fastapi.responses import Response
    from fastapi import status
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
        
        # Sanitize content to remove potentially harmful elements
        content = sanitize_content(content)
        
        # Final verification step - check for any remaining HTML tags that shouldn't be there
        final_check_result = perform_final_security_check(content)
        if not final_check_result['is_safe']:
            print(f"WARNING: Potentially unsafe content detected after sanitization: {final_check_result['unsafe_elements']}")
            # Apply additional cleanup for specific unsafe elements
            for pattern in final_check_result['unsafe_elements']:
                content = re.sub(pattern, '', content, flags=re.IGNORECASE)
            print("Applied additional sanitization to remove unsafe elements")
        
        print("Content processed and sanitized successfully")
            
        # Return explicitly as a Response with text/plain content type
        return Response(
            content=content,
            media_type="text/plain",
            status_code=status.HTTP_200_OK,
            headers={"Content-Type": "text/plain; charset=utf-8"}
        )
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
    try:
        # Log content details for debugging
        print(f"Processing content for {current_path}, length: {len(content)}")
        
        # Convert relative links to absolute
        import re
        processed_content = re.sub(
            r'\[([^\]]+)\]\(([^)]+)\)',
            lambda m: process_link(m, current_path),
            content
        )
        
        print(f"Content processed successfully for {current_path}")
        return processed_content
    except Exception as e:
        import traceback
        print(f"Error processing links in {current_path}: {str(e)}")
        print(traceback.format_exc())
        # Return original content if processing fails
        return content
        
def process_link(match, current_path):
    """Helper function to process individual links in markdown."""
    text, url = match.groups()
    
    try:
        # Skip external links
        if url.startswith(('http://', 'https://', 'mailto:')):
            return f'[{text}]({url})'
            
        # Handle relative paths
        if url.startswith('./'):
            # Convert to relative path based on current document
            parent_dir = '/'.join(current_path.split('/')[:-1])
            if parent_dir:
                new_url = f"{parent_dir}/{url[2:]}"
            else:
                new_url = url[2:]
        elif url.startswith('../'):
            # Go up one directory level
            parts = current_path.split('/')
            if len(parts) > 1:
                parent_dir = '/'.join(parts[:-2])
                new_url = f"{parent_dir}/{url[3:]}"
            else:
                new_url = url[3:]
        elif not url.startswith('/'):
            # Relative to current directory
            parent_dir = '/'.join(current_path.split('/')[:-1])
            if parent_dir:
                new_url = f"{parent_dir}/{url}"
            else:
                new_url = url
        else:
            # Absolute path within docs
            new_url = url[1:]  # Remove leading slash
            
        # Ensure consistent formatting
        new_url = new_url.replace('\\', '/')
        
        print(f"Converted link: {url} -> {new_url}")
        return f'[{text}]({new_url})'
    except Exception as e:
        print(f"Error processing link {url}: {str(e)}")
        # Return original link if processing fails
        return f'[{text}]({url})'
        
def perform_final_security_check(content: str) -> dict:
    """
    Perform a final security check to ensure all dangerous content has been removed.
    Returns a dict with 'is_safe' flag and any 'unsafe_elements' detected.
    """
    import re
    
    # List of patterns to check for potentially harmful content
    unsafe_patterns = [
        r'<script',
        r'<link',
        r'<style',
        r'<meta',
        r'<iframe',
        r'<object',
        r'<embed',
        r'javascript:',
        r'on\w+=["\']',
        r'data:text/html',
        r'base64',
        r'crossorigin',
        r'<form',
        r'<input',
        r'<button',
        r'<img\s+[^>]*onerror',
        r'document\.write',
        r'document\.cookie',
        r'window\.location',
        r'<div\s+[^>]*style=',
        r'<html',
        r'<body',
        r'<head'
    ]
    
    unsafe_found = []
    
    for pattern in unsafe_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            print(f"Found unsafe pattern: {pattern}")
            unsafe_found.append(pattern)
    
    return {
        'is_safe': len(unsafe_found) == 0,
        'unsafe_elements': unsafe_found
    }

def sanitize_content(content: str) -> str:
    """
    Sanitize markdown content to remove potentially harmful HTML elements.
    """
    import re
    
    try:
        # Log original content length for debugging
        original_length = len(content)
        print(f"Sanitizing content of length {original_length}")
        
        # Remove script tags
        content = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', content, flags=re.IGNORECASE)
        
        # Remove link tags (CSS stylesheets)
        content = re.sub(r'<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'<link[^>]*>', '', content, flags=re.IGNORECASE)
        
        # Remove style tags
        content = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', content, flags=re.IGNORECASE)
        
        # Remove meta tags
        content = re.sub(r'<meta[^>]*>', '', content, flags=re.IGNORECASE)
        
        # Remove on* attributes (JavaScript event handlers)
        content = re.sub(r'\s+on\w+="[^"]*"', '', content, flags=re.IGNORECASE)
        content = re.sub(r'\s+on\w+=[\'"][^\']*[\'"]', '', content, flags=re.IGNORECASE)
        
        # Remove iframe tags
        content = re.sub(r'<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>', '', content, flags=re.IGNORECASE)
        
        # Remove object tags
        content = re.sub(r'<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>', '', content, flags=re.IGNORECASE)
        
        # Remove embed tags
        content = re.sub(r'<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>', '', content, flags=re.IGNORECASE)
        
        # Handle crossorigin attributes
        content = re.sub(r'\s+crossorigin=["\'][^"\']*["\']', '', content, flags=re.IGNORECASE)
        
        # Check if content was modified
        if len(content) != original_length:
            print(f"Content was sanitized: removed {original_length - len(content)} characters")
        
        return content
    except Exception as e:
        import traceback
        print(f"Error sanitizing content: {str(e)}")
        print(traceback.format_exc())
        # Return original content if sanitization fails
        return content