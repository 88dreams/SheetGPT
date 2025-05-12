from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST
from typing import List, Optional, Dict, Any
from uuid import UUID
import csv
import io
import codecs
from pydantic import BaseModel, Field

from src.services.contacts_service import ContactsService
from src.schemas.contacts import (
    ContactCreate, 
    ContactUpdate, 
    ContactResponse, 
    ContactWithBrandsResponse,
    ContactBrandAssociationCreate,
    ContactBrandAssociationResponse,
    ContactImportStats,
    ContactImportRequest,
    ContactListParams,
    ContactCSVImport,
    ContactCSVRow,
)
from src.utils.database import get_db
from src.utils.auth import get_current_user
from src.utils.errors import EntityNotFoundError, DuplicateEntityError, ValidationError

router = APIRouter(tags=["contacts"])

# Define schema for the rematch request body
class RematchRequest(BaseModel):
    match_threshold: float = Field(..., ge=0.0, le=1.0) # Ensure threshold is between 0 and 1

# Define schema for paginated contacts list response
class PaginatedContactsResponse(BaseModel):
    items: List[ContactWithBrandsResponse]
    total: int
    skip: int
    limit: int

@router.post("/", response_model=ContactResponse, status_code=HTTP_201_CREATED)
async def create_contact(
    request: ContactCreate,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new contact."""
    user_id = UUID(current_user["id"])
    try:
        service = ContactsService(db)
        contact = await service.create_contact(user_id, request)
        return contact
    except DuplicateEntityError as e:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=PaginatedContactsResponse)
async def list_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    brand_id: Optional[UUID] = None,
    sort_by: str = "last_name",
    sort_order: str = "asc",
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all contacts with pagination and filtering."""
    user_id = UUID(current_user["id"])
    import logging
    logger = logging.getLogger("sheetgpt.api")
    
    try:
        service = ContactsService(db)
        contacts, total = await service.list_contacts(
            user_id, 
            skip=skip, 
            limit=limit,
            search=search,
            brand_id=brand_id,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        return {
            "items": contacts, 
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error fetching contacts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching contacts: {str(e)}")

@router.get("/{contact_id}")
async def get_contact(
    contact_id: UUID,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a contact by ID with its brand associations."""
    user_id = UUID(current_user["id"])
    import logging
    logger = logging.getLogger("sheetgpt.api")
    
    try:
        service = ContactsService(db)
        contact = await service.get_contact(user_id, contact_id)
        
        contact_dict = {
            "id": str(contact.id),
            "user_id": str(contact.user_id),
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "email": contact.email,
            "linkedin_url": contact.linkedin_url,
            "company": contact.company,
            "position": contact.position,
            "connected_on": contact.connected_on.isoformat() if contact.connected_on else None,
            "notes": contact.notes,
            "created_at": contact.created_at.isoformat() if contact.created_at else None,
            "updated_at": contact.updated_at.isoformat() if contact.updated_at else None,
            "brand_associations": []
        }
        
        if hasattr(contact, 'brand_associations') and contact.brand_associations:
            for assoc in contact.brand_associations:
                brand_data = {
                    "id": str(assoc.id),
                    "contact_id": str(assoc.contact_id),
                    "brand_id": str(assoc.brand_id),
                    "confidence_score": assoc.confidence_score,
                    "association_type": assoc.association_type,
                    "is_current": assoc.is_current,
                    "is_primary": assoc.is_primary,
                    "start_date": assoc.start_date.isoformat() if assoc.start_date else None,
                    "end_date": assoc.end_date.isoformat() if assoc.end_date else None,
                    "created_at": assoc.created_at.isoformat() if assoc.created_at else None,
                    "updated_at": assoc.updated_at.isoformat() if assoc.updated_at else None
                }
                
                if hasattr(assoc, 'brand') and assoc.brand:
                    brand_data["brand_name"] = assoc.brand.name
                
                contact_dict["brand_associations"].append(brand_data)
        
        return contact_dict
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching contact: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching contact: {str(e)}")

@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: UUID,
    request: ContactUpdate,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    try:
        service = ContactsService(db)
        contact = await service.update_contact(user_id, contact_id, request)
        return contact
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{contact_id}", response_model=Dict[str, bool])
async def delete_contact(
    contact_id: UUID,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    try:
        service = ContactsService(db)
        await service.delete_contact(user_id, contact_id)
        return {"success": True}
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post(
    "/{contact_id}/brands/{brand_id}", 
    response_model=ContactBrandAssociationResponse
)
async def associate_contact_with_brand(
    contact_id: UUID,
    brand_id: UUID,
    request: ContactBrandAssociationCreate,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    try:
        if request.contact_id != contact_id or request.brand_id != brand_id:
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST, 
                detail="Path IDs must match body IDs"
            )
            
        service = ContactsService(db)
        association = await service.associate_with_brand(
            user_id,
            contact_id,
            brand_id,
            confidence_score=request.confidence_score,
            association_type=request.association_type,
            is_current=request.is_current,
            is_primary=request.is_primary,
            start_date=request.start_date,
            end_date=request.end_date
        )
        return association
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete(
    "/{contact_id}/brands/{brand_id}", 
    response_model=Dict[str, bool]
)
async def remove_brand_association(
    contact_id: UUID,
    brand_id: UUID,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    try:
        service = ContactsService(db)
        await service.remove_brand_association(user_id, contact_id, brand_id)
        return {"success": True}
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/test-upload")
async def test_upload(
    request: Request,
    file: UploadFile = File(...),
):
    import logging
    logger = logging.getLogger("sheetgpt.api")
    
    logger.info(f"Test upload request received: {request.headers}")
    logger.info(f"Test upload file: {file.filename}, size={file.size}, content_type={file.content_type}")
    
    content = await file.read(1024) 
    logger.info(f"File content preview (first 100 bytes): {content[:100]}")
    
    await file.seek(0)
    
    return {
        "success": True,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": file.size,
        "preview": content[:100].decode('utf-8', errors='replace')
    }

# Restore original function
@router.post("/import/linkedin", response_model=ContactImportStats)
async def import_linkedin_csv(
    file: UploadFile = File(...),
    auto_match_brands: bool = Query(True),
    match_threshold: float = Query(0.6, ge=0.0, le=1.0),
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    import logging
    logger = logging.getLogger("sheetgpt.api")
    
    try:
        logger.info(f"LinkedIn CSV import started: file={file.filename}, size={file.size}, content_type={file.content_type}")
        
        content = await file.read()
        logger.info(f"Read {len(content)} bytes from file")
        
        if len(content) == 0:
            logger.error("Empty file received")
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail="Empty file received. Please upload a valid CSV file."
            )
        
        try:
            content_str = content.decode('utf-8-sig')
            logger.info("File decoded using utf-8-sig encoding")
        except UnicodeDecodeError:
            try:
                content_str = content.decode('utf-8')
                logger.info("File decoded using utf-8 encoding")
            except UnicodeDecodeError:
                content_str = content.decode('latin-1')
                logger.info("File decoded using latin-1 encoding")
        
        try:
            lines = content_str.splitlines()
            logger.info(f"First 5 lines of file: {lines[:5]}")
            
            actual_header_line = None
            for i, line in enumerate(lines):
                if 'First Name' in line and 'Last Name' in line:
                    actual_header_line = i
                    logger.info(f"Found actual CSV header at line {i}: {line}")
                    break
            
            if actual_header_line is not None:
                actual_csv = '\n'.join(lines[actual_header_line:])
                logger.info(f"Reconstructed CSV starting with: {actual_csv[:200]}")
                
                csv_data = []
                reader = csv.DictReader(io.StringIO(actual_csv))
                header_row = reader.fieldnames
                logger.info(f"Actual CSV headers: {header_row}")
                
                for row in reader:
                    if 'First Name' in row and row['First Name'] and 'Last Name' in row and row['Last Name']:
                        csv_data.append(row)
                
                logger.info(f"Parsed {len(csv_data)} valid rows from CSV")
                
                if len(csv_data) == 0:
                    logger.warning("CSV file contained no valid data rows")
                    raise HTTPException(
                        status_code=HTTP_400_BAD_REQUEST,
                        detail="CSV file contains no valid data. Please check the file and try again."
                    )
            else:
                csv_data = []
                reader = csv.DictReader(io.StringIO(content_str))
                header_row = reader.fieldnames
                logger.info(f"CSV headers (fallback): {header_row}")
                
                for row in reader:
                    csv_data.append(row)
                
                logger.info(f"Parsed {len(csv_data)} rows from CSV (fallback method)")
                
                if len(csv_data) == 0:
                    logger.warning("CSV file contained no data rows")
                    raise HTTPException(
                        status_code=HTTP_400_BAD_REQUEST,
                        detail="CSV file contains no data. Please check the file and try again."
                    )
        except csv.Error as e:
            logger.error(f"CSV parsing error: {str(e)}")
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=f"Invalid CSV format: {str(e)}. Please check the file and try again."
            )
        
        service = ContactsService(db)
        stats = await service.import_linkedin_csv(
            user_id, 
            csv_data,
            auto_match_brands=auto_match_brands,
            match_threshold=match_threshold
        )
        
        return stats
    except Exception as e:
        # Log the exception in detail before raising a generic HTTPException
        logger.error(f"Unhandled error during LinkedIn CSV import: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST, # Or 500 if it's truly an internal server error
            detail=f"Error importing contacts: An unexpected error occurred. Please check logs."
        )

@router.post("/import/data", response_model=ContactImportStats)
async def import_linkedin_data(
    request: ContactImportRequest,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Import contacts from structured data (alternative to CSV upload)."""
    user_id = UUID(current_user["id"])
    try:
        # Convert the structured request data to a list of dictionaries
        csv_data = []
        for row in request.file_content:
            row_dict = row.dict()
            # Convert any dates to strings
            if row_dict.get("connected_on") and not isinstance(row_dict["connected_on"], str):
                row_dict["connected_on"] = row_dict["connected_on"].isoformat()
            csv_data.append(row_dict)
        
        # Import contacts
        service = ContactsService(db)
        stats = await service.import_linkedin_csv(
            user_id, 
            csv_data,
            auto_match_brands=request.auto_match_brands,
            match_threshold=request.match_threshold
        )
        
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Error importing contacts: {str(e)}"
        )

@router.post("/rematch-brands", response_model=Dict[str, Any])
async def rematch_contacts(
    request_body: RematchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Re-scan contacts and synchronize brand associations based on threshold."""
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    user_id = UUID(user_id_str)
    
    service = ContactsService(db) 
    
    # --- Add Logging --- 
    print(f"Received rematch request for user {user_id} with threshold: {request_body.match_threshold}")
    
    try:
        stats = await service.rematch_contacts_with_brands(
            user_id=user_id, 
            match_threshold=request_body.match_threshold # Pass threshold from request
        )
        
        # --- Add Logging --- 
        print(f"Rematch complete. Stats: {stats}")
        
        return {"success": True, "stats": stats}
    except Exception as e:
        # Log the exception
        print(f"Error during contact rematch: {e}")
        # Consider more specific error handling based on potential exceptions
        raise HTTPException(status_code=500, detail=f"Failed to rematch contacts: {str(e)}")

@router.get("/brands/{brand_id}/count", response_model=Dict[str, int])
async def get_contacts_count_by_brand(
    brand_id: UUID,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the count of contacts associated with a specific brand.
    
    This is useful for displaying the number of contacts linked to a brand
    in the UI, such as for badge displays.
    """
    user_id = UUID(current_user["id"])
    try:
        service = ContactsService(db)
        count = await service.get_brand_contact_count(user_id, brand_id)
        
        return {
            "count": count
        }
    except Exception as e:
        import logging
        logger = logging.getLogger("sheetgpt.api")
        logger.error(f"Error getting contact count for brand: {str(e)}", exc_info=True)
        
        raise HTTPException(
            status_code=500,
            detail=f"Error getting contact count for brand: {str(e)}"
        )