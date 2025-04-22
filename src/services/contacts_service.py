from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID, uuid4
from datetime import datetime, date
import re
import csv
import io
from difflib import SequenceMatcher

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload, joinedload

from src.models.sports_models import Contact, ContactBrandAssociation, Brand
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
        match_threshold: float = 0.6
    ) -> Dict[str, Any]:
        """
        Import contacts from LinkedIn CSV export.
        
        Expected CSV columns:
        - First Name
        - Last Name
        - Email
        - Company
        - Position
        - Connected On
        - Profile URL
        
        Returns import statistics.
        """
        stats = {
            "total_contacts": len(csv_data),
            "imported_contacts": 0,
            "matched_brands": 0,
            "import_errors": []
        }
        
        # Process each row
        for row in csv_data:
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
                        connected_on=connected_on
                    )
                    self.db.add(contact)
                    await self.db.flush()  # Generate ID without committing
                
                # Auto-match with brands if requested and company is provided
                if auto_match_brands and company:
                    matched_brand = await self._match_company_to_brand(company, match_threshold)
                    if matched_brand:
                        # Create association
                        confidence = self._calculate_similarity(company, matched_brand.name)
                        
                        # Check for existing association
                        assoc_query = select(ContactBrandAssociation).where(
                            and_(
                                ContactBrandAssociation.contact_id == contact.id,
                                ContactBrandAssociation.brand_id == matched_brand.id
                            )
                        )
                        assoc_result = await self.db.execute(assoc_query)
                        existing_assoc = assoc_result.scalars().first()
                        
                        if not existing_assoc:
                            association = ContactBrandAssociation(
                                contact_id=contact.id,
                                brand_id=matched_brand.id,
                                confidence_score=confidence,
                                association_type="employed_at",
                                is_current=True,
                                is_primary=True
                            )
                            self.db.add(association)
                            stats["matched_brands"] += 1
                
                stats["imported_contacts"] += 1
                
            except Exception as e:
                stats["import_errors"].append({
                    "row": row,
                    "error": f"Error processing row: {str(e)}"
                })
        
        # Commit all changes
        await self.db.commit()
        
        return stats
    
    async def _match_company_to_brand(self, company_name: str, threshold: float = 0.6) -> Optional[Brand]:
        """
        Match a company name to an existing brand using fuzzy matching.
        Returns the best match if similarity score exceeds threshold.
        """
        if not company_name:
            return None
            
        # Normalize company name
        normalized_name = self._normalize_company_name(company_name)
        
        # Try exact match first
        query = select(Brand).where(
            func.lower(Brand.name) == normalized_name.lower()
        )
        result = await self.db.execute(query)
        exact_match = result.scalars().first()
        
        if exact_match:
            return exact_match
            
        # Get all brands for fuzzy matching
        query = select(Brand)
        result = await self.db.execute(query)
        brands = result.scalars().all()
        
        # Find best fuzzy match
        best_match = None
        best_score = 0
        
        for brand in brands:
            # Normalize brand name
            brand_name = self._normalize_company_name(brand.name)
            
            # Calculate similarity
            score = self._calculate_similarity(normalized_name, brand_name)
            
            if score > best_score:
                best_score = score
                best_match = brand
        
        # Return best match if it exceeds threshold
        if best_match and best_score >= threshold:
            return best_match
            
        return None
    
    def _normalize_company_name(self, name: str) -> str:
        """Normalize company name for better matching."""
        if not name:
            return ""
            
        # Convert to lowercase
        normalized = name.lower()
        
        # Remove legal entity types
        for entity_type in [" inc", " inc.", " llc", " ltd", " limited", " corp", " corporation"]:
            normalized = normalized.replace(entity_type, "")
            
        # Remove special characters
        normalized = re.sub(r'[^\w\s]', '', normalized)
        
        # Trim whitespace
        normalized = normalized.strip()
        
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
    
    @staticmethod
    def parse_csv_data(csv_content: str) -> List[Dict[str, str]]:
        """Parse CSV content into a list of dictionaries."""
        csv_data = []
        reader = csv.DictReader(io.StringIO(csv_content))
        for row in reader:
            csv_data.append(row)
        return csv_data