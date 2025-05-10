import re
import logging
import csv
import io
import json
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, date, timedelta # Added timedelta for cache TTL
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.services.ai_query_processor import AIQueryProcessor # Import the new interface

logger = logging.getLogger(__name__)

# Simple in-memory cache for schema information
_schema_cache: Optional[Tuple[datetime, str]] = None
_SCHEMA_CACHE_TTL_SECONDS = 3600  # 1 hour

class QueryService:
    """
    Service for database query operations, including NLQ processing and SQL execution.
    """
    def __init__(self, db: AsyncSession, ai_processor: AIQueryProcessor):
        self.db = db
        self.ai_processor = ai_processor

    def _strip_comments(self, sql: str) -> str:
        """Remove SQL comments from a query."""
        sql = re.sub(r'--.*?$', '', sql, flags=re.MULTILINE)
        sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
        return sql.strip() # Added strip here

    async def _get_schema_info(self) -> str:
        """Get information about the database schema, with caching."""
        global _schema_cache
        now = datetime.now()

        # Check cache validity
        if _schema_cache is not None:
            cache_time, cached_schema = _schema_cache
            # Use timedelta for clearer comparison
            if (now - cache_time) < timedelta(seconds=_SCHEMA_CACHE_TTL_SECONDS):
                logger.info("Using cached schema information.")
                return cached_schema
            else:
                logger.info("Schema cache expired.")
        else:
            logger.info("Schema cache is empty.")

        logger.info("Fetching fresh schema information.")
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
        
        try:
            result = await self.db.execute(schema_query)
            rows = result.fetchall()
            fk_result = await self.db.execute(fk_query)
            fk_rows = fk_result.fetchall()
        except Exception as e:
            logger.error(f"Failed to fetch schema or FK info: {e}", exc_info=True)
            # Return empty string or raise? Returning empty might lead to poor AI results.
            raise ConnectionError("Failed to fetch database schema information.") from e

        foreign_keys = {}
        for fk in fk_rows:
            table_name, column_name, foreign_table, foreign_column = fk[0], fk[1], fk[2], fk[3]
            if table_name not in foreign_keys:
                foreign_keys[table_name] = {}
            foreign_keys[table_name][column_name] = f"{foreign_table}.{foreign_column}"
        
        tables = {}
        for row in rows:
            table_name, column_name, data_type, is_nullable, table_description = row[0], row[1], row[2], row[3], row[4] or ""
            nullable_text = "" if is_nullable == "YES" else " NOT NULL"
            if table_name not in tables:
                tables[table_name] = {"columns": [], "description": table_description}
            
            fk_info = ""
            if table_name in foreign_keys and column_name in foreign_keys[table_name]:
                fk_info = f" REFERENCES {foreign_keys[table_name][column_name]}"
            tables[table_name]["columns"].append(f"{column_name} ({data_type}{nullable_text}{fk_info})")
            
        schema_info_parts = []
        schema_info_parts.append("# Important Entity Relationships:")
        schema_info_parts.append("1. broadcast_rights can be associated with leagues directly (entity_type='league' AND entity_id=leagues.id)")
        schema_info_parts.append("2. broadcast_rights can also be for divisions/conferences (division_conference_id IS NOT NULL)")
        schema_info_parts.append("3. divisions_conferences belong to leagues via league_id")
        schema_info_parts.append("4. When querying for sports entities, check both direct relationships AND indirect relationships through divisions_conferences")
        schema_info_parts.append("5. For NCAA searches, include both league-level rights AND conference-level rights")
        schema_info_parts.append("6. For broadcast rights, always join appropriate company tables")
        schema_info_parts.append("")

        for table_name, table_data in tables.items():
            schema_info_parts.append(f"Table: {table_name}")
            if table_data["description"]:
                schema_info_parts.append(f"Description: {table_data['description']}")
            schema_info_parts.append("Columns:")
            for column in table_data["columns"]:
                schema_info_parts.append(f"  - {column}")
            schema_info_parts.append("")
            
        final_schema_info = "\n".join(schema_info_parts)
        _schema_cache = (now, final_schema_info) # Update cache
        logger.info("Successfully fetched and cached fresh schema information.")
        return final_schema_info

    async def execute_safe_query(self, query: str) -> List[Dict[str, Any]]:
        """Executes a validated SELECT query."""
        query = self._strip_comments(query) # Ensure comments are stripped even if called directly
        
        # Basic check again, although primary validation should happen before calling this
        if not re.match(r'^\s*SELECT', query, re.IGNORECASE):
            logger.error(f"execute_safe_query called with non-SELECT statement: {query[:100]}...")
            raise ValueError("Only SELECT queries should be executed here.")
            
        # Consider removing keyword checks here if validation is robust enough
        # Keeping them provides a secondary defense layer
        forbidden_patterns = [
            r'DROP', r'DELETE', r'TRUNCATE', r'ALTER', r'CREATE', 
            r'INSERT', r'UPDATE', r'GRANT', r'REVOKE'
        ]
        for pattern in forbidden_patterns:
            # Use word boundaries for better accuracy
            if re.search(r'\b' + pattern + r'\b', query, re.IGNORECASE):
                logger.error(f"Query rejected by keyword check: contains forbidden operation '{pattern}': {query[:100]}...")
                raise ValueError(f"Forbidden operation detected: {pattern}")

        logger.info(f"Executing safe query: {query}")
        try:
            result = await self.db.execute(text(query))
            rows = []
            if result.returns_rows:
                # Using keys() and fetchall() is generally robust with SQLAlchemy
                column_names = list(result.keys())
                fetched_rows = result.fetchall()
                rows = [dict(zip(column_names, row_proxy)) for row_proxy in fetched_rows]
                logger.info(f"Query returned {len(rows)} rows.")
            else:
                 logger.info("Query did not return rows (e.g., EXPLAIN statement).")
            return rows
        except Exception as e:
            logger.error(f"Error executing query: {str(e)} SQL: {query}", exc_info=True)
            # Add more specific error handling if possible (e.g., catch DB connection errors, syntax errors)
            raise ValueError(f"Query execution failed: {str(e)}") # Re-raise as ValueError for API handling

    def _is_ncaa_broadcast_query(self, query: str) -> bool:
        """Checks if the query appears to be about NCAA broadcast rights."""
        ncaa_terms = ['ncaa', 'college', 'collegiate']
        broadcast_terms = ['broadcast', 'rights', 'tv', 'television']
        # Check requires both NCAA context and broadcast context
        return any(term in query.lower() for term in ncaa_terms) and \
               any(term in query.lower() for term in broadcast_terms)

    def _get_ncaa_broadcast_template(self, query: str) -> str:
        """Returns a pre-built template for NCAA broadcast rights queries."""
        sports_filter = ""
        # Consider making this more robust (e.g., list of sports from config/DB)
        common_sports = {
            'basketball': "parent_league.sport ILIKE '%Basketball%'",
            'football': "parent_league.sport ILIKE '%Football%'",
            'baseball': "parent_league.sport ILIKE '%Baseball%'",
            'hockey': "parent_league.sport ILIKE '%Hockey%'"
        }
        for sport, condition in common_sports.items():
            if sport in query.lower():
                sports_filter = f"AND {condition}"
                logger.info(f"Applying sports filter for '{sport}' in NCAA template.")
                break
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
            (br.entity_type = 'league' AND l.name ILIKE '%NCAA%') OR
            (br.division_conference_id IS NOT NULL AND parent_league.name ILIKE '%NCAA%')
        )
        {sports_filter}
        AND br.deleted_at IS NULL
        AND COALESCE(l.deleted_at, parent_league.deleted_at) IS NULL
        ORDER BY league_name, entity_name, broadcaster
        LIMIT 100;""" # Consider making LIMIT configurable or removing it from template?
        return template

    async def validate_sql_query(self, sql_query: str) -> Tuple[bool, str, str]:
        """Validates a user-provided SQL query using the AI processor."""
        logger.info(f"Validating user-provided SQL: {sql_query[:100]}...")
        is_valid, corrected_sql, explanation = await self.ai_processor.validate_and_correct_sql(sql_query)
        if not is_valid:
            logger.warning(f"User SQL validation issues. Explanation: {explanation}. Corrected: {corrected_sql[:100]}...")
        return is_valid, corrected_sql, explanation

    async def translate_natural_language_to_sql(self, nl_query: str) -> str:
        """Converts natural language to SQL, then validates the result."""
        schema_info = await self._get_schema_info()
        
        # Build specialized_guidance (ensure this logic is sound)
        specialized_guidance_parts = []
        common_sports_terms = ['NCAA', 'basketball', 'football', 'league', 'team', 'broadcast', 'rights', 'division', 'conference', 'sport', 'games']
        sports_entities_found = [term for term in common_sports_terms if re.search(rf'\b{term}\b', nl_query, re.IGNORECASE)]

        if sports_entities_found:
            specialized_guidance_parts.append("\nSpecialized Guidance:")
            if 'broadcast' in sports_entities_found or 'rights' in sports_entities_found:
                specialized_guidance_parts.append("""1. For broadcast rights queries:
   - Check both entity_type='league' AND division_conference_id for comprehensive results
   - Always include deleted_at IS NULL conditions
   - Join with broadcast_companies to get company names
   - When filtering leagues, use ILIKE with wildcards for better matching""")
            if any(entity in ['NCAA', 'division', 'conference'] for entity in sports_entities_found):
                specialized_guidance_parts.append("""2. For NCAA/division/conference related queries:
   - Check both direct league associations AND division/conference associations
   - When querying NCAA, join leagues to divisions_conferences via league_id
   - Look for matches in both league names AND division/conference names
   - Use COALESCE to handle NULL values in joins""")
        
        specialized_guidance_parts.append("""IMPORTANT PostgreSQL Restrictions:
1. When using SELECT DISTINCT, all ORDER BY columns must appear in the SELECT list
2. For STRING_AGG with ORDER BY, ensure the ordering column is included in select list if using DISTINCT
3. In CTEs with UNION, each SELECT must have the same column count and compatible data types
4. All GROUP BY expressions must appear in the SELECT list, or be used in aggregate functions
5. Window functions cannot be used with DISTINCT unless the DISTINCT is in a subquery""")
        specialized_guidance = "\n".join(specialized_guidance_parts)

        # Call AI Processor to generate SQL
        generated_sql = await self.ai_processor.generate_sql_from_text(nl_query, schema_info, specialized_guidance)
        
        logger.info(f"NLQ translated to SQL (pre-validation): {generated_sql}")
        
        # Call AI processor to validate the generated SQL
        is_valid, corrected_sql, explanation = await self.ai_processor.validate_and_correct_sql(generated_sql)
        
        if not is_valid:
            logger.warning(f"AI-generated SQL had validation issues: {explanation}. Using corrected version: {corrected_sql}")
            # Return the corrected version if validation failed
            return corrected_sql 
        
        # Return the original generated SQL if it was valid
        return generated_sql

    async def execute_natural_language_query(self, nl_query: str) -> Tuple[List[Dict[str, Any]], str]:
        """Processes an NLQ: uses template or translates+validates, then executes."""
        logger.info(f"Executing NLQ: {nl_query[:100]}...")
        sql_to_execute = ""
        
        # Check for specific patterns first (e.g., NCAA template)
        if self._is_ncaa_broadcast_query(nl_query):
            sql_to_execute = self._get_ncaa_broadcast_template(nl_query)
            logger.info(f"Using NCAA broadcast template for NLQ.")
        else:
            # General case: Translate NLQ to SQL (includes validation)
            try:
                 sql_to_execute = await self.translate_natural_language_to_sql(nl_query)
            except ValueError as e:
                 logger.error(f"Failed to translate NLQ '{nl_query[:50]}...' to SQL: {e}")
                 # Propagate the error to the API layer
                 raise ValueError(f"Could not translate question to SQL: {e}") from e
            except Exception as e:
                 logger.error(f"Unexpected error during NLQ translation: {e}", exc_info=True)
                 raise ValueError("An unexpected error occurred during query translation.") from e

        # Execute the final SQL (either from template or translated/validated)
        try:
            results = await self.execute_safe_query(sql_to_execute)
            return results, sql_to_execute
        except ValueError as e:
             logger.error(f"Execution failed for SQL derived from NLQ '{nl_query[:50]}...': {e}")
             # Let execute_safe_query's ValueError propagate up
             raise
        except Exception as e:
             logger.error(f"Unexpected error during safe query execution for NLQ: {e}", exc_info=True)
             raise ValueError("An unexpected error occurred during query execution.") from e


    # --- Export Methods (kept separate from core query logic) ---

    async def export_query_results_to_csv(self, results: List[Dict[str, Any]]) -> str:
        """Exports query results to a CSV formatted string."""
        if not results:
            logger.warning("Export to CSV called with no results.")
            return ""
        output = io.StringIO()
        try:
            # Use keys from the first row for headers
            fieldnames = list(results[0].keys())
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(results)
            logger.info(f"Successfully exported {len(results)} rows to CSV string.")
            return output.getvalue()
        except Exception as e:
            logger.error(f"Failed to generate CSV string: {e}", exc_info=True)
            # Depending on caller, might want to raise or return error indicator
            raise ValueError("Failed to generate CSV export data") from e
        
    async def export_query_results_to_json(self, results: List[Dict[str, Any]]) -> str:
        """Exports query results to a JSON formatted string."""
        if not results:
             logger.warning("Export to JSON called with no results.")
             return "[]"
             
        def json_serial(obj):
            """Custom serializer for types not handled by default json."""
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            # Add other types like UUID if needed
            # from uuid import UUID
            # if isinstance(obj, UUID):
            #    return str(obj)
            try:
                # Attempt default serialization for other types
                return str(obj) # Fallback to string representation
            except TypeError:
                 logger.error(f"Type {type(obj)} not serializable for JSON export.")
                 return None # Or raise a more specific error

        try:
            json_string = json.dumps(results, indent=2, default=json_serial)
            logger.info(f"Successfully exported {len(results)} rows to JSON string.")
            return json_string
        except Exception as e:
             logger.error(f"Failed to generate JSON string: {e}", exc_info=True)
             raise ValueError("Failed to generate JSON export data") from e 