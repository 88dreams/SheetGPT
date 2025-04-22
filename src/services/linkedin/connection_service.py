"""
LinkedIn connection management service.
Handles connection data processing and brand matching.
"""
import logging
import re
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
from uuid import UUID
from sqlalchemy.orm import Session
import fuzzywuzzy.fuzz as fuzz

from ...models.linkedin import LinkedInConnection, BrandConnection
from ...models.sports_models import Brand
from ...schemas.linkedin import (
    LinkedInConnectionCreate, BrandConnectionCreate,
    BrandConnectionResponse
)


logger = logging.getLogger(__name__)
MIN_CONFIDENCE_THRESHOLD = 0.3  # Minimum confidence to consider a match
CONFIDENCE_THRESHOLD = 0.7      # Good confidence for automatic matching


def normalize_company_name(name: str) -> str:
    """
    Normalize company name for better matching.
    
    Args:
        name: The company name to normalize
        
    Returns:
        Normalized company name
    """
    if not name:
        return ""
        
    name = name.lower()
    
    # Remove common legal suffixes
    suffixes = [" inc", " incorporated", " llc", " ltd", " limited", 
                " corp", " corporation", " co", " company"]
    for suffix in suffixes:
        if name.endswith(suffix):
            name = name[:-len(suffix)]
    
    # Remove punctuation and standardize spacing
    name = re.sub(r'[^\w\s]', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    
    return name


def levenshtein_ratio(s1: str, s2: str) -> float:
    """
    Calculate normalized Levenshtein distance as a ratio.
    
    Args:
        s1: First string
        s2: Second string
        
    Returns:
        Similarity ratio between 0 and 1
    """
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
        
    return fuzz.ratio(s1, s2) / 100.0


class ConnectionService:
    """
    Service for LinkedIn connection management.
    """
    def __init__(self, db: Session):
        self.db = db

    async def save_connection(
        self, connection_data: LinkedInConnectionCreate
    ) -> LinkedInConnection:
        """
        Save a LinkedIn connection to the database.
        
        Args:
            connection_data: The connection data to save
            
        Returns:
            The created or updated LinkedInConnection object
        """
        # Use raw SQL for compatibility with both sync and async sessions
        from sqlalchemy import text
        
        # Check if connection already exists
        check_query = await self.db.execute(
            text(f"""
                SELECT id FROM linkedin_connections 
                WHERE user_id = '{connection_data.user_id}' 
                AND linkedin_profile_id = '{connection_data.linkedin_profile_id}'
            """)
        )
        existing = check_query.fetchone()
        
        if existing:
            # Update existing connection using direct SQL
            connection_id = existing[0]
            now = datetime.now()
            update_query = text(f"""
                UPDATE linkedin_connections SET
                full_name = '{connection_data.full_name}',
                company_name = '{connection_data.company_name}',
                position = '{connection_data.position}',
                connection_degree = {connection_data.connection_degree},
                updated_at = '{now.isoformat()}'
                WHERE id = {connection_id}
            """)
            
            # Execute without parameters to avoid type conversion issues
            await self.db.execute(update_query)
            
            await self.db.commit()
            
            # Get updated connection
            result = await self.db.execute(text(f"SELECT * FROM linkedin_connections WHERE id = {connection_id}"))
            updated = result.fetchone()
            
            # Convert to a simple object
            class SimpleConnection:
                def __init__(self, row):
                    self.id = row[0]
                    self.user_id = row[1]
                    self.linkedin_profile_id = row[2]
                    self.full_name = row[3]
                    self.company_name = row[4]
                    self.position = row[5]
                    self.connection_degree = row[6]
                    self.created_at = row[7]
                    self.updated_at = row[8]
            
            return SimpleConnection(updated)
        else:
            # Generate current timestamp
            now = datetime.now()
            
            # Create new connection using direct SQL with proper PostgreSQL timestamp syntax
            insert_query = text(f"""
                INSERT INTO linkedin_connections
                (user_id, linkedin_profile_id, full_name, company_name, position, connection_degree, created_at, updated_at)
                VALUES 
                ('{connection_data.user_id}', '{connection_data.linkedin_profile_id}', 
                '{connection_data.full_name}', '{connection_data.company_name}', 
                '{connection_data.position}', {connection_data.connection_degree}, 
                '{now.isoformat()}', '{now.isoformat()}')
                RETURNING id
            """)
            
            # Execute without parameters to avoid type conversion issues
            result = await self.db.execute(insert_query)
            
            connection_id = result.scalar()
            await self.db.commit()
            
            # Get new connection
            result = await self.db.execute(text(f"SELECT * FROM linkedin_connections WHERE id = {connection_id}"))
            new_connection = result.fetchone()
            
            # Convert to a simple object
            class SimpleConnection:
                def __init__(self, row):
                    self.id = row[0]
                    self.user_id = row[1]
                    self.linkedin_profile_id = row[2]
                    self.full_name = row[3]
                    self.company_name = row[4]
                    self.position = row[5]
                    self.connection_degree = row[6]
                    self.created_at = row[7]
                    self.updated_at = row[8]
            
            return SimpleConnection(new_connection)

    async def save_connections(
        self, user_id: UUID, connections: List[Dict[str, Any]], connection_degree: int = 1
    ) -> int:
        """
        Save multiple LinkedIn connections.
        
        Args:
            user_id: The user's UUID
            connections: List of connection data from LinkedIn API
            connection_degree: Degree of connection (1 for 1st degree, 2 for 2nd degree)
            
        Returns:
            Number of connections saved
        """
        count = 0
        for conn in connections:
            try:
                # Extract connection data from LinkedIn API response
                profile_id = conn.get("id")
                
                # Skip if no profile ID
                if not profile_id:
                    continue
                
                # Extract name
                first_name = conn.get("firstName", {}).get("localized", {}).get("en_US", "")
                last_name = conn.get("lastName", {}).get("localized", {}).get("en_US", "")
                full_name = f"{first_name} {last_name}".strip()
                
                # Extract company and position if available
                company_name = None
                position = None
                
                if "positions" in conn and "elements" in conn["positions"] and conn["positions"]["elements"]:
                    position_data = conn["positions"]["elements"][0]
                    if "companyName" in position_data:
                        company_name = position_data["companyName"]
                    if "title" in position_data:
                        position = position_data["title"]
                
                # Create connection record
                await self.save_connection(
                    LinkedInConnectionCreate(
                        user_id=user_id,
                        linkedin_profile_id=profile_id,
                        full_name=full_name,
                        company_name=company_name,
                        position=position,
                        connection_degree=connection_degree
                    )
                )
                count += 1
            except Exception as e:
                logger.error(f"Error saving LinkedIn connection: {str(e)}")
                continue
                
        return count

    def get_user_connections(
        self, user_id: UUID, connection_degree: Optional[int] = None
    ) -> List[LinkedInConnection]:
        """
        Get all LinkedIn connections for a user.
        
        Args:
            user_id: The user's UUID
            connection_degree: Optional filter for connection degree
            
        Returns:
            List of LinkedInConnection objects
        """
        query = self.db.query(LinkedInConnection).filter(
            LinkedInConnection.user_id == user_id
        )
        
        if connection_degree is not None:
            query = query.filter(LinkedInConnection.connection_degree == connection_degree)
            
        return query.all()

    async def get_user_connections_count(self, user_id: UUID) -> int:
        """
        Get count of LinkedIn connections for a user.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Count of connections
        """
        try:
            # Use raw SQL to get count for compatibility with both sync and async sessions
            from sqlalchemy import text
            result = await self.db.execute(
                text(f"SELECT COUNT(*) FROM linkedin_connections WHERE user_id = '{user_id}'")
            )
            count = result.scalar()
            return count or 0
        except Exception as e:
            logger.error(f"Error getting user connections count: {str(e)}")
            return 0

    def delete_user_connections(self, user_id: UUID) -> int:
        """
        Delete all LinkedIn connections for a user.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Number of connections deleted
        """
        count = self.db.query(LinkedInConnection).filter(
            LinkedInConnection.user_id == user_id
        ).delete()
        
        self.db.commit()
        return count

    def fuzzy_match_company_name(
        self, company_name: str, brands: List[Brand]
    ) -> List[Tuple[UUID, float]]:
        """
        Use fuzzy matching to find potential brand matches for a company name.
        
        Args:
            company_name: The company name to match
            brands: List of brands to match against
            
        Returns:
            List of (brand_id, confidence) tuples
        """
        results = []
        
        # Skip if no company name
        if not company_name:
            return results
            
        # Normalize the input company name
        normalized_name = normalize_company_name(company_name)
        
        for brand in brands:
            normalized_brand_name = normalize_company_name(brand.name)
            
            # Calculate match confidence using multiple methods
            
            # Method 1: Levenshtein distance
            lev_ratio = levenshtein_ratio(normalized_name, normalized_brand_name)
            
            # Method 2: Token set ratio (handles word order and extra words)
            token_ratio = fuzz.token_set_ratio(normalized_name, normalized_brand_name) / 100
            
            # Method 3: Partial ratio (handles cases where one is substring of other)
            partial_ratio = fuzz.partial_ratio(normalized_name, normalized_brand_name) / 100
            
            # Calculate combined confidence score
            confidence = (lev_ratio * 0.4) + (token_ratio * 0.4) + (partial_ratio * 0.2)
            
            # Add to results if confidence is above minimum threshold
            if confidence > MIN_CONFIDENCE_THRESHOLD:
                results.append((brand.id, confidence))
        
        # Sort by confidence (highest first) and return
        return sorted(results, key=lambda x: x[1], reverse=True)

    async def match_connections_to_brands(self, user_id: UUID) -> Dict[str, int]:
        """
        Match LinkedIn connections to brands in the database.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Dict with statistics about the matching process
        """
        from sqlalchemy import select
        
        stats = {
            "total_connections": 0,
            "connections_with_company": 0,
            "exact_matches": 0,
            "fuzzy_matches": 0,
            "no_matches": 0,
            "brands_with_connections": 0
        }
        
        # Get all the user's LinkedIn connections using async method
        # Use raw SQL for compatibility with both sync and async sessions
        from sqlalchemy import text
        connections_query = await self.db.execute(
            text(f"SELECT * FROM linkedin_connections WHERE user_id = '{user_id}'")
        )
        connections = connections_query.fetchall()
        stats["total_connections"] = len(connections)
        
        logger.info(f"Found {len(connections)} LinkedIn connections for user {user_id}")
        
        # Get all brands from the database using async method
        brands_query = await self.db.execute(select(Brand))
        brands = brands_query.scalars().all()
        
        logger.info(f"Found {len(brands)} brands for matching")
        
        # Create a mapping of company names to brand IDs
        # This handles exact matches
        company_to_brand_map = {}
        for brand in brands:
            company_to_brand_map[normalize_company_name(brand.name)] = brand.id
            
            # TODO: Add alternative names if available (e.g., from aliases table)
            # aliases = self.db.query(BrandAlias).filter(BrandAlias.brand_id == brand.id).all()
            # for alias in aliases:
            #     company_to_brand_map[normalize_company_name(alias.name)] = brand.id
        
        # Initialize connection counts for each brand
        brand_connections = {brand.id: {"first": 0, "second": 0} for brand in brands}
        
        # Process each connection
        for connection in connections:
            # Access the company_name by position in the tuple
            # The tuple is (id, user_id, linkedin_profile_id, full_name, company_name, position, connection_degree, created_at, updated_at)
            connection_id, connection_user_id, profile_id, full_name, company_name, position, connection_degree, _, _ = connection
            
            if not company_name:
                continue
                
            stats["connections_with_company"] += 1
            normalized_company_name = normalize_company_name(company_name)
            
            # Check for exact match
            if normalized_company_name in company_to_brand_map:
                brand_id = company_to_brand_map[normalized_company_name]
                if connection_degree == 1:
                    brand_connections[brand_id]["first"] += 1
                else:
                    brand_connections[brand_id]["second"] += 1
                stats["exact_matches"] += 1
                continue
            
            # If no exact match, try fuzzy matching
            # Convert the connection object to be compatible with our fuzzy matching method
            brand_objs = [brand for brand in brands]
            potential_matches = self.fuzzy_match_company_name(company_name, brand_objs)
            if potential_matches and potential_matches[0][1] >= CONFIDENCE_THRESHOLD:
                brand_id, confidence = potential_matches[0]
                if connection_degree == 1:
                    brand_connections[brand_id]["first"] += 1
                else:
                    brand_connections[brand_id]["second"] += 1
                stats["fuzzy_matches"] += 1
            else:
                stats["no_matches"] += 1
        
        # Delete existing brand connections for this user using async method
        await self.db.execute(
            text(f"DELETE FROM brand_connections WHERE user_id = '{user_id}'")
        )
        
        # Save the results
        for brand_id, counts in brand_connections.items():
            if counts["first"] > 0 or counts["second"] > 0:
                # Insert with correct column names for the brand_connections table
                now = datetime.now().isoformat()
                await self.db.execute(
                    text(f"""
                        INSERT INTO brand_connections 
                        (user_id, brand_id, first_degree_count, second_degree_count, last_updated) 
                        VALUES ('{user_id}', '{brand_id}', {counts['first']}, {counts['second']}, '{now}')
                    """)
                )
                stats["brands_with_connections"] += 1
        
        # Commit changes        
        await self.db.commit()
        return stats

    async def save_brand_connection(
        self, brand_connection_data: BrandConnectionCreate
    ) -> BrandConnection:
        """
        Save a brand connection to the database.
        
        Args:
            brand_connection_data: The brand connection data to save
            
        Returns:
            The created or updated BrandConnection object
        """
        # Check if brand connection already exists
        existing = self.db.query(BrandConnection).filter(
            BrandConnection.user_id == brand_connection_data.user_id,
            BrandConnection.brand_id == brand_connection_data.brand_id
        ).first()
        
        if existing:
            # Update existing brand connection
            existing.first_degree_count = brand_connection_data.first_degree_count
            existing.second_degree_count = brand_connection_data.second_degree_count
            existing.last_updated = datetime.now()
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            # Create new brand connection
            db_brand_connection = BrandConnection(
                user_id=brand_connection_data.user_id,
                brand_id=brand_connection_data.brand_id,
                first_degree_count=brand_connection_data.first_degree_count,
                second_degree_count=brand_connection_data.second_degree_count
            )
            self.db.add(db_brand_connection)
            self.db.commit()
            self.db.refresh(db_brand_connection)
            return db_brand_connection

    async def get_brand_connections(
        self, user_id: UUID, min_connections: int = 0
    ) -> List[BrandConnectionResponse]:
        """
        Get all brand connections for a user.
        
        Args:
            user_id: The user's UUID
            min_connections: Minimum total connections to include
            
        Returns:
            List of BrandConnectionResponse objects
        """
        # Use raw SQL for compatibility with both sync and async sessions
        from sqlalchemy import text
        
        # Query for brand connections with join to brands
        query = f"""
            SELECT 
                bc.id, bc.user_id, bc.brand_id, bc.first_degree_count, bc.second_degree_count, 
                b.id as brand_id, b.name as brand_name, b.industry, b.company_type
            FROM brand_connections bc
            JOIN brands b ON bc.brand_id = b.id
            WHERE bc.user_id = '{user_id}'
        """
        
        result = await self.db.execute(text(query))
        rows = result.fetchall()
        
        # Convert to response format
        responses = []
        for row in rows:
            # Extract fields from the row by position
            first_degree_count = row[3]
            second_degree_count = row[4]
            brand_id = row[5]
            brand_name = row[6]
            industry = row[7]
            company_type = row[8]
            
            total = first_degree_count + second_degree_count
            
            # Skip if below minimum connection threshold
            if total < min_connections:
                continue
                
            responses.append(BrandConnectionResponse(
                brand_id=brand_id,
                brand_name=brand_name,
                industry=industry,
                company_type=company_type,
                first_degree_count=first_degree_count,
                second_degree_count=second_degree_count,
                total_connections=total
            ))
            
        # Sort by total connections (highest first)
        responses.sort(key=lambda x: x.total_connections, reverse=True)
        return responses

    async def get_brand_connection(
        self, user_id: UUID, brand_id: UUID
    ) -> Optional[BrandConnectionResponse]:
        """
        Get brand connection for a specific brand.
        
        Args:
            user_id: The user's UUID
            brand_id: The brand's UUID
            
        Returns:
            BrandConnectionResponse object if found, None otherwise
        """
        # Use raw SQL for compatibility with both sync and async sessions
        from sqlalchemy import text
        
        # Query for brand connection with join to brand
        query = f"""
            SELECT 
                bc.id, bc.user_id, bc.brand_id, bc.first_degree_count, bc.second_degree_count, 
                b.id as brand_id, b.name as brand_name, b.industry, b.company_type
            FROM brand_connections bc
            JOIN brands b ON bc.brand_id = b.id
            WHERE bc.user_id = '{user_id}' AND bc.brand_id = '{brand_id}'
        """
        
        result = await self.db.execute(text(query))
        row = result.fetchone()
        
        if not row:
            return None
            
        # Extract fields from the row by position
        first_degree_count = row[3]
        second_degree_count = row[4]
        brand_id = row[5]
        brand_name = row[6]
        industry = row[7]
        company_type = row[8]
        
        return BrandConnectionResponse(
            brand_id=brand_id,
            brand_name=brand_name,
            industry=industry,
            company_type=company_type,
            first_degree_count=first_degree_count,
            second_degree_count=second_degree_count,
            total_connections=first_degree_count + second_degree_count
        )