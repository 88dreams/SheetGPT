from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID, uuid4
from datetime import datetime, date
import re
import csv
import io
from difflib import SequenceMatcher

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, update
from sqlalchemy.orm import selectinload, joinedload

from src.models.sports_models import Contact, ContactBrandAssociation, Brand, League, Team, Stadium, ProductionService
from src.schemas.contacts import ContactCreate, ContactUpdate, ContactImportStats
from src.utils.errors import EntityNotFoundError, DuplicateEntityError, ValidationError

class ContactsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def create_contact(self, user_id: UUID, data: ContactCreate) -> Contact:
        """Create a new contact for a user."""
        contact = Contact(
            user_id=user_id,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            linkedin_url=data.linkedin_url,
            company=data.company,
            position=data.position,
            connected_on=data.connected_on,
            notes=data.notes
        )
        
        # Check for duplicate (same first name, last name, and email if available)
        query = select(Contact).where(
            and_(
                Contact.user_id == user_id,
                Contact.first_name == data.first_name,
                Contact.last_name == data.last_name
            )
        )
        
        if data.email:
            query = query.where(Contact.email == data.email)
            
        existing = await self.db.execute(query)
        if existing.scalars().first():
            raise DuplicateEntityError(f"Contact {data.first_name} {data.last_name} already exists")
        
        self.db.add(contact)
        await self.db.commit()
        await self.db.refresh(contact)
        return contact
    
    async def get_contact(self, user_id: UUID, contact_id: UUID) -> Contact:
        """Get a contact by ID, ensuring it belongs to the user."""
        query = select(Contact).where(
            and_(
                Contact.id == contact_id,
                Contact.user_id == user_id
            )
        ).options(selectinload(Contact.brand_associations).joinedload(ContactBrandAssociation.brand))
        
        result = await self.db.execute(query)
        contact = result.scalars().first()
        
        if not contact:
            raise EntityNotFoundError(f"Contact with ID {contact_id} not found")
        
        return contact
    
    async def update_contact(self, user_id: UUID, contact_id: UUID, data: ContactUpdate) -> Contact:
        """Update an existing contact."""
        contact = await self.get_contact(user_id, contact_id)
        
        # Update fields if provided
        if data.first_name is not None:
            contact.first_name = data.first_name
        if data.last_name is not None:
            contact.last_name = data.last_name
        if data.email is not None:
            contact.email = data.email
        if data.linkedin_url is not None:
            contact.linkedin_url = data.linkedin_url
        if data.company is not None:
            contact.company = data.company
        if data.position is not None:
            contact.position = data.position
        if data.connected_on is not None:
            contact.connected_on = data.connected_on
        if data.notes is not None:
            contact.notes = data.notes
            
        contact.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(contact)
        return contact
    
    async def delete_contact(self, user_id: UUID, contact_id: UUID) -> bool:
        """Delete a contact and all its associations."""
        contact = await self.get_contact(user_id, contact_id)
        
        await self.db.delete(contact)
        await self.db.commit()
        return True
    
    async def list_contacts(
        self, 
        user_id: UUID, 
        skip: int = 0, 
        limit: int = 100,
        search: Optional[str] = None,
        brand_id: Optional[UUID] = None,
        sort_by: str = "last_name",
        sort_order: str = "asc"
    ) -> Tuple[List[Contact], int]:
        """
        List contacts with optional filtering and sorting.
        Returns a tuple of (contacts, total_count)
        """
        # Build query with filters
        query = select(Contact).where(Contact.user_id == user_id)
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Contact.first_name.ilike(search_term),
                    Contact.last_name.ilike(search_term),
                    Contact.email.ilike(search_term),
                    Contact.company.ilike(search_term),
                    Contact.position.ilike(search_term)
                )
            )
        
        # Apply brand filter if specified
        if brand_id:
            query = query.join(
                ContactBrandAssociation, 
                Contact.id == ContactBrandAssociation.contact_id
            ).where(
                ContactBrandAssociation.brand_id == brand_id
            )
        
        # Get total count before pagination
        count_query = select(func.count()).select_from(query.subquery())
        total_count = await self.db.execute(count_query)
        total_count = total_count.scalar()
        
        # Apply sorting
        sort_column = getattr(Contact, sort_by, Contact.last_name)
        if sort_order.lower() == "desc":
            sort_column = sort_column.desc()
        else:
            sort_column = sort_column.asc()
            
        query = query.order_by(sort_column)
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        # Load brand associations
        query = query.options(
            selectinload(Contact.brand_associations)
            .joinedload(ContactBrandAssociation.brand)
        )
        
        # Execute query
        result = await self.db.execute(query)
        contacts = result.scalars().all()
        
        return contacts, total_count
    
    async def associate_with_brand(
        self, 
        user_id: UUID, 
        contact_id: UUID, 
        brand_id: UUID,
        confidence_score: float = 1.0,
        association_type: str = "employed_at",
        is_current: bool = True,
        is_primary: bool = True,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> ContactBrandAssociation:
        """Associate a contact with a brand."""
        # Verify contact exists and belongs to user
        contact = await self.get_contact(user_id, contact_id)
        
        # Verify brand exists
        brand_query = select(Brand).where(Brand.id == brand_id)
        result = await self.db.execute(brand_query)
        brand = result.scalars().first()
        
        if not brand:
            raise EntityNotFoundError(f"Brand with ID {brand_id} not found")
        
        # Check for existing association
        assoc_query = select(ContactBrandAssociation).where(
            and_(
                ContactBrandAssociation.contact_id == contact_id,
                ContactBrandAssociation.brand_id == brand_id
            )
        )
        result = await self.db.execute(assoc_query)
        existing_assoc = result.scalars().first()
        
        if existing_assoc:
            # Update existing association
            existing_assoc.confidence_score = confidence_score
            existing_assoc.association_type = association_type
            existing_assoc.is_current = is_current
            existing_assoc.is_primary = is_primary
            existing_assoc.start_date = start_date
            existing_assoc.end_date = end_date
            existing_assoc.updated_at = datetime.utcnow()
            association = existing_assoc
        else:
            # Create new association
            association = ContactBrandAssociation(
                contact_id=contact_id,
                brand_id=brand_id,
                confidence_score=confidence_score,
                association_type=association_type,
                is_current=is_current,
                is_primary=is_primary,
                start_date=start_date,
                end_date=end_date
            )
            self.db.add(association)
        
        # If this is primary, set other associations to non-primary
        if is_primary:
            update_query = select(ContactBrandAssociation).where(
                and_(
                    ContactBrandAssociation.contact_id == contact_id,
                    ContactBrandAssociation.brand_id != brand_id,
                    ContactBrandAssociation.is_primary == True
                )
            )
            result = await self.db.execute(update_query)
            other_primaries = result.scalars().all()
            
            for other in other_primaries:
                other.is_primary = False
        
        await self.db.commit()
        await self.db.refresh(association)
        return association
    
    async def remove_brand_association(
        self, 
        user_id: UUID, 
        contact_id: UUID, 
        brand_id: UUID
    ) -> bool:
        """Remove a brand association from a contact."""
        # Verify contact exists and belongs to user
        contact = await self.get_contact(user_id, contact_id)
        
        # Find the association
        query = select(ContactBrandAssociation).where(
            and_(
                ContactBrandAssociation.contact_id == contact_id,
                ContactBrandAssociation.brand_id == brand_id
            )
        )
        result = await self.db.execute(query)
        association = result.scalars().first()
        
        if not association:
            raise EntityNotFoundError(f"Association between contact {contact_id} and brand {brand_id} not found")
        
        await self.db.delete(association)
        await self.db.commit()
        return True
    
    async def import_linkedin_csv(
        self, 
        user_id: UUID, 
        csv_data: List[Dict[str, str]],
        auto_match_brands: bool = True,
        match_threshold: float = 0.6,
        import_source_tag: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Import contacts from LinkedIn CSV export.
        Now attempts to match company names against Brands, Leagues, Teams, Stadiums, and Production Services.
        """
        stats = {
            "total_contacts": len(csv_data),
            "imported_contacts": 0,
            "matched_brands": 0,
            "matched_entities": 0, # Count associations across all types
            "new_representative_brands": 0,
            "import_errors": []
        }
        
        # Pre-fetch all brands and other potential entities to minimize DB calls
        # (Implementation detail: Caching or pre-fetching can be added here)
        
        processed_associations = set() # Track (contact_id, brand_id) to avoid duplicates in this run
        
        for row in csv_data:
            contact = None # Ensure contact is defined in this scope
            try:
                # Normalize column names
                normalized_row = self._normalize_csv_columns(row)
                
                # Extract data
                first_name = normalized_row.get("first_name", "").strip()
                last_name = normalized_row.get("last_name", "").strip()
                email = normalized_row.get("email", "").strip()
                company = normalized_row.get("company", "").strip()
                position = normalized_row.get("position", "").strip()
                profile_url = normalized_row.get("linkedin_url", "").strip()
                
                # Parse connected_on date if present
                connected_on_str = normalized_row.get("connected_on", "").strip()
                connected_on = None
                if connected_on_str:
                    # Try different date formats
                    try:
                        # Format options (common in LinkedIn exports):
                        # 01-Jan-2024, 01/01/2024, 2024-01-01, Jan 01, 2024, etc.
                        for fmt in (
                            "%d-%b-%Y", "%m/%d/%Y", "%Y-%m-%d", "%b %d, %Y", 
                            "%B %d, %Y", "%d %b %Y", "%d %B %Y", "%m-%d-%Y"
                        ):
                            try:
                                connected_on = datetime.strptime(connected_on_str, fmt).date()
                                print(f"Parsed date '{connected_on_str}' with format '{fmt}' -> {connected_on}")
                                break
                            except ValueError:
                                continue
                        
                        if connected_on is None:
                            print(f"Unable to parse date: '{connected_on_str}'")
                    except Exception as e:
                        print(f"Date parsing error for '{connected_on_str}': {str(e)}")
                        pass
                
                # Validate required fields
                if not first_name or not last_name:
                    stats["import_errors"].append({
                        "row": row,
                        "error": "Missing required fields (first name and last name)"
                    })
                    continue
                
                # Check for existing contact with same first name, last name, and email
                query = select(Contact).where(
                    and_(
                        Contact.user_id == user_id,
                        Contact.first_name == first_name,
                        Contact.last_name == last_name
                    )
                )
                
                if email:
                    query = query.where(Contact.email == email)
                    
                result = await self.db.execute(query)
                existing_contact = result.scalars().first()
                
                if existing_contact:
                    # Update existing contact
                    if company and not existing_contact.company:
                        existing_contact.company = company
                    if position and not existing_contact.position:
                        existing_contact.position = position
                    if profile_url and not existing_contact.linkedin_url:
                        existing_contact.linkedin_url = profile_url
                    if connected_on and not existing_contact.connected_on:
                        existing_contact.connected_on = connected_on
                    if email and not existing_contact.email:
                        existing_contact.email = email
                    
                    # Update import_source_tag if provided for an existing contact
                    if import_source_tag is not None:
                        existing_contact.import_source_tag = import_source_tag
                        
                    existing_contact.updated_at = datetime.utcnow()
                    contact = existing_contact
                else:
                    # Create new contact
                    contact = Contact(
                        user_id=user_id,
                        first_name=first_name,
                        last_name=last_name,
                        email=email,
                        linkedin_url=profile_url,
                        company=company,
                        position=position,
                        connected_on=connected_on,
                        import_source_tag=import_source_tag
                    )
                    self.db.add(contact)
                    await self.db.flush()  # Generate ID without committing
                
                # Auto-match if requested and company is provided
                if auto_match_brands and company:
                    # Find all potential brand associations (real and representative)
                    matched_brands = await self._find_brand_associations(company, match_threshold)
                    
                    is_first_association_for_contact = True
                    for brand_match in matched_brands:
                        brand_id = brand_match["id"]
                        confidence = brand_match["confidence"]
                        is_representative = brand_match["is_representative"]
                        
                        assoc_key = (contact.id, brand_id)
                        if assoc_key in processed_associations:
                            continue # Already associated in this import run
                        
                        # Check for existing association in DB
                        assoc_query = select(ContactBrandAssociation).where(
                            and_(
                                ContactBrandAssociation.contact_id == contact.id,
                                ContactBrandAssociation.brand_id == brand_id
                            )
                        )
                        assoc_result = await self.db.execute(assoc_query)
                        existing_assoc = assoc_result.scalars().first()
                        
                        if not existing_assoc:
                            # Determine if this should be primary
                            # Simple approach: first association for this contact in this run is primary
                            # Could be refined later (e.g., prioritize non-representative)
                            make_primary = is_first_association_for_contact
                            
                            association = ContactBrandAssociation(
                                contact_id=contact.id,
                                brand_id=brand_id,
                                confidence_score=confidence,
                                association_type="employed_at", # Or determine based on representative type?
                                is_current=True,
                                is_primary=make_primary 
                            )
                            self.db.add(association)
                            stats["matched_entities"] += 1
                            if is_representative:
                                stats["new_representative_brands"] += 1 # Needs refinement if brand already existed
                            else:
                                stats["matched_brands"] += 1
                                
                            processed_associations.add(assoc_key)
                            is_first_association_for_contact = False # Only the first one is primary
                        else:
                            # Optionally update confidence score or other fields if needed
                            pass 
                            
                stats["imported_contacts"] += 1
                
            except Exception as e:
                stats["import_errors"].append({
                    "row": row,
                    "error": f"Error processing row: {str(e)}"
                })
        
        # Commit all changes for the batch
        try:
            await self.db.commit()
        except Exception as commit_error:
            await self.db.rollback()
            # Log or handle commit error
            stats["import_errors"].append({"row": "COMMIT FAILED", "error": str(commit_error)})

        return stats
    
    async def _find_brand_associations(self, company_name: str, threshold: float) -> List[Dict[str, Any]]:
        """ 
        Finds all relevant Brand associations for a company name.
        Includes matching against real Brands and other entity types (League, Team, etc.)
        by finding or creating representative Brand records.
        
        Returns a list of dicts, each containing: {'id': brand_id, 'confidence': score, 'is_representative': bool}
        """
        if not company_name:
            return []

        normalized_name = self._normalize_company_name(company_name)
        all_associations = [] 

        # 1. Match against real Brands
        real_brand_matches = await self._find_matching_real_brands(normalized_name, threshold)
        for brand, score in real_brand_matches:
            all_associations.append({"id": brand.id, "confidence": score, "is_representative": False})

        # 2. Match against other entity types
        other_entity_matches = await self._match_company_to_other_entities(normalized_name, threshold)
        
        # 3. Get or create representative Brands for other entity matches
        for entity_match in other_entity_matches:
            entity_type = entity_match["type"]
            entity_id = entity_match["id"]
            entity_name = entity_match["name"]
            score = entity_match["confidence"]
            
            representative_brand = await self._get_or_create_representative_brand(entity_type, entity_id, entity_name)
            if representative_brand:
                 # Avoid adding duplicate associations if a real brand with the same name was already found
                if not any(assoc["id"] == representative_brand.id for assoc in all_associations):
                    all_associations.append({
                        "id": representative_brand.id, 
                        "confidence": score, 
                        "is_representative": True
                    })

        # Deduplicate based on brand_id before returning?
        # Or assume caller handles duplicates? For now, return all found.
        return all_associations

    async def _find_matching_real_brands(self, normalized_name: str, threshold: float) -> List[Tuple[Brand, float]]:
        """
        Match a normalized company name to existing "real" brands using fuzzy matching.
        (Previously _match_company_to_brand)
        Returns a list of tuples: (Brand, confidence_score)
        """
        matches = []
        # Try exact match first
        query = select(Brand).where(
            func.lower(Brand.name) == normalized_name.lower(),
            Brand.representative_entity_type == None # Only match real brands
        )
        result = await self.db.execute(query)
        exact_match = result.scalars().first()
        
        if exact_match:
            matches.append((exact_match, 1.0))
            # Maybe return early if exact match found?
            # return matches 

        # Get all real brands for fuzzy matching
        query = select(Brand).where(Brand.representative_entity_type == None)
        result = await self.db.execute(query)
        brands = result.scalars().all()
        
        # Find fuzzy matches
        for brand in brands:
            # Avoid rematching the exact one if found
            if exact_match and brand.id == exact_match.id:
                continue
                
            brand_name_normalized = self._normalize_company_name(brand.name)
            score = self._calculate_similarity(normalized_name, brand_name_normalized)
            
            if score >= threshold:
                matches.append((brand, score))
        
        # Sort by score descending?
        # matches.sort(key=lambda x: x[1], reverse=True)
        return matches

    async def _match_company_to_other_entities(self, normalized_name: str, threshold: float) -> List[Dict[str, Any]]:
        """
        Matches a normalized company name against League, Team, Stadium, ProductionService names.
        Returns a list of dicts: {'type': entity_type, 'id': entity_id, 'name': entity_name, 'confidence': score}
        Currently uses exact (case-insensitive) matching.
        """
        matches = []
        entity_models_to_check = {
            "League": League,
            "Team": Team,
            "Stadium": Stadium,
            "ProductionService": ProductionService
        }

        for entity_type_str, model in entity_models_to_check.items():
            try:
                # Perform case-insensitive exact match
                query = select(model).where(func.lower(model.name) == normalized_name.lower())
                result = await self.db.execute(query)
                matched_entity = result.scalars().first()

                if matched_entity:
                    # Exact match found
                    matches.append({
                        "type": entity_type_str,
                        "id": matched_entity.id,
                        "name": matched_entity.name,
                        "confidence": 1.0 # Exact match confidence
                    })
                    # Found an exact match for this type, potentially stop searching this type?
                    # For now, let's just take the first exact match per type.
                    
                # TODO: Add fuzzy matching logic here if exact match fails?
                # Similar to _find_matching_real_brands, query all entities of this type
                # and calculate similarity, adding matches above threshold.
                
            except Exception as e:
                # Log error querying this specific model
                print(f"Error matching '{normalized_name}' against {entity_type_str}: {e}")
        
        return matches

    async def _get_or_create_representative_brand(self, entity_type: str, entity_id: UUID, entity_name: str) -> Optional[Brand]:
        """
        Finds an existing representative Brand for a given entity, or creates one if it doesn't exist.
        Returns the Brand object.
        """
        # 1. Query Brand table for existing representative brand
        query = select(Brand).where(
            # Case-insensitive name match might be better?
            # func.lower(Brand.name) == entity_name.lower(), 
            Brand.name == entity_name, 
            Brand.representative_entity_type == entity_type
        )
        result = await self.db.execute(query)
        existing_brand = result.scalars().first()
        
        if existing_brand:
            # 2. If found, return it.
            return existing_brand
        else:
            # 3. If not found, create a new Brand record:
            # Assign default industry based on entity type
            if entity_type == 'Team':
                default_industry = 'Sports Team' 
            elif entity_type == 'League':
                default_industry = 'Sports League' 
            elif entity_type == 'Stadium':
                default_industry = 'Venue'
            elif entity_type == 'ProductionService':
                default_industry = 'Media/Production'
            else:
                default_industry = 'Other' # Fallback
            
            try:
                new_representative_brand = Brand(
                    name=entity_name,
                    representative_entity_type=entity_type,
                    industry=default_industry,
                    # company_type could potentially be set here too if desired
                )
                self.db.add(new_representative_brand)
                await self.db.flush() # Flush to get the new ID and ensure it exists before potential use
                await self.db.refresh(new_representative_brand) # Refresh to load all attributes
                print(f"Created representative brand for {entity_type} '{entity_name}'")
                return new_representative_brand
            except Exception as e:
                # Handle potential unique constraint violation or other DB errors during creation
                print(f"Error creating representative brand for {entity_type} '{entity_name}': {e}")
                # Attempt to fetch again in case of race condition (rare with asyncpg, but possible)
                try:
                    result = await self.db.execute(query) # Re-execute the initial query
                    existing_brand = result.scalars().first()
                    if existing_brand:
                        return existing_brand
                except Exception as fetch_err:
                     print(f"Error re-fetching representative brand after creation failed: {fetch_err}")
                await self.db.rollback() # Rollback the failed creation attempt
                return None

    def _normalize_company_name(self, name: str) -> str:
        """Normalize company name for better matching (Revised)."""
        if not name:
            return ""
            
        normalized = name.lower()
        
        # Remove common legal suffixes (consider variations with/without period)
        # Use regex to ensure it's at the end of the string, maybe preceded by space or comma
        suffixes = [" inc.", " inc", " llc.", " llc", " ltd.", " ltd", 
                    " limited", " corp.", " corp", " corporation", 
                    " co.", " co", " company"]
        for suffix in suffixes:
            normalized = re.sub(r'[, ]*' + re.escape(suffix) + r'$', '', normalized)

        # Replace common separators (&, +) with space
        normalized = re.sub(r'[&+]', ' ', normalized)
            
        # Remove specific punctuation likely not part of the core name.
        # Keep letters, numbers, spaces, hyphens, apostrophes.
        normalized = re.sub(r'[^\w\s\'\-]', '', normalized) 
        
        # Standardize whitespace (replace multiple spaces with one)
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        return normalized
    
    def _calculate_similarity(self, str1: str, str2: str) -> float:
        """Calculate string similarity using SequenceMatcher."""
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    def _normalize_csv_columns(self, row: Dict[str, str]) -> Dict[str, str]:
        """
        Normalize CSV column names to our expected format.
        Handle variations in LinkedIn export columns.
        """
        normalized = {}
        
        # Map of possible column names to our standard names - expanded to handle more variations
        column_map = {
            "first name": "first_name",
            "firstname": "first_name",
            "first_name": "first_name",
            "last name": "last_name",
            "lastname": "last_name",
            "last_name": "last_name",
            "email": "email",
            "email address": "email",
            "email addresses": "email",
            "company": "company",
            "organization": "company",
            "company name": "company",
            "position": "position",
            "title": "position",
            "job title": "position",
            "headline": "position",  # LinkedIn sometimes uses 'Headline' for position
            "connected on": "connected_on",
            "connection date": "connected_on",
            "profile url": "linkedin_url",
            "public profile url": "linkedin_url",  # Common in LinkedIn exports
            "linkedin url": "linkedin_url",
            "url": "linkedin_url"
        }
        
        # Normalize each column
        for key, value in row.items():
            if key is None:
                continue
                
            normalized_key = column_map.get(key.lower())
            if normalized_key:
                # Only add non-empty values
                if value is not None and value.strip():
                    normalized[normalized_key] = value.strip()
            elif key.lower() == "notes":
                # Special handling for notes field, which is often multi-line
                normalized["notes"] = value
        
        # Debug output for troubleshooting
        if not normalized.get("first_name") or not normalized.get("last_name"):
            print(f"WARNING: Missing name fields after normalization: {row}")
            
        return normalized
    
    def _map_csv_row_to_contact_fields(self, row: Dict[str, str], user_column_mapping: Dict[str, str]) -> Dict[str, str]:
        """
        Maps a CSV row to standard contact field keys using a user-defined mapping.
        """
        mapped_row = {}
        for original_header, contact_field_key in user_column_mapping.items():
            value = row.get(original_header)
            if value is not None: # Keep empty strings if user mapped them, stripping happens later or if needed
                # Special handling for notes, don't strip, allow multi-line
                if contact_field_key == "notes":
                    mapped_row[contact_field_key] = value
                else:
                    # For other fields, strip whitespace.
                    # The schema validation (e.g. EmailStr) will handle format checks.
                    stripped_value = value.strip()
                    if stripped_value: # Only add if not empty after stripping, unless it's notes
                        mapped_row[contact_field_key] = stripped_value
                    # If you want to allow explicitly empty strings for mapped fields (that are not notes):
                    # elif contact_field_key != "notes": 
                    # mapped_row[contact_field_key] = ""
            # If original_header is not in row, row.get(original_header) is None, so it's skipped
            # which is desired: no data for that mapped field from this row.
        return mapped_row

    async def import_custom_csv(
        self,
        user_id: UUID,
        csv_data: List[Dict[str, str]],
        user_column_mapping: Dict[str, str],
        auto_match_brands: bool = True,
        match_threshold: float = 0.6,
        import_source_tag: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Import contacts from a custom CSV file using user-defined column mappings.
        """
        stats = {
            "total_contacts_in_file": len(csv_data),
            "processed_rows": 0,
            "imported_contacts": 0,
            "updated_contacts": 0,
            "matched_brands_associated": 0, # More descriptive name
            "import_errors": []
        }

        processed_associations = set() # Track (contact_id, brand_id) to avoid duplicates in this run

        for i, original_row in enumerate(csv_data):
            stats["processed_rows"] += 1
            contact_for_row = None # Ensure contact is defined for brand association logic
            try:
                mapped_row = self._map_csv_row_to_contact_fields(original_row, user_column_mapping)

                # Extract data using mapped keys
                first_name = mapped_row.get("first_name", "").strip()
                last_name = mapped_row.get("last_name", "").strip()
                email = mapped_row.get("email", "").strip()
                company = mapped_row.get("company", "").strip()
                position = mapped_row.get("position", "").strip()
                # profile_url from CSV maps to linkedin_url in our model
                linkedin_url = mapped_row.get("linkedin_url", "").strip() 
                connected_on_str = mapped_row.get("connected_on", "").strip()
                notes = mapped_row.get("notes") # Notes are not stripped in mapping function

                # Validate required fields
                if not first_name or not last_name:
                    stats["import_errors"].append({
                        "row_number": i + 1,
                        "original_row": original_row,
                        "error": "Missing required fields (first_name and/or last_name) after mapping."
                    })
                    continue

                # Parse connected_on date if present
                connected_on_date = None
                if connected_on_str:
                    # Reuse date parsing logic from import_linkedin_csv or a shared helper
                    # For now, direct implementation:
                    for fmt in ("%d-%b-%Y", "%m/%d/%Y", "%Y-%m-%d", "%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y", "%m-%d-%Y", "%Y/%m/%d"):
                        try:
                            connected_on_date = datetime.strptime(connected_on_str, fmt).date()
                            break
                        except ValueError:
                            continue
                    if connected_on_date is None:
                        stats["import_errors"].append({
                            "row_number": i + 1,
                            "original_row": original_row,
                            "field": "connected_on",
                            "value": connected_on_str,
                            "error": "Invalid date format for connected_on."
                        })
                        # Decide if this is a hard error or just a warning
                        # For now, let's treat it as a warning and proceed with None date

                # Check for existing contact (same logic as import_linkedin_csv)
                query = select(Contact).where(
                    and_(
                        Contact.user_id == user_id,
                        func.lower(Contact.first_name) == func.lower(first_name),
                        func.lower(Contact.last_name) == func.lower(last_name)
                    )
                )
                if email: # Only include email in check if provided and valid
                    try:
                        # Validate email format before using in query
                        validated_email = EmailStr(email) # Pydantic EmailStr for validation
                        query = query.where(func.lower(Contact.email) == func.lower(validated_email))
                    except ValueError: # Pydantic validation error
                        stats["import_errors"].append({
                            "row_number": i + 1,
                            "original_row": original_row,
                            "field": "email",
                            "value": email,
                            "error": "Invalid email format. Contact will be processed without email check/update."
                        })
                        # Do not use invalid email in query
                        pass # Email won't be used in query or for update if invalid

                result = await self.db.execute(query)
                existing_contact = result.scalars().first()

                updated_an_existing_contact = False
                if existing_contact:
                    contact_for_row = existing_contact
                    # Update existing contact (only if new data is provided and field is currently empty or different)
                    # More granular update logic can be added if needed (e.g., always overwrite)
                    if company and (not contact_for_row.company or contact_for_row.company != company) :
                        contact_for_row.company = company
                        updated_an_existing_contact = True
                    if position and (not contact_for_row.position or contact_for_row.position != position):
                        contact_for_row.position = position
                        updated_an_existing_contact = True
                    if linkedin_url and (not contact_for_row.linkedin_url or contact_for_row.linkedin_url != linkedin_url):
                        contact_for_row.linkedin_url = linkedin_url
                        updated_an_existing_contact = True
                    if connected_on_date and (not contact_for_row.connected_on or contact_for_row.connected_on != connected_on_date):
                        contact_for_row.connected_on = connected_on_date
                        updated_an_existing_contact = True
                    if email: # only update email if it's valid
                        try:
                            validated_email = EmailStr(email)
                            if (not contact_for_row.email or contact_for_row.email != validated_email):
                                contact_for_row.email = validated_email
                                updated_an_existing_contact = True
                        except ValueError:
                             pass # Skip updating email if invalid
                    if notes and (not contact_for_row.notes or contact_for_row.notes != notes): # notes are not stripped
                        contact_for_row.notes = notes
                        updated_an_existing_contact = True
                    
                    if import_source_tag and (not contact_for_row.import_source_tag or contact_for_row.import_source_tag != import_source_tag):
                        contact_for_row.import_source_tag = import_source_tag
                        updated_an_existing_contact = True
                    
                    if updated_an_existing_contact:
                        contact_for_row.updated_at = datetime.utcnow()
                        stats["updated_contacts"] += 1
                    
                else: # Create new contact
                    contact_data_for_create = {
                        "user_id": user_id,
                        "first_name": first_name,
                        "last_name": last_name,
                        "company": company if company else None,
                        "position": position if position else None,
                        "linkedin_url": linkedin_url if linkedin_url else None,
                        "connected_on": connected_on_date,
                        "import_source_tag": import_source_tag,
                        "notes": notes # notes can be None
                    }
                    if email:
                        try:
                            contact_data_for_create["email"] = EmailStr(email)
                        except ValueError:
                            # error already logged, email won't be added
                            pass
                    
                    contact_for_row = Contact(**contact_data_for_create)
                    self.db.add(contact_for_row)
                    await self.db.flush()  # Generate ID without committing yet
                    stats["imported_contacts"] += 1
                
                # Auto-match brands if requested, company is provided, and we have a contact object
                if auto_match_brands and company and contact_for_row and contact_for_row.id:
                    matched_brands_info = await self._find_brand_associations(company, match_threshold)
                    
                    is_first_association_for_contact_in_run = True
                    for brand_match_info in matched_brands_info:
                        brand_id = brand_match_info["id"]
                        confidence = brand_match_info["confidence"]
                        
                        assoc_key = (contact_for_row.id, brand_id)
                        if assoc_key in processed_associations:
                            continue 

                        # Check for existing association in DB
                        assoc_query = select(ContactBrandAssociation).where(
                            and_(
                                ContactBrandAssociation.contact_id == contact_for_row.id,
                                ContactBrandAssociation.brand_id == brand_id
                            )
                        )
                        assoc_result = await self.db.execute(assoc_query)
                        existing_db_assoc = assoc_result.scalars().first()
                        
                        if not existing_db_assoc:
                            # For custom CSV, make the first new association primary for this contact during this import.
                            # More sophisticated primary logic could be based on confidence or brand type.
                            make_primary = is_first_association_for_contact_in_run

                            new_association = ContactBrandAssociation(
                                contact_id=contact_for_row.id,
                                brand_id=brand_id,
                                confidence_score=confidence,
                                association_type="employed_at", # Default
                                is_current=True,
                                is_primary=make_primary 
                            )
                            self.db.add(new_association)
                            stats["matched_brands_associated"] += 1
                            processed_associations.add(assoc_key)
                            is_first_association_for_contact_in_run = False 
                        # else:  # Existing association found, maybe update confidence? For now, do nothing.
                        #    pass
            
            except ValidationError as ve: # Catch Pydantic validation errors if schemas were used here
                stats["import_errors"].append({
                    "row_number": i + 1,
                    "original_row": original_row,
                    "error": f"Validation error: {str(ve)}"
                })
            except Exception as e:
                stats["import_errors"].append({
                    "row_number": i + 1,
                    "original_row": original_row,
                    "error": f"Unexpected error processing row: {str(e)}"
                })
        
        # Commit all changes for the batch
        try:
            await self.db.commit()
        except Exception as commit_error:
            await self.db.rollback()
            stats["import_errors"].append({"row_number": "N/A", "original_row": "COMMIT_FAILED", "error": str(commit_error)})

        return stats

    async def process_single_contact(
        self,
        user_id: UUID,
        contact_payload: Dict[str, Optional[str]], # This is the contact_data from SingleContactImportRequest
        auto_match_brands: bool = True,
        match_threshold: float = 0.6,
        import_source_tag: Optional[str] = None
    ) -> Contact: # Return the created or updated contact object
        """
        Processes and saves a single contact record, with brand matching.
        Similar to a single iteration of import_custom_csv.
        """
        contact_for_row: Optional[Contact] = None
        
        # Extract data using known contact field keys (as mapped by frontend)
        first_name = contact_payload.get("first_name", "").strip()
        last_name = contact_payload.get("last_name", "").strip()
        email = contact_payload.get("email", "").strip()
        company = contact_payload.get("company", "").strip()
        position = contact_payload.get("position", "").strip()
        linkedin_url = contact_payload.get("linkedin_url", "").strip()
        connected_on_str = contact_payload.get("connected_on", "").strip()
        notes = contact_payload.get("notes") # Notes are not stripped

        if not first_name or not last_name:
            raise ValidationError("Missing required fields (first_name and/or last_name) for single contact processing.")

        connected_on_date = None
        if connected_on_str:
            for fmt in ("%d-%b-%Y", "%m/%d/%Y", "%Y-%m-%d", "%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y", "%m-%d-%Y", "%Y/%m/%d"):
                try:
                    connected_on_date = datetime.strptime(connected_on_str, fmt).date()
                    break
                except ValueError:
                    continue
            if connected_on_date is None:
                # For single record, this might be a hard error or handled by frontend validation
                # Alternatively, log a warning and proceed with None date.
                print(f"Warning: Invalid date format for connected_on: {connected_on_str} for contact {first_name} {last_name}")
        
        validated_email_str: Optional[str] = None
        if email:
            try:
                validated_email_str = str(EmailStr(email)) # Validate and convert
            except ValueError:
                print(f"Warning: Invalid email format: {email} for contact {first_name} {last_name}")
                # Email will not be used for query or update if invalid

        query = select(Contact).where(
            and_(
                Contact.user_id == user_id,
                func.lower(Contact.first_name) == func.lower(first_name),
                func.lower(Contact.last_name) == func.lower(last_name)
            )
        )
        if validated_email_str: 
            query = query.where(func.lower(Contact.email) == func.lower(validated_email_str))

        result = await self.db.execute(query)
        existing_contact = result.scalars().first()
        
        updated_an_existing_contact = False
        if existing_contact:
            contact_for_row = existing_contact
            # Update logic (similar to import_custom_csv)
            if company and (not contact_for_row.company or contact_for_row.company != company):
                contact_for_row.company = company; updated_an_existing_contact = True
            if position and (not contact_for_row.position or contact_for_row.position != position):
                contact_for_row.position = position; updated_an_existing_contact = True
            if linkedin_url and (not contact_for_row.linkedin_url or contact_for_row.linkedin_url != linkedin_url):
                contact_for_row.linkedin_url = linkedin_url; updated_an_existing_contact = True
            if connected_on_date and (not contact_for_row.connected_on or contact_for_row.connected_on != connected_on_date):
                contact_for_row.connected_on = connected_on_date; updated_an_existing_contact = True
            if validated_email_str and (not contact_for_row.email or contact_for_row.email != validated_email_str):
                contact_for_row.email = validated_email_str; updated_an_existing_contact = True
            if notes and (not contact_for_row.notes or contact_for_row.notes != notes):
                contact_for_row.notes = notes; updated_an_existing_contact = True
            if import_source_tag and (not contact_for_row.import_source_tag or contact_for_row.import_source_tag != import_source_tag):
                contact_for_row.import_source_tag = import_source_tag; updated_an_existing_contact = True
            
            if updated_an_existing_contact:
                contact_for_row.updated_at = datetime.utcnow()
        else: # Create new contact
            contact_data_for_create = {
                "user_id": user_id,
                "first_name": first_name,
                "last_name": last_name,
                "email": validated_email_str, # Already validated or None
                "company": company if company else None,
                "position": position if position else None,
                "linkedin_url": linkedin_url if linkedin_url else None,
                "connected_on": connected_on_date,
                "import_source_tag": import_source_tag,
                "notes": notes
            }
            contact_for_row = Contact(**contact_data_for_create)
            self.db.add(contact_for_row)
            await self.db.flush() 

        if not contact_for_row or not contact_for_row.id:
            # This should not happen if flush() was successful for a new contact
            raise Exception("Contact object not available after create/update attempt")

        if auto_match_brands and company:
            matched_brands_info = await self._find_brand_associations(company, match_threshold)
            
            # Simplified primary logic: first new association is primary for this contact in this save.
            # More robust logic might consider existing primary or confidence scores.
            # Query existing associations for this contact_for_row.id before deciding on primary.
            existing_contact_associations_query = select(ContactBrandAssociation).where(ContactBrandAssociation.contact_id == contact_for_row.id)
            existing_associations_result = await self.db.execute(existing_contact_associations_query)
            contact_has_existing_primary = any(assoc.is_primary for assoc in existing_associations_result.scalars().all())

            for i, brand_match_info in enumerate(matched_brands_info):
                brand_id = brand_match_info["id"]
                confidence = brand_match_info["confidence"]
                
                assoc_query = select(ContactBrandAssociation).where(
                    and_(
                        ContactBrandAssociation.contact_id == contact_for_row.id,
                        ContactBrandAssociation.brand_id == brand_id
                    )
                )
                assoc_result = await self.db.execute(assoc_query)
                existing_db_assoc = assoc_result.scalars().first()
                
                if not existing_db_assoc:
                    make_primary = not contact_has_existing_primary and i == 0 # Only make primary if no existing primary and it's the first new match
                    
                    new_association = ContactBrandAssociation(
                        contact_id=contact_for_row.id,
                        brand_id=brand_id,
                        confidence_score=confidence,
                        association_type="employed_at",
                        is_current=True,
                        is_primary=make_primary 
                    )
                    self.db.add(new_association)
                    if make_primary:
                        contact_has_existing_primary = True # Set flag after assigning first primary
        
        await self.db.commit()
        await self.db.refresh(contact_for_row)
        # Eagerly load associations for the response as frontend might expect it
        return await self.get_contact(user_id, contact_for_row.id) 

    async def rematch_contacts_with_brands(
        self, 
        user_id: UUID, 
        match_threshold: float # Now required, no default
    ) -> Dict[str, Any]:
        """ 
        Re-scan all contacts, adding new brand/entity associations and
        removing old ones that no longer meet the specified threshold.
        """
        stats = {
            "total_contacts": 0,
            "contacts_with_company": 0,
            "associations_added": 0, 
            "associations_removed": 0,
            "associations_kept": 0, # Count existing ones that still meet threshold
            "total_brand_associations_after": 0,
            "errors": []
        }
        
        # Get all contacts for the user, preloading existing associations
        query = select(Contact).where(Contact.user_id == user_id).options(selectinload(Contact.brand_associations).selectinload(ContactBrandAssociation.brand))
        result = await self.db.execute(query)
        contacts = result.scalars().unique().all()
        stats["total_contacts"] = len(contacts)
        
        brands_to_add = []
        assocs_to_delete = []
        processed_contact_ids = set()
        
        # --- Add Logging --- 
        print(f"--- Starting Rematch for user {user_id} with threshold {match_threshold} ---")
        
        for contact in contacts:
            processed_contact_ids.add(contact.id)
            if not contact.company:
                continue
                
            stats["contacts_with_company"] += 1
            
            # --- Add Logging --- 
            print(f"\nProcessing Contact ID: {contact.id}, Company: '{contact.company}'")
            
            # --- Get Existing and Desired Associations --- 
            existing_assocs_map: Dict[UUID, ContactBrandAssociation] = {assoc.brand_id: assoc for assoc in contact.brand_associations}
            existing_brand_ids = set(existing_assocs_map.keys())
            # --- Add Logging --- 
            print(f"  Existing Brand IDs: {existing_brand_ids}")
            
            # Find all potential associations based on the *new* threshold
            desired_matches = await self._find_brand_associations(contact.company, match_threshold)
            desired_brand_ids_map: Dict[UUID, float] = {match["id"]: match["confidence"] for match in desired_matches}
            desired_brand_ids = set(desired_brand_ids_map.keys())
            # --- Add Logging --- 
            print(f"  Desired Matches (Threshold: {match_threshold}): {desired_matches}")
            print(f"  Desired Brand IDs: {desired_brand_ids}")

            # --- Determine Changes --- 
            brand_ids_to_add = desired_brand_ids - existing_brand_ids
            brand_ids_to_remove = existing_brand_ids - desired_brand_ids
            brand_ids_to_keep = existing_brand_ids.intersection(desired_brand_ids)
            # --- Add Logging --- 
            print(f"  Brand IDs to Add: {brand_ids_to_add}")
            print(f"  Brand IDs to Remove: {brand_ids_to_remove}")
            print(f"  Brand IDs to Keep: {brand_ids_to_keep}")

            stats["associations_kept"] += len(brand_ids_to_keep)

            # --- Prepare Deletions --- 
            for brand_id in brand_ids_to_remove:
                assoc_to_remove = existing_assocs_map.get(brand_id)
                if assoc_to_remove:
                    assocs_to_delete.append(assoc_to_remove)
                    stats["associations_removed"] += 1
            
            # --- Prepare Additions --- 
            for brand_id in brand_ids_to_add:
                new_association = ContactBrandAssociation(
                    contact_id=contact.id,
                    brand_id=brand_id,
                    confidence_score=desired_brand_ids_map.get(brand_id, 0.0), # Get score from desired matches
                    association_type="employed_at", # Default
                    is_current=True,
                    # is_primary handled later
                    is_primary=False 
                )
                brands_to_add.append(new_association)
                stats["associations_added"] += 1

            # Potential place to update confidence score for kept associations if needed
            # for brand_id in brand_ids_to_keep:
            #    assoc_to_update = existing_assocs_map.get(brand_id)
            #    new_confidence = desired_brand_ids_map.get(brand_id)
            #    if assoc_to_update and new_confidence is not None:
            #        assoc_to_update.confidence_score = new_confidence # Mark for update?

        # --- Perform Bulk Operations (outside the contact loop) --- 
        try:
            # Delete old associations
            if assocs_to_delete:
                # --- Add Logging --- 
                print(f"\nAttempting to DELETE {len(assocs_to_delete)} associations...")
                for assoc in assocs_to_delete:
                    await self.db.delete(assoc)
            else:
                 # --- Add Logging --- 
                 print("\nNo associations marked for DELETION.")

            # Add new associations
            if brands_to_add:
                # --- Add Logging --- 
                print(f"Attempting to ADD {len(brands_to_add)} associations...")
                self.db.add_all(brands_to_add)
            else:
                # --- Add Logging --- 
                print("No associations marked for ADDITION.")
                
            # Commit additions and deletions
            if assocs_to_delete or brands_to_add:
                await self.db.commit()
                print("Committed additions and deletions.")
            else:
                print("No association changes to commit.")

            # --- Update Primary Flags (After commit) --- 
            # Re-query contacts we processed to update primary flags accurately
            if processed_contact_ids:
                final_query = select(Contact).where(Contact.id.in_(processed_contact_ids)).options(selectinload(Contact.brand_associations).selectinload(ContactBrandAssociation.brand))
                final_result = await self.db.execute(final_query)
                updated_contacts = final_result.scalars().unique().all()
                
                needs_primary_commit = False
                for contact in updated_contacts:
                    # Find the "best" association to mark as primary
                    # Logic: highest confidence non-representative, then highest confidence representative
                    best_assoc: Optional[ContactBrandAssociation] = None
                    highest_real_score = -1.0
                    highest_rep_score = -1.0
                    
                    current_primary_id = None

                    for assoc in contact.brand_associations:
                        is_rep = assoc.brand.representative_entity_type is not None
                        if assoc.is_primary:
                            current_primary_id = assoc.id
                            
                        if not is_rep and assoc.confidence_score > highest_real_score:
                            highest_real_score = assoc.confidence_score
                            best_assoc = assoc
                        elif is_rep and highest_real_score < 0 and assoc.confidence_score > highest_rep_score:
                            # Only consider representative if no real brand is found
                            highest_rep_score = assoc.confidence_score
                            best_assoc = assoc
                            
                    # Update primary flags
                    new_primary_id = best_assoc.id if best_assoc else None
                    if new_primary_id != current_primary_id:
                        needs_primary_commit = True
                        for assoc in contact.brand_associations:
                            assoc.is_primary = (assoc.id == new_primary_id)

                if needs_primary_commit:
                    print("Updating primary flags...")
                    await self.db.commit()
                    print("Committed primary flag updates.")

        except Exception as e:
            await self.db.rollback()
            stats["errors"].append(f"Error during DB operations: {str(e)}")
            print(f"Error during rematch DB operations: {e}")
            # Re-raise or handle as needed

        # Recalculate total associations after commit
        count_query = select(func.count(ContactBrandAssociation.id))
        # TODO: Filter count by user_id if needed for accuracy
        count_result = await self.db.execute(count_query)
        stats["total_brand_associations_after"] = count_result.scalar() or 0
        
        # --- Add Logging --- 
        print(f"--- Finished Rematch. Final Stats: {stats} ---")
        return stats

    async def get_brand_contact_count(self, user_id: UUID, brand_id: UUID) -> int:
        """
        Get the count of contacts associated with a specific brand.
        
        Args:
            user_id: User ID who owns the contacts
            brand_id: Brand ID to count contacts for
            
        Returns:
            Count of contacts associated with the brand
        """
        # Get all contacts for the user that are associated with this brand
        query = select(func.count(Contact.id)).where(
            and_(
                Contact.user_id == user_id,
                ContactBrandAssociation.contact_id == Contact.id,
                ContactBrandAssociation.brand_id == brand_id
            )
        ).select_from(
            Contact
        ).join(
            ContactBrandAssociation, Contact.id == ContactBrandAssociation.contact_id
        )
        
        result = await self.db.execute(query)
        count = result.scalar_one_or_none() or 0
        
        return count
        
    @staticmethod
    def parse_csv_data(csv_content: str) -> List[Dict[str, str]]:
        """Parse CSV content into a list of dictionaries."""
        csv_data = []
        reader = csv.DictReader(io.StringIO(csv_content))
        for row in reader:
            csv_data.append(row)
        return csv_data

    async def bulk_update_contacts_tag(
        self,
        user_id: UUID,
        new_tag: str,
        target_contacts: str = "all_untagged"  # "all" or "all_untagged"
    ) -> Dict[str, Any]:
        """
        Bulk updates the import_source_tag for a specified set of contacts for a user.
        Returns a dictionary with the count of updated contacts.
        """
        if target_contacts not in ["all", "all_untagged"]:
            raise ValidationError("Invalid value for target_contacts. Must be 'all' or 'all_untagged'.")

        query = select(Contact).where(Contact.user_id == user_id)

        if target_contacts == "all_untagged":
            query = query.where(or_(Contact.import_source_tag == None, Contact.import_source_tag == ''))
        
        # To get a count of how many will be updated (optional, but good for stats)
        # This requires a separate count query before update or more complex update-returning logic
        # For simplicity now, we'll update and then count, or just return a success message initially.
        # A more robust way is to use update().returning(Contact.id) if the DB supports it well with ORM,
        # or a separate count query.

        # Fetch contacts to update
        result = await self.db.execute(query)
        contacts_to_update = result.scalars().all()

        updated_count = 0
        if not contacts_to_update:
            return {"updated_count": 0, "message": "No contacts found matching the criteria."}

        for contact in contacts_to_update:
            contact.import_source_tag = new_tag
            contact.updated_at = datetime.utcnow()
            updated_count += 1
        
        try:
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            raise e # Re-raise after rollback
        
        return {"updated_count": updated_count, "message": f"Successfully updated {updated_count} contacts."}

    async def bulk_update_specific_contacts_tag(
        self,
        user_id: UUID,
        contact_ids: List[UUID],
        new_tag: str
    ) -> int:
        """Update the import_source_tag for a specific list of contacts."""
        if not contact_ids:
            return 0

        stmt = (
            update(Contact)
            .where(Contact.user_id == user_id)
            .where(Contact.id.in_(contact_ids))
            .values(import_source_tag=new_tag)
            .execution_options(synchronize_session=False)  # Important for bulk updates
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        
        updated_count = result.rowcount
        print(f"User {user_id} updated import_source_tag for {updated_count} contacts to '{new_tag}'. Contact IDs: {contact_ids}")
        return updated_count

    async def get_contact_by_id(self, contact_id: UUID, user_id: UUID) -> Optional[Contact]:
        query = select(Contact).where(
            and_(
                Contact.id == contact_id,
                Contact.user_id == user_id
            )
        ).options(selectinload(Contact.brand_associations).joinedload(ContactBrandAssociation.brand))
        
        result = await self.db.execute(query)
        contact = result.scalars().first()
        
        if not contact:
            raise EntityNotFoundError(f"Contact with ID {contact_id} not found")
        
        return contact