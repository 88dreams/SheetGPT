from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import (
    HTTP_201_CREATED, 
    HTTP_400_BAD_REQUEST, 
    HTTP_200_OK, 
    HTTP_404_NOT_FOUND, 
    HTTP_409_CONFLICT,
    HTTP_500_INTERNAL_SERVER_ERROR
)
from typing import List, Optional, Dict, Any
from uuid import UUID
import csv
import io
import codecs
import logging
from pydantic import BaseModel, Field
import json

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
    SingleContactImportRequest,
    ContactListParams,
    ContactCSVImport,
    ContactCSVRow,
    BulkUpdateTagRequest,
    BulkUpdateSpecificContactsTagRequest
)
from src.utils.database import get_db
from src.utils.auth import get_current_user
from src.utils.errors import EntityNotFoundError, DuplicateEntityError, ValidationError

router = APIRouter(tags=["contacts"])
logger = logging.getLogger(__name__)

# Define schema for the rematch request body
class RematchRequest(BaseModel):
    match_threshold: float = Field(..., ge=0.0, le=1.0) # Ensure threshold is between 0 and 1
    contact_ids: Optional[List[UUID]] = None # Optional list of contact IDs to rescan

# Define schema for paginated contacts list response
class PaginatedContactsResponse(BaseModel):
    items: List[ContactWithBrandsResponse]
    total: int
    skip: int
    limit: int

class BulkDeleteRequest(BaseModel):
    contact_ids: List[UUID]

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
    limit: int = Query(100, ge=1, le=10000),
    search: Optional[str] = None,
    brand_id: Optional[UUID] = None,
    sort_by: str = "last_name",
    sort_order: str = "asc",
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all contacts with pagination and filtering."""
    user_id = UUID(current_user["id"])
    
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

@router.get("/{contact_id}", response_model=ContactWithBrandsResponse)
async def get_contact(
    contact_id: UUID,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a contact by ID with its brand associations."""
    user_id = UUID(current_user["id"])
    
    try:
        service = ContactsService(db)
        contact = await service.get_contact(user_id, contact_id)
        
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        return contact
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

@router.post("/test-upload")
async def test_upload(
    request: Request,
    file: UploadFile = File(...),
):
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

@router.post("/import/linkedin")
async def import_linkedin_csv(
    file: UploadFile = File(...),
    auto_match_brands: bool = Query(True),
    match_threshold: float = Query(0.6, ge=0.0, le=1.0),
    import_source_tag: Optional[str] = Form(None),
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = UUID(current_user["id"])
    
    async def stream_importer():
        yield '{"status": "starting"}\\n'
        
        try:
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
            
            async for stats in service.import_linkedin_csv_streaming(
                user_id, 
                csv_data,
                auto_match_brands=auto_match_brands,
                match_threshold=match_threshold,
                import_source_tag=import_source_tag
            ):
                yield f"{json.dumps(stats)}\\n"

        except Exception as e:
            error_response = {"status": "error", "message": str(e)}
            yield f"{json.dumps(error_response)}\\n"
            
    return StreamingResponse(stream_importer(), media_type="application/x-ndjson")

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
    """
    Re-scan contacts and synchronize brand associations based on threshold.
    If contact_ids are provided, only those contacts will be rescanned.
    Otherwise, all contacts for the user will be rescanned.
    """
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
            match_threshold=request_body.match_threshold,
            contact_ids=request_body.contact_ids # Pass optional list of IDs
        )
        
        # --- Add Logging --- 
        print(f"Rematch complete. Stats: {stats}")
        
        return {"success": True, "stats": stats}
    except Exception as e:
        # Log the exception
        print(f"Error during contact rematch: {e}")
        # Consider more specific error handling based on potential exceptions
        raise HTTPException(status_code=500, detail=f"Failed to rematch contacts: {str(e)}")

@router.post("/bulk-update-tag", response_model=Dict[str, Any])
async def bulk_update_tag_for_contacts(
    request_body: BulkUpdateTagRequest,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bulk updates the import_source_tag for a specified set of user's contacts."""
    user_id = UUID(current_user["id"])
    service = ContactsService(db)
    try:
        result = await service.bulk_update_contacts_tag(
            user_id=user_id,
            new_tag=request_body.new_tag,
            target_contacts=request_body.target_contacts
        )
        return result
    except ValidationError as e:
        logger.warning(f"Validation error during bulk tag update for user {user_id}: {str(e)}")
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during bulk tag update for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during bulk tag update.")

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
        logger.error(f"Error getting contact count for brand: {str(e)}", exc_info=True)
        
        raise HTTPException(
            status_code=500,
            detail=f"Error getting contact count for brand: {str(e)}"
        )

@router.post("/bulk-update-specific-tags", status_code=HTTP_200_OK)
async def bulk_update_specific_tags(
    request_body: BulkUpdateSpecificContactsTagRequest,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update the import_source_tag for a list of specific contacts."""
    user_id = UUID(current_user["id"])
    contacts_service = ContactsService(db)
    try:
        updated_count = await contacts_service.bulk_update_specific_contacts_tag(
            user_id=user_id,
            contact_ids=request_body.contact_ids,
            new_tag=request_body.new_tag
        )
        return {"message": f"Successfully updated import_source_tag for {updated_count} contacts.", "updated_count": updated_count}
    except EntityNotFoundError as e:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        # Log the exception for debugging
        print(f"Error in bulk_update_specific_tags: {str(e)}") # Replace with proper logging if available
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred while updating contact tags.")

@router.post("/import/custom_csv", response_model=ContactImportStats)
async def import_custom_csv_endpoint(
    file: UploadFile = File(...),
    column_mapping_json: str = Form(...),
    auto_match_brands: bool = Query(True),
    match_threshold: float = Query(0.6, ge=0.0, le=1.0),
    import_source_tag: Optional[str] = Form(None),
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = UUID(current_user["id"])

    try:
        logger.info(f"Custom CSV import started: file={file.filename}, size={file.size}, tag={import_source_tag}")

        # Parse column mapping from JSON string
        try:
            user_column_mapping = json.loads(column_mapping_json)
            if not isinstance(user_column_mapping, dict):
                raise ValueError("Column mapping must be a JSON object (dictionary).")
            logger.info(f"User column mapping: {user_column_mapping}")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON for column mapping: {column_mapping_json}, error: {e}")
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON format for column_mapping: {str(e)}"
            )
        except ValueError as e: # Catches non-dict mapping
            logger.error(f"Invalid column mapping structure: {column_mapping_json}, error: {e}")
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

        content = await file.read()
        logger.info(f"Read {len(content)} bytes from custom CSV file")

        if len(content) == 0:
            logger.error("Empty file received for custom CSV import")
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail="Empty file received. Please upload a valid CSV file."
            )

        # Decode content (similar to linkedin import)
        try:
            # Try utf-8-sig first to handle BOM
            content_str = content.decode('utf-8-sig')
            logger.info("Custom CSV file decoded using utf-8-sig")
        except UnicodeDecodeError:
            try:
                content_str = content.decode('utf-8')
                logger.info("Custom CSV file decoded using utf-8")
            except UnicodeDecodeError:
                content_str = content.decode('latin-1') # Fallback
                logger.info("Custom CSV file decoded using latin-1")
        
        # Parse CSV content into list of dictionaries
        csv_data = []
        try:
            reader = csv.DictReader(io.StringIO(content_str))
            headers = reader.fieldnames
            if not headers:
                 logger.error("CSV file has no headers or is empty after decoding.")
                 raise HTTPException(
                    status_code=HTTP_400_BAD_REQUEST,
                    detail="CSV file has no headers or is empty. Ensure it's a valid CSV with a header row."
                )
            logger.info(f"Custom CSV headers: {headers}")
            
            # Validate that all headers in user_column_mapping exist in the CSV
            for user_header in user_column_mapping.keys():
                if user_header not in headers:
                    logger.error(f"Mapped header '{user_header}' not found in CSV file headers: {headers}")
                    raise HTTPException(
                        status_code=HTTP_400_BAD_REQUEST,
                        detail=f"Mapped header '{user_header}' not found in CSV. Available headers: {headers}"
                    )

            for row in reader:
                csv_data.append(row)
            
            logger.info(f"Parsed {len(csv_data)} data rows from custom CSV")
            if not csv_data:
                # This case might be okay if the file only had a header row, 
                # but usually means an issue or an empty data file.
                logger.warning("Custom CSV file contained no data rows after header.")
                # Depending on requirements, you might allow empty data files or raise error:
                # raise HTTPException(
                #     status_code=HTTP_400_BAD_REQUEST,
                #     detail="CSV file contains no data rows after the header."
                # )

        except csv.Error as e:
            logger.error(f"Invalid CSV format for custom import: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=f"Invalid CSV format: {str(e)}. Please check the file."
            )
        except Exception as e: # Catch other parsing related errors
            logger.error(f"Error parsing CSV content: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=f"Error parsing CSV content: {str(e)}"
            )

        service = ContactsService(db)
        stats = await service.import_custom_csv(
            user_id=user_id,
            csv_data=csv_data,
            user_column_mapping=user_column_mapping,
            auto_match_brands=auto_match_brands,
            match_threshold=match_threshold,
            import_source_tag=import_source_tag
        )
        
        logger.info(f"Custom CSV import finished. Stats: {stats}")
        return stats

    except HTTPException: # Re-raise HTTPExceptions directly
        raise
    except Exception as e:
        logger.error(f"Unhandled error during custom CSV import: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST, # Or 500 for true internal errors
            detail=f"Error importing contacts via custom CSV: An unexpected error occurred. Check logs."
        )

@router.post("/import_single", response_model=ContactWithBrandsResponse, status_code=HTTP_201_CREATED)
async def import_single_contact(
    request_data: SingleContactImportRequest,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Imports or updates a single contact record with brand matching."""
    user_id = UUID(current_user["id"])
    service = ContactsService(db)
    try:
        contact = await service.process_single_contact(
            user_id=user_id,
            contact_payload=request_data.contact_data,
            auto_match_brands=request_data.auto_match_brands,
            match_threshold=request_data.match_threshold,
            import_source_tag=request_data.import_source_tag
        )
        # To return ContactWithBrandsResponse, we need to ensure associations are loaded.
        # The service.process_single_contact now returns the result of get_contact which loads associations.
        return contact 
    except ValidationError as e:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=str(e))
    except EntityNotFoundError as e: # Should not happen if creating, but possible if logic changes
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail=str(e))
    except DuplicateEntityError as e: # Should be handled by update logic, but good to catch
        raise HTTPException(status_code=HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        # Log the exception for debugging
        print(f"Unexpected error during single contact import: {str(e)}") # TODO: Replace with proper logging
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during single contact import.")

@router.post("/bulk-delete", status_code=HTTP_200_OK)
async def bulk_delete_contacts(
    request: BulkDeleteRequest,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deletes a list of contacts in bulk."""
    user_id = UUID(current_user["id"])
    service = ContactsService(db)
    try:
        deleted_count = await service.bulk_delete_contacts(user_id=user_id, contact_ids=request.contact_ids)
        return {"message": f"Successfully deleted {deleted_count} contacts.", "deleted_count": deleted_count}
    except EntityNotFoundError as e:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        # Log the exception for debugging
        print(f"Error in bulk_delete_contacts: {str(e)}") # Replace with proper logging
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred while deleting contacts.")