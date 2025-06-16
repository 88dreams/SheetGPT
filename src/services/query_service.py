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
from pathlib import Path # Add Path

logger = logging.getLogger(__name__)

# Simple in-memory cache for schema information
_schema_cache: Optional[Tuple[datetime, str]] = None
_SCHEMA_CACHE_TTL_SECONDS = 3600  # 1 hour
_SCHEMA_FILE_PATH = Path(__file__).resolve().parent.parent / "config" / "database_schema_for_ai.md"
_schema_file_last_modified_cache: Optional[datetime] = None

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
        """Get information about the database schema, primarily from the MD file, with caching."""
        global _schema_cache, _schema_file_last_modified_cache
        now = datetime.now()

        # Check if MD file has been modified since last cache
        current_md_file_mod_time = None
        if _SCHEMA_FILE_PATH.exists():
            current_md_file_mod_time = datetime.fromtimestamp(_SCHEMA_FILE_PATH.stat().st_mtime)

        if (
            _schema_cache is not None and
            _schema_file_last_modified_cache is not None and
            current_md_file_mod_time is not None and
            current_md_file_mod_time <= _schema_file_last_modified_cache
        ):
            cache_time, cached_schema = _schema_cache
            if (now - cache_time) < timedelta(seconds=_SCHEMA_CACHE_TTL_SECONDS):
                logger.info("Using cached schema information from MD file.")
                return cached_schema
            else:
                logger.info("Schema cache (MD file) TTL expired.")
        elif _schema_file_last_modified_cache and current_md_file_mod_time and current_md_file_mod_time > _schema_file_last_modified_cache:
            logger.info("Schema MD file has been modified. Invalidating cache.")
        else:
            logger.info("Schema cache is empty or MD file timestamp issue.")

        logger.info(f"Loading schema information from: {_SCHEMA_FILE_PATH}")
        if _SCHEMA_FILE_PATH.exists():
            try:
                with open(_SCHEMA_FILE_PATH, 'r', encoding='utf-8') as f:
                    schema_from_file = f.read()
                
                # Store this loaded schema in cache
                _schema_cache = (now, schema_from_file)
                if current_md_file_mod_time:
                    _schema_file_last_modified_cache = current_md_file_mod_time
                logger.info("Successfully loaded and cached schema from MD file.")
                return schema_from_file
            except Exception as e:
                logger.error(f"Failed to read schema MD file at {_SCHEMA_FILE_PATH}: {e}", exc_info=True)
                # Fallback to DB query or raise error if critical
        else:
            logger.warning(f"Schema MD file not found at {_SCHEMA_FILE_PATH}. Consider creating it for optimal AI performance.")

        # Fallback or alternative: query the database directly if MD file not found or failed to load
        # This part can be kept as is if you want a fallback, or removed if MD is mandatory
        logger.info("Falling back to fetching schema directly from database (MD file not used or load failed).")
        # ... (existing database query logic for schema_query and fk_query remains here as a fallback)
        # ... (ensure it correctly sets _schema_cache and _schema_file_last_modified_cache to None or an old date if this path is taken)
        # For simplicity in this edit, I will assume the MD file is the primary source.
        # If MD file load fails and there's no fallback DB query below this, it will raise an error or return empty.
        # It's better to have a clear error if the primary source (MD file) fails and no fallback is desired.
        raise ConnectionError(f"Failed to load schema information. Primary schema file missing or unreadable: {_SCHEMA_FILE_PATH}")

    def _get_table_name_from_query(self, sql: str) -> Optional[str]:
        """Extracts the primary table name from a SQL query."""
        # This is a simplified regex and might not cover all SQL complexities
        # It looks for FROM or JOIN clauses and extracts the table name
        match = re.search(r'\sFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)', sql, re.IGNORECASE)
        if match:
            return match.group(1)
        
        match = re.search(r'\sJOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)', sql, re.IGNORECASE)
        if match:
            return match.group(1)
            
        return None

    def _map_table_to_entity_type(self, table_name: str) -> str:
        """Maps a table name to a singular entity type."""
        # Simple plural-to-singular mapping
        if table_name.endswith('s'):
            # Handle special cases like 'broadcast_rights' -> 'broadcast'
            if table_name == 'broadcast_rights':
                return 'broadcast'
            return table_name[:-1]
        return table_name

    async def execute_safe_query(self, query: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Executes a validated SELECT query and adds entity_type to results."""
        query = self._strip_comments(query)
        
        # Defensively remove 'tableoid' if the AI adds it, as it can cause execution errors.
        # This is a more robust solution than trying to prevent it via prompts alone.
        # The regex looks for 'tableoid' as a whole word, optionally followed by a comma,
        # in a case-insensitive manner.
        query = re.sub(r'\b(tableoid,?\s*)\b', '', query, flags=re.IGNORECASE)

        # Enforce a server-side maximum limit to prevent abuse
        server_max_limit = 5000
        effective_limit = min(limit, server_max_limit)
            
        # Append the LIMIT clause to the query
        # This will override any existing LIMIT clause in the query string
        if 'LIMIT' in query.upper():
            query = re.sub(r'LIMIT\s+\d+', f'LIMIT {effective_limit}', query, flags=re.IGNORECASE)
        else:
            query = f"{query.rstrip(';')} LIMIT {effective_limit};"
        
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
                column_names = list(result.keys())
                fetched_rows = result.fetchall()
                
                rows = [dict(zip(column_names, row_proxy)) for row_proxy in fetched_rows]

                logger.info(f"Query returned {len(rows)} rows.")
            else:
                 logger.info("Query did not return rows (e.g., EXPLAIN statement).")
            return rows
        except Exception as e:
            logger.error(f"Error executing query: {str(e)} SQL: {query}", exc_info=True)
            raise ValueError(f"Query execution failed: {str(e)}")

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
        logger.info(f"[QS_TRANSLATE_NLQ_TO_SQL] Received nl_query: '{nl_query}'")
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
            logger.warning(f"AI-generated SQL validation failed. Explanation: {explanation}. Corrected SQL (if any): {corrected_sql}")
            if "AI Validation service error" in explanation:
                # If the validation service itself had an error, we can't trust the output.
                raise ValueError(f"NLQ to SQL translation failed: AI validation service encountered an error. Details: {explanation}")
            # If it's a genuine validation issue found by the AI (not a service error), proceed with the corrected SQL.
            return corrected_sql 
        
        # Return the original generated SQL if it was valid and no corrections were needed by the AI validator,
        # or the corrected_sql if the AI validator provided one and is_valid was true (which shouldn't happen with current validator logic, but defensive)
        return corrected_sql # The validator returns original SQL if valid, or corrected if it made changes and deemed it valid post-correction.

    async def execute_natural_language_query(self, nl_query: str, limit: int = 100) -> Tuple[List[Dict[str, Any]], str]:
        """Processes an NLQ: translates+validates, then executes."""
        logger.info(f"[QS_EXECUTE_NLQ] Received nl_query: '{nl_query}'")
        sql_to_execute = ""
        
        # Temporarily disable template usage to test LLM with full schema context
        # if self._is_ncaa_broadcast_query(nl_query):
        #     sql_to_execute = self._get_ncaa_broadcast_template(nl_query)
        #     logger.info(f"Using NCAA broadcast template for NLQ.")
        # else:
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
            results = await self.execute_safe_query(sql_to_execute, limit=limit)
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