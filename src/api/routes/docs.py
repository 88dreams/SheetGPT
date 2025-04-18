from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from typing import List, Dict, Any, Optional
import os
import glob
import re
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
    # Simply delegate to the specialized function
    return await get_document_by_path(path)

@router.get("/special/{file_name}", response_class=PlainTextResponse, status_code=200)
async def get_special_document(
    file_name: str
):
    """
    Special endpoint to handle problematic document requests directly.
    This bypasses all the path handling and URL encoding issues.
    """
    print(f"Special document request for: {file_name}")
    file_mapping = {
        "api_architecture": "architecture/API_ARCHITECTURE.md",
        "smart_column": "features/SMART_COLUMN.md", 
        "virtualization": "features/VIRTUALIZATION.md",
        "troubleshooting": "maintenance/TROUBLESHOOTING.md",
        "dev_intro_testing": "DEV_INTRO_TESTING.md"
    }
    
    if file_name.lower() in file_mapping:
        return await get_document_by_path(file_mapping[file_name.lower()])
    else:
        raise HTTPException(status_code=404, detail=f"Special document not found: {file_name}")

async def get_document_by_path(path: str):
    """
    Get the content of a documentation file.
    Returns the content as plain text with Content-Type: text/plain.
    """
    # Ensure plain text content type
    from fastapi.responses import Response
    from fastapi import status
    import urllib.parse
    
    # Comprehensive mapping of document paths to file system paths
    # This is a direct mapping approach that bypasses complex path handling
    direct_file_mappings = {
        # Architecture documents
        "API_ARCHITECTURE.md": DOCS_DIR / "architecture" / "API_ARCHITECTURE.md",
        "architecture/API_ARCHITECTURE.md": DOCS_DIR / "architecture" / "API_ARCHITECTURE.md",
        "TECHNICAL_DESCRIPTION.md": DOCS_DIR / "architecture" / "TECHNICAL_DESCRIPTION.md",
        "architecture/TECHNICAL_DESCRIPTION.md": DOCS_DIR / "architecture" / "TECHNICAL_DESCRIPTION.md",
        "SPORTS_API_ENDPOINTS.md": DOCS_DIR / "architecture" / "SPORTS_API_ENDPOINTS.md",
        "architecture/SPORTS_API_ENDPOINTS.md": DOCS_DIR / "architecture" / "SPORTS_API_ENDPOINTS.md",
        "API_EXAMPLES.md": DOCS_DIR / "architecture" / "API_EXAMPLES.md",
        "architecture/API_EXAMPLES.md": DOCS_DIR / "architecture" / "API_EXAMPLES.md",
        
        # Features documents
        "SMART_COLUMN.md": DOCS_DIR / "features" / "SMART_COLUMN.md",
        "features/SMART_COLUMN.md": DOCS_DIR / "features" / "SMART_COLUMN.md", 
        "VIRTUALIZATION.md": DOCS_DIR / "features" / "VIRTUALIZATION.md",
        "features/VIRTUALIZATION.md": DOCS_DIR / "features" / "VIRTUALIZATION.md",
        "CLAUDE_API_INTEGRATION.md": DOCS_DIR / "features" / "CLAUDE_API_INTEGRATION.md",
        "features/CLAUDE_API_INTEGRATION.md": DOCS_DIR / "features" / "CLAUDE_API_INTEGRATION.md",
        
        # Maintenance documents
        "TROUBLESHOOTING.md": DOCS_DIR / "maintenance" / "TROUBLESHOOTING.md",
        "maintenance/TROUBLESHOOTING.md": DOCS_DIR / "maintenance" / "TROUBLESHOOTING.md",
        "DATABASE_MAINTENANCE.md": DOCS_DIR / "maintenance" / "DATABASE_MAINTENANCE.md",
        "maintenance/DATABASE_MAINTENANCE.md": DOCS_DIR / "maintenance" / "DATABASE_MAINTENANCE.md",
        "ALEMBIC_GUIDE.md": DOCS_DIR / "maintenance" / "ALEMBIC_GUIDE.md",
        "maintenance/ALEMBIC_GUIDE.md": DOCS_DIR / "maintenance" / "ALEMBIC_GUIDE.md",
        "TESTING_GUIDE.md": DOCS_DIR / "maintenance" / "TESTING_GUIDE.md",
        "maintenance/TESTING_GUIDE.md": DOCS_DIR / "maintenance" / "TESTING_GUIDE.md",
        
        # Deployment documents
        "CI_CD_PIPELINE.md": DOCS_DIR / "deployment" / "CI_CD_PIPELINE.md",
        "deployment/CI_CD_PIPELINE.md": DOCS_DIR / "deployment" / "CI_CD_PIPELINE.md",
        "FRONTEND_DEPLOYMENT.md": DOCS_DIR / "deployment" / "FRONTEND_DEPLOYMENT.md",
        "deployment/FRONTEND_DEPLOYMENT.md": DOCS_DIR / "deployment" / "FRONTEND_DEPLOYMENT.md",
        
        # Root documents
        "README.md": DOCS_DIR / "README.md",
        "DEV_INTRO_TESTING.md": DOCS_DIR / "DEV_INTRO_TESTING.md",
        "NEW_AGENT.md": DOCS_DIR / "NEW_AGENT.md",
        "PROGRESS.md": DOCS_DIR / "PROGRESS.md"
    }
    
    print(f"Requested document: {path}")
    
    # Check for problematic encoding in the path
    if '%F' in path and '%2F' not in path:
        print(f"Detected incorrect slash encoding: {path}")
        # Fix the encoding
        fixed_path = path.replace('%F', '%2F')
        print(f"Fixed encoding: {fixed_path}")
        path = fixed_path
    
    # Try direct mapping first
    if path in direct_file_mappings:
        print(f"Using direct file mapping for {path}")
        file_path = direct_file_mappings[path]
    else:
        # Standard path handling for other files
        try:
            # Simple path handling - just ensure proper decoding
            decoded_path = urllib.parse.unquote(path)
            print(f"Decoded path: {decoded_path}")
            
            # Normalize any backslashes to forward slashes
            normalized_path = decoded_path.replace('\\', '/')
            print(f"Normalized path: {normalized_path}")
            
            # Basic security check for path traversal
            if '..' in normalized_path:
                clean_path = Path(normalized_path).name
                print(f"Removed path traversal attempt: {clean_path}")
            else:
                clean_path = normalized_path
                
            # Try to locate the file
            file_path = DOCS_DIR / clean_path
            
            # If the file doesn't exist, try a simple search by filename
            if not file_path.exists():
                print(f"File not found at {file_path}")
                # Get just the filename
                filename = Path(clean_path).name
                
                # Special case handling for known problem files
                known_directories = {
                    "API_ARCHITECTURE.md": "architecture",
                    "TECHNICAL_DESCRIPTION.md": "architecture",
                    "SPORTS_API_ENDPOINTS.md": "architecture",
                    "API_EXAMPLES.md": "architecture",
                    "SMART_COLUMN.md": "features",
                    "VIRTUALIZATION.md": "features",
                    "CLAUDE_API_INTEGRATION.md": "features",
                    "TROUBLESHOOTING.md": "maintenance",
                    "DATABASE_MAINTENANCE.md": "maintenance",
                    "ALEMBIC_GUIDE.md": "maintenance",
                    "TESTING_GUIDE.md": "maintenance",
                    "CI_CD_PIPELINE.md": "deployment",
                    "FRONTEND_DEPLOYMENT.md": "deployment"
                }
                
                if filename in known_directories:
                    file_path = DOCS_DIR / known_directories[filename] / filename
                    print(f"Looking in known directory: {file_path}")
                else:
                    # Do a global search for the file
                    try:
                        found_files = list(DOCS_DIR.glob(f"**/{filename}"))
                        if found_files:
                            file_path = found_files[0]
                            print(f"Found file with global search: {file_path}")
                    except Exception as glob_error:
                        print(f"Error during glob search: {glob_error}")
                
        except Exception as path_error:
            print(f"Error processing path: {path_error}")
            # Default to using the original path as-is
            file_path = DOCS_DIR / path
            print(f"Using original path as fallback: {file_path}")
    
    try:
        print(f"Final file path to open: {file_path}")
        print(f"File exists: {file_path.exists()}")
        print(f"Is file: {file_path.is_file() if file_path.exists() else 'N/A'}")
        
        # Add .md extension if needed
        if not file_path.suffix and file_path.with_suffix('.md').exists():
            file_path = file_path.with_suffix('.md')
            print(f"Added .md extension: {file_path}")
        
        # Final check before trying to open
        if not file_path.exists() or not file_path.is_file():
            print(f"ERROR: Final file path check failed: {file_path}")
            print(f"Final file exists: {file_path.exists()}")
            print(f"Final file is file: {file_path.is_file() if file_path.exists() else 'N/A'}")
            
            # Hard-coded emergency fallbacks for specific files
            emergency_fallbacks = {
                'API_ARCHITECTURE.md': DOCS_DIR / "architecture" / "API_ARCHITECTURE.md",
                'SMART_COLUMN.md': DOCS_DIR / "features" / "SMART_COLUMN.md",
                'VIRTUALIZATION.md': DOCS_DIR / "features" / "VIRTUALIZATION.md",
                'TROUBLESHOOTING.md': DOCS_DIR / "maintenance" / "TROUBLESHOOTING.md",
                'DEV_INTRO_TESTING.md': DOCS_DIR / "DEV_INTRO_TESTING.md"
            }
            
            # Check if the filename matches any emergency fallback
            filename = Path(path).name if isinstance(path, str) else path.name
            if filename in emergency_fallbacks:
                fallback_path = emergency_fallbacks[filename]
                print(f"Using emergency fallback path for {filename}: {fallback_path}")
                if fallback_path.exists():
                    file_path = fallback_path
                else:
                    print(f"Emergency fallback file doesn't exist: {fallback_path}")
                    raise HTTPException(status_code=404, detail=f"Document not found (emergency fallback): {path}")
            else:
                raise HTTPException(status_code=404, detail=f"Document not found: {path}")
        
        # By this point we should have a valid file path
        print(f"Opening file: {file_path}")
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                print(f"File content length: {len(content)} characters")
        except FileNotFoundError:
            print(f"FileNotFoundError opening {file_path}")
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
        except PermissionError:
            print(f"PermissionError opening {file_path}")
            raise HTTPException(status_code=403, detail=f"Permission denied: {file_path}")
        except Exception as read_error:
            print(f"Unexpected error reading file {file_path}: {read_error}")
            raise HTTPException(status_code=500, detail=f"Failed to read file: {read_error}")
            
        # Process the content to fix links
        try:
            rel_path = str(file_path.relative_to(DOCS_DIR))
            content = process_markdown_links(content, rel_path)
        except Exception as link_error:
            print(f"Error processing markdown links: {link_error}")
            # Continue even if link processing fails
            
        # Sanitize content to remove potentially harmful elements
        try:
            content = sanitize_content(content)
        except Exception as sanitize_error:
            print(f"Error sanitizing content: {sanitize_error}")
            # Continue even if sanitization fails
        
        print("Content processing complete")
        
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
        import sys
        
        # Ensure clean_path is defined for error reporting
        try:
            if 'clean_path' not in locals():
                clean_path = str(path)
        except:
            clean_path = "unknown"
        
        error_info = {
            "error_message": str(e),
            "document_path": path,
            "clean_path": clean_path,
            "file_path": str(file_path),
            "exists": file_path.exists() if hasattr(file_path, 'exists') else "unknown",
            "python_version": sys.version,
            "exception_type": type(e).__name__,
            "docs_dir": str(DOCS_DIR),
            "docs_exists": DOCS_DIR.exists() if hasattr(DOCS_DIR, 'exists') else "unknown"
        }
        
        print(f"DETAILED ERROR INFO: {error_info}")
        print(f"Error getting documentation content: {str(e)}")
        print(traceback.format_exc())
        
        # Get emergency fallback content for specific files
        filename = Path(path).name if isinstance(path, str) else path.name
        emergency_files = ['API_ARCHITECTURE.md', 'SMART_COLUMN.md', 'VIRTUALIZATION.md', 'TROUBLESHOOTING.md', 'DEV_INTRO_TESTING.md']
        
        if filename in emergency_files:
            print(f"EMERGENCY FALLBACK: Providing hardcoded response for {filename}")
            error_message = f"There was an error loading the document: {str(e)}. Please try again later."
            fallback_content = f"""# {filename.replace('.md', '')}

**Note: This is a fallback version of this document.**

{error_message}

## Content Temporarily Unavailable

The complete content of this document is temporarily unavailable. Please contact the system administrator for assistance.

* The document you requested was: `{path}`
* There was an issue loading this document from the file system
* The system will restore this document when the issue is resolved

## Alternative Documents

In the meantime, you might want to check these related documents:

* [README](/README)
* [Technical Description](/architecture/TECHNICAL_DESCRIPTION)
* [API Architecture](/architecture/API_ARCHITECTURE)

"""
            return Response(
                content=fallback_content,
                media_type="text/plain",
                status_code=status.HTTP_200_OK,
                headers={"Content-Type": "text/plain; charset=utf-8"}
            )
        
        # Return a more detailed error for debugging purposes
        error_detail = f"Failed to read document: {str(e)}. Path: {path}, File exists: {error_info['exists']}"
        raise HTTPException(status_code=500, detail=error_detail)

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
            
        # Get the current document's directory
        parent_dir = '/'.join(current_path.split('/')[:-1])
        
        # Check for potential directory duplication
        would_duplicate = False
        if parent_dir:
            # If the URL path starts with a directory that's the same as the current directory's end
            if url.startswith('./') and parent_dir.endswith(url[2:].split('/')[0]):
                would_duplicate = True
            elif not url.startswith('/') and not url.startswith('./') and parent_dir.endswith(url.split('/')[0]):
                would_duplicate = True
        
        # Handle relative paths
        if would_duplicate:
            print(f"Preventing path duplication for: {url} in {parent_dir}")
            # Use absolute path to avoid duplication
            if url.startswith('./'):
                new_url = url[2:]  # Remove ./ prefix
            else:
                new_url = url
        elif url.startswith('./'):
            # Convert to relative path based on current document
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
            if parent_dir:
                new_url = f"{parent_dir}/{url}"
            else:
                new_url = url
        else:
            # Absolute path within docs
            new_url = url[1:]  # Remove leading slash
            
        # Prevent duplicate directory paths like "architecture/architecture/"
        new_url = re.sub(r'([^/]+)/\1/', r'\1/', new_url)
        
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