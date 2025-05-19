from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse, Response
from typing import List, Dict, Any, Optional
import os
# import glob # Assuming unused, commented out
from pathlib import Path
import re
import traceback

# from src.utils.auth import get_current_user # Assuming unused for these doc routes
# from src.models.models import User # Assuming unused for these doc routes

router = APIRouter(prefix="/docs", tags=["documentation"])

# Define the base directory for documentation
DOCS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "docs"
# print(f"Documentation directory: {DOCS_DIR.absolute()}") # Optional: keep for debugging startup

# Add a backup path for Docker environment
DOCKER_DOCS_DIR = Path("/app/docs")
if not DOCS_DIR.exists() and DOCKER_DOCS_DIR.exists():
    # print(f"Using Docker docs path: {DOCKER_DOCS_DIR}") # Optional: keep for debugging startup
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
            
        for item_path in sorted(directory.iterdir()):
            relative_path_str = str(item_path.relative_to(base_path))
            
            if item_path.name.startswith("."):
                continue
            
            # Skip files that should be hidden from UI
            if item_path.name in HIDDEN_FILES:
                continue
                
            if item_path.is_dir():
                children = get_directory_structure(item_path, base_path)
                if children:  # Only include directories that have content
                    items.append({
                        "name": item_path.name,
                        "path": relative_path_str,
                        "type": "directory",
                        "children": children
                    })
            elif item_path.suffix == ".md":
                items.append({
                    "name": item_path.name,
                    "path": relative_path_str,
                    "type": "file"
                })
                
        return items
    
    try:
        # print(f"Getting documentation structure from: {DOCS_DIR}") # Optional debug
        structure = get_directory_structure(DOCS_DIR)
        # print(f"Structure found: {len(structure)} top-level items") # Optional debug
        return structure
    except Exception as e:
        # print(f"Error getting documentation structure: {str(e)}") # Optional debug
        # print(traceback.format_exc()) # Optional debug
        raise HTTPException(status_code=500, detail=f"Failed to get documentation structure: {str(e)}")

@router.get("/content", response_class=PlainTextResponse, status_code=200)
async def get_documentation_content(
    path_param: str = Query(..., alias="path", description="Path to the document relative to the docs directory")
):
    """
    Get the content of a documentation file.
    Returns the content as plain text with Content-Type: text/plain.
    """
    # Prevent path traversal attacks
    clean_path_str = Path(path_param).name if '..' in path_param else path_param
    file_path_obj = DOCS_DIR / clean_path_str
    
    try:
        # print(f"Requested document path: {path_param}") # Optional debug
        # print(f"Looking for file at: {file_path_obj}") # Optional debug
        
        if not file_path_obj.exists() or not file_path_obj.is_file():
            # Try with .md extension
            if not file_path_obj.suffix:
                file_path_obj = file_path_obj.with_suffix('.md')
                # print(f"Trying with .md extension: {file_path_obj}") # Optional debug
                # print(f"File with .md exists: {file_path_obj.exists()}") # Optional debug
                
            # Check if it's in a subdirectory
            if not file_path_obj.exists():
                # Search all directories for the file
                base_name = file_path_obj.name
                # print(f"Searching for file globally: {base_name}") # Optional debug
                
                # More reliable glob with path check
                found_files = []
                try:
                    found_files = list(DOCS_DIR.glob(f"**/{base_name}"))
                    # print(f"Found files: {[str(f) for f in found_files]}") # Optional debug
                except Exception as glob_error:
                    print(f"Error during glob: {str(glob_error)}") # Uncommented for active line
                    traceback.print_exc() # Ensure traceback is available and called
                    # pass # No longer needed if print is active
                
                if found_files:
                    file_path_obj = found_files[0]
                    # print(f"Using found file: {file_path_obj}") # Optional debug
                else:
                    # print(f"No matching files found for: {base_name}") # Optional debug
                    raise HTTPException(status_code=404, detail=f"Document not found: {path_param}")
        
        # print(f"Opening file: {file_path_obj}") # Optional debug
        with open(file_path_obj, "r", encoding="utf-8") as f:
            content = f.read()
            # print(f"File content length: {len(content)} characters") # Optional debug
            
        # Process the content to fix links
        content = process_markdown_links(content, str(file_path_obj.relative_to(DOCS_DIR)))
        
        # Sanitize content to remove potentially harmful elements
        content = sanitize_content(content)
        
        # Final verification step - check for any remaining HTML tags that shouldn't be there
        final_check_result = perform_final_security_check(content)
        if not final_check_result['is_safe']:
            # print(f"WARNING: Potentially unsafe content detected after sanitization: {final_check_result['unsafe_elements']}") # Optional debug
            # Apply additional cleanup for specific unsafe elements
            for pattern in final_check_result['unsafe_elements']:
                content = re.sub(pattern, '', content, flags=re.IGNORECASE)
            # print("Applied additional sanitization to remove unsafe elements") # Optional debug
        
        # print("Content processed and sanitized successfully") # Optional debug
            
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
        # print(f"Error getting documentation content: {str(e)}") # Optional debug
        # print(traceback.format_exc()) # Optional debug
        raise HTTPException(status_code=500, detail=f"Failed to read document: {str(e)}")

def process_markdown_links(content: str, current_doc_path_str: str) -> str:
    """
    Process markdown links to ensure they work in the frontend app.
    This converts relative links to absolute paths within the documentation.
    """
    try:
        # Log content details for debugging
        # print(f"Processing content for {current_doc_path_str}, length: {len(content)}") # Optional debug
        
        # Convert relative links to absolute
        processed_content = re.sub(
            r'\[([^\]]+)\]\(([^)]+)\)',
            lambda m: process_link(m, current_doc_path_str),
            content
        )
        
        # print(f"Content processed successfully for {current_doc_path_str}") # Optional debug
        return processed_content
    except Exception as e:
        # print(f"Error processing links in {current_doc_path_str}: {str(e)}") # Optional debug
        # Return original content if processing fails
        return content
        
def process_link(match, current_doc_path_str: str):
    """Helper function to process individual links in markdown."""
    text, url = match.groups()
    
    try:
        # Skip external links
        if url.startswith(('http://', 'https://', 'mailto:')):
            return f'[{text}]({url})'
            
        # Handle relative paths
        current_doc_p = Path(current_doc_path_str)
        parent_dir_p = current_doc_p.parent

        if url.startswith('./'):
            new_url_p = parent_dir_p / url[2:]
        elif url.startswith('../'):
            # Go up one directory level
            parts = current_doc_p.parts
            if len(parts) > 1:
                parent_dir_p = Path('/'.join(parts[:-2]))
                new_url_p = parent_dir_p / url[3:]
            else:
                new_url_p = Path(url[3:])
        elif not url.startswith('/'):
            # Relative to current directory
            parent_dir_p = current_doc_p.parent
            if parent_dir_p:
                new_url_p = parent_dir_p / url
            else:
                new_url_p = Path(url)
        else:
            # Absolute path within docs
            new_url_p = Path(url[1:])  # Remove leading slash
            
        # Normalize the path (e.g., remove ., resolve .. if any snuck through, ensure /)
        new_url_str = str(new_url_p.resolve().relative_to(DOCS_DIR.resolve())).replace('\\', '/')
        # The above resolve().relative_to() might be too aggressive if DOCS_DIR is complex
        # A simpler normalization for links within /docs structure:
        new_url_str = str(Path(new_url_p)).replace('\\', '/') 
        # Ensure it doesn't go outside DOCS_DIR if Path(url[1:]) was used (though initial .. check should prevent)

        # Simpler normalization for consistent path separators and removing .md
        # new_url = os.path.normpath(str(new_url_p)).replace('\\', '/')
        # The process_markdown in frontend already handles removing .md for display links, 
        # but backend should pass clean paths relative to DOCS_DIR for frontend Link component.

        return f'[{text}]({new_url_str})'
    except Exception as e:
        # print(f"Error processing link {url} from {current_doc_path_str}: {str(e)}") # Optional debug
        # Return original link if processing fails
        return f'[{text}]({url})'
        
def perform_final_security_check(content: str) -> dict:
    """
    Perform a final security check to ensure all dangerous content has been removed.
    Returns a dict with 'is_safe' flag and any 'unsafe_elements' detected.
    """
    unsafe_found = []
    
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
    
    for pattern in unsafe_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            # print(f"Found unsafe pattern: {pattern}") # Optional debug
            unsafe_found.append(pattern)
    
    return {
        'is_safe': len(unsafe_found) == 0,
        'unsafe_elements': unsafe_found
    }

def sanitize_content(content: str) -> str:
    """
    Sanitize markdown content to remove potentially harmful HTML elements.
    """
    try:
        # Log original content length for debugging
        original_length = len(content)
        # print(f"Sanitizing content of length {original_length}") # Optional debug
        
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
            # print(f"Content was sanitized: removed {original_length - len(content)} characters") # Optional debug
            pass # Explicit pass if the print is commented
        
        return content
    except Exception as e:
        print(f"Error sanitizing content: {str(e)}") 
        traceback.print_exc()
        return content # This is the action for the except block