import os
import csv
import io
import re
import json
import logging
import asyncio
from typing import List, Dict, Any, Tuple, Optional, Union
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.services.anthropic_service import AnthropicService

# Configure logging
logger = logging.getLogger(__name__)

class DatabaseManagementService:
    """Service for database management operations."""
    
    def __init__(self, db: AsyncSession, anthropic_service: AnthropicService):
        """
        Initialize the database management service.
        
        Args:
            db: SQLAlchemy async session
            anthropic_service: AnthropicService instance
        """
        self.db = db
        self.anthropic_service = anthropic_service
        
    async def execute_safe_query(self, query: str) -> List[Dict[str, Any]]:
        """
        Execute a SQL query with safety checks to prevent destructive operations.
        
        Args:
            query: SQL query string
            
        Returns:
            List of dictionaries representing rows of results
        """
        # Strip comments and normalize whitespace
        query = self._strip_comments(query)
        query = re.sub(r'\s+', ' ', query).strip()
        
        # Check that this is a SELECT query
        if not re.match(r'^\s*SELECT', query, re.IGNORECASE):
            logger.error(f"Query rejected: not a SELECT statement")
            raise ValueError("Only SELECT queries are allowed.")
        
        # Check for forbidden operations
        forbidden_patterns = [
            r'\sDROP\s', r'\sDELETE\s', r'\sTRUNCATE\s', r'\sALTER\s',
            r'\sCREATE\s', r'\sINSERT\s', r'\sUPDATE\s', r'\sGRANT\s',
            r'\sREVOKE\s'
        ]
        
        for pattern in forbidden_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                operation = pattern.strip().replace('\\s', '')
                logger.error(f"Query rejected: contains forbidden operation '{operation}'")
                raise ValueError(f"Forbidden operation detected: {operation}")
        
        # Log the query (for debugging/auditing)
        logger.info(f"Executing query: {query}")
        
        try:
            # Execute the query
            result = await self.db.execute(text(query))
            
            # Convert to a list of dictionaries
            rows = []
            for row in result.fetchall():
                if hasattr(row, '_asdict'):
                    # Named tuple-like results
                    rows.append(row._asdict())
                elif hasattr(row, 'keys'):
                    # Dict-like results
                    rows.append({key: row[key] for key in row.keys()})
                else:
                    # Raw tuple results - convert to dict with column indices
                    rows.append({f"col{i}": val for i, val in enumerate(row)})
            
            return rows
            
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            raise ValueError(f"Query execution failed: {str(e)}")
            
    async def translate_natural_language_to_sql(self, nl_query: str) -> str:
        """
        Convert a natural language query to SQL without executing it.
        
        Args:
            nl_query: Natural language query string
            
        Returns:
            Generated SQL query string
        """
        # Get the database schema information
        schema_info = await self._get_schema_info()
        
        # Analyze the query to identify potential sports-related entities
        sports_entities = []
        common_sports_terms = ['NCAA', 'basketball', 'football', 'league', 'team', 'broadcast', 'rights', 
                              'division', 'conference', 'sport', 'games']
        
        for term in common_sports_terms:
            if re.search(rf'\b{term}\b', nl_query, re.IGNORECASE):
                sports_entities.append(term)
        
        # Add specialized guidance based on entities detected
        specialized_guidance = ""
        if sports_entities:
            specialized_guidance = "\nSpecialized Guidance:\n"
            
            if 'broadcast' in sports_entities or 'rights' in sports_entities:
                specialized_guidance += """1. For broadcast rights queries:
   - Check both entity_type='league' AND division_conference_id for comprehensive results
   - Always include deleted_at IS NULL conditions
   - Join with broadcast_companies to get company names
   - When filtering leagues, use ILIKE with wildcards for better matching
"""
                
            if any(entity in ['NCAA', 'division', 'conference'] for entity in sports_entities):
                specialized_guidance += """2. For NCAA/division/conference related queries:
   - Check both direct league associations AND division/conference associations
   - When querying NCAA, join leagues to divisions_conferences via league_id
   - Look for matches in both league names AND division/conference names
   - Use COALESCE to handle NULL values in joins
"""
        
        # Build a prompt for Claude to convert natural language to SQL
        prompt = f"""You are an expert SQL developer specializing in sports broadcasting databases. Convert the following natural language query to a PostgreSQL SQL query.

Database Schema:
{schema_info}

Natural Language Query:
{nl_query}{specialized_guidance}

Rules:
1. Only generate a SELECT query - other operations are not allowed
2. Use proper SQL syntax for PostgreSQL
3. Return ONLY the final SQL query with no other text or explanation
4. Do not use DROP, DELETE, TRUNCATE, ALTER, CREATE, INSERT, UPDATE, GRANT, or REVOKE commands
5. Limit results to 100 rows unless otherwise specified
6. For sports data queries:
   - Always include explicit JOIN conditions with proper relationship handling
   - Use LEFT JOINS when appropriate to prevent data exclusion
   - Handle NULL values properly with COALESCE or IS NULL checks
   - For broadcast rights, check for the right entity_type and division_conference_id
   - Use CASE statements for conditional column display when needed

SQL Query:"""

        try:
            # Get the SQL query from Claude
            sql_query = await self.anthropic_service.generate_code(prompt, temperature=0.2)
                
            # Clean up the response - extract just the SQL if Claude wrapped it in markdown
            sql_query = re.sub(r'^```sql\s*', '', sql_query, flags=re.MULTILINE)
            sql_query = re.sub(r'\s*```$', '', sql_query, flags=re.MULTILINE)
            sql_query = sql_query.strip()
            
            # Perform basic validation checks
            has_broadcast_where = False
            has_entity_type_check = False
            
            # Check if this is a broadcast_rights query that might need special handling
            if 'broadcast_rights' in sql_query and 'leagues' in sql_query and ('NCAA' in nl_query or 'basketball' in nl_query):
                # Validate if it checks both league and conference paths
                has_broadcast_where = 'WHERE' in sql_query
                has_entity_type_check = 'entity_type' in sql_query
                has_division_conference = 'division_conference' in sql_query
                
                # If missing important checks, add a warning in logs
                if not (has_entity_type_check and has_division_conference):
                    logger.warning(f"Generated SQL may be incomplete for broadcast rights query: missing entity_type or division_conference checks")
            
            # Log the generated SQL
            logger.info(f"Generated SQL from natural language (translate only): {sql_query}")
            
            return sql_query
            
        except Exception as e:
            logger.error(f"Error in natural language translation: {str(e)}")
            raise ValueError(f"Failed to translate natural language query: {str(e)}")
    
    async def execute_natural_language_query(self, nl_query: str) -> Tuple[List[Dict[str, Any]], str]:
        """
        Convert a natural language query to SQL and execute it.
        
        Args:
            nl_query: Natural language query string
            
        Returns:
            Tuple containing:
              - List of dictionaries representing rows of results
              - Generated SQL query string
        """
        try:
            # Check for common query patterns that might need special handling
            if self._is_ncaa_broadcast_query(nl_query):
                # Use a pre-defined template for NCAA broadcast rights
                sql_query = self._get_ncaa_broadcast_template(nl_query)
                logger.info(f"Using NCAA broadcast template for query: {nl_query}")
            else:
                # Generate the SQL query using AI
                sql_query = await self.translate_natural_language_to_sql(nl_query)
            
            # Execute the generated SQL query
            results = await self.execute_safe_query(sql_query)
            
            # Return both the results and the generated SQL
            return results, sql_query
            
        except Exception as e:
            logger.error(f"Error in natural language query: {str(e)}")
            raise ValueError(f"Failed to process natural language query: {str(e)}")
    
    def _is_ncaa_broadcast_query(self, query: str) -> bool:
        """
        Check if the query appears to be asking about NCAA broadcast rights
        """
        # Look for key terms that indicate NCAA broadcast rights query
        ncaa_terms = ['ncaa', 'college', 'collegiate']
        broadcast_terms = ['broadcast', 'rights', 'tv', 'television']
        sport_terms = ['basketball', 'football', 'baseball', 'hockey', 'sport']
        
        has_ncaa = any(term in query.lower() for term in ncaa_terms)
        has_broadcast = any(term in query.lower() for term in broadcast_terms)
        has_sport = any(term in query.lower() for term in sport_terms)
        
        return has_ncaa and has_broadcast
    
    def _get_ncaa_broadcast_template(self, query: str) -> str:
        """
        Return a pre-built template for NCAA broadcast rights queries,
        with filters customized based on the query text
        """
        # Extract sports from the query if mentioned
        sports_filter = ""
        common_sports = {
            'basketball': "parent_league.sport ILIKE '%Basketball%'",
            'football': "parent_league.sport ILIKE '%Football%'",
            'baseball': "parent_league.sport ILIKE '%Baseball%'",
            'hockey': "parent_league.sport ILIKE '%Hockey%'"
        }
        
        for sport, condition in common_sports.items():
            if sport in query.lower():
                sports_filter = f"AND {condition}"
                break
                
        # Build the template with proper joins for all possible NCAA broadcast rights paths
        template = f"""
        SELECT 
            br.id, 
            br.entity_type,
            COALESCE(l.name, parent_league.name) AS league_name,
            CASE 
                WHEN dc.id IS NOT NULL THEN dc.name 
                ELSE 'League-wide'
            END AS entity_name,
            bc.name AS broadcaster,
            br.territory,
            br.start_date,
            br.end_date,
            br.is_exclusive
        FROM broadcast_rights br
        LEFT JOIN leagues l ON br.entity_type = 'league' AND br.entity_id = l.id
        LEFT JOIN divisions_conferences dc ON br.division_conference_id = dc.id
        LEFT JOIN leagues parent_league ON dc.league_id = parent_league.id
        JOIN broadcast_companies bc ON br.broadcast_company_id = bc.id
        WHERE (
            -- Direct league broadcast rights
            (br.entity_type = 'league' AND l.name ILIKE '%NCAA%')
            OR
            -- Conference/division broadcast rights for NCAA leagues
            (br.division_conference_id IS NOT NULL AND parent_league.name ILIKE '%NCAA%')
        )
        {sports_filter}
        AND br.deleted_at IS NULL
        AND COALESCE(l.deleted_at, parent_league.deleted_at) IS NULL
        ORDER BY league_name, entity_name, broadcaster
        LIMIT 100;
        """
        
        return template
            
    async def _get_schema_info(self) -> str:
        """
        Get information about the database schema for natural language to SQL conversion.
        
        Returns:
            String describing database tables and their columns
        """
        # Query PostgreSQL information schema to get table and column data
        schema_query = text("""
            SELECT 
                t.table_name, 
                c.column_name, 
                c.data_type,
                c.is_nullable,
                pg_catalog.obj_description(
                    (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass::oid, 
                    'pg_class'
                ) as table_description
            FROM 
                information_schema.tables t
            JOIN 
                information_schema.columns c 
                ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE 
                t.table_schema = 'public'
                AND t.table_type = 'BASE TABLE'
            ORDER BY 
                t.table_name, 
                c.ordinal_position
        """)
        
        # Query to get foreign key relationships
        fk_query = text("""
            SELECT
                kcu.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
        """)
        
        # Execute the schema query
        result = await self.db.execute(schema_query)
        rows = result.fetchall()
        
        # Execute the foreign key query
        fk_result = await self.db.execute(fk_query)
        fk_rows = fk_result.fetchall()
        
        # Build a map of foreign key relationships
        foreign_keys = {}
        for fk in fk_rows:
            table_name = fk[0]
            column_name = fk[1]
            foreign_table = fk[2]
            foreign_column = fk[3]
            
            if table_name not in foreign_keys:
                foreign_keys[table_name] = {}
                
            foreign_keys[table_name][column_name] = f"{foreign_table}.{foreign_column}"
        
        # Group by table
        tables = {}
        for row in rows:
            table_name = row[0]
            column_name = row[1]
            data_type = row[2]
            is_nullable = row[3]
            table_description = row[4] or ""
            nullable_text = "" if is_nullable == "YES" else " NOT NULL"
            
            if table_name not in tables:
                tables[table_name] = {
                    "columns": [],
                    "description": table_description
                }
                
            # Check if this column is a foreign key
            fk_info = ""
            if table_name in foreign_keys and column_name in foreign_keys[table_name]:
                fk_info = f" REFERENCES {foreign_keys[table_name][column_name]}"
                
            tables[table_name]["columns"].append(f"{column_name} ({data_type}{nullable_text}{fk_info})")
            
        # Format schema info
        schema_info = []
        
        # Add common entity relationship notes
        schema_info.append("# Important Entity Relationships:")
        schema_info.append("1. broadcast_rights can be associated with leagues directly (entity_type='league' AND entity_id=leagues.id)")
        schema_info.append("2. broadcast_rights can also be for divisions/conferences (division_conference_id IS NOT NULL)")
        schema_info.append("3. divisions_conferences belong to leagues via league_id")
        schema_info.append("4. When querying for sports entities, check both direct relationships AND indirect relationships through divisions_conferences")
        schema_info.append("5. For NCAA searches, include both league-level rights AND conference-level rights")
        schema_info.append("6. For broadcast rights, always join appropriate company tables")
        schema_info.append("")
        
        # Add table schemas
        for table_name, table_data in tables.items():
            schema_info.append(f"Table: {table_name}")
            if table_data["description"]:
                schema_info.append(f"Description: {table_data['description']}")
            schema_info.append("Columns:")
            for column in table_data["columns"]:
                schema_info.append(f"  - {column}")
            schema_info.append("")  # Add blank line between tables
            
        return "\n".join(schema_info)
    
    async def export_query_results_to_csv(self, results: List[Dict[str, Any]]) -> str:
        """
        Export query results to CSV format.
        
        Args:
            results: List of dictionaries representing rows of results
            
        Returns:
            CSV data as a string
        """
        if not results:
            return ""
            
        # Use StringIO to build CSV in memory
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=results[0].keys())
        
        # Write header and rows
        writer.writeheader()
        writer.writerows(results)
        
        return output.getvalue()
        
    async def export_query_results_to_json(self, results: List[Dict[str, Any]]) -> str:
        """
        Export query results to JSON format.
        
        Args:
            results: List of dictionaries representing rows of results
            
        Returns:
            JSON data as a string
        """
        # Handle date/datetime objects which are not JSON serializable
        def json_serial(obj):
            """JSON serializer for objects not serializable by default json code"""
            if isinstance(obj, (datetime)):
                return obj.isoformat()
            raise TypeError(f"Type {type(obj)} not serializable")
            
        return json.dumps(results, indent=2, default=json_serial)
        
    def _strip_comments(self, sql: str) -> str:
        """
        Remove SQL comments from a query.
        
        Args:
            sql: SQL query string
            
        Returns:
            SQL query without comments
        """
        # Remove single line comments (-- comment)
        sql = re.sub(r'--.*?$', '', sql, flags=re.MULTILINE)
        
        # Remove multi-line comments (/* comment */)
        sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
        
        return sql