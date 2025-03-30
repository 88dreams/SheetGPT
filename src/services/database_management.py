import os
import sys
import csv
import io
import re
import json
import logging
import asyncio
import subprocess
import shutil
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional, Union
from datetime import datetime, date
from sqlalchemy import text, inspect
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
        
    async def mark_conversation_archived(self, conversation_id):
        """
        Mark a conversation as archived.
        
        Args:
            conversation_id: UUID of the conversation to archive
            
        Returns:
            None
        """
        # Check if conversation exists
        query = text("""
            SELECT id FROM conversations 
            WHERE id = :conversation_id AND deleted_at IS NULL
        """)
        
        result = await self.db.execute(query, {"conversation_id": conversation_id})
        if not result.scalar_one_or_none():
            raise ValueError(f"Conversation {conversation_id} not found or already deleted")
        
        # Check if is_archived column exists
        check_column_query = text("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'conversations'
                AND column_name = 'is_archived'
            )
        """)
        has_is_archived = await self.db.execute(check_column_query)
        has_is_archived = has_is_archived.scalar_one()
        
        if has_is_archived:
            # Update the conversation
            update_query = text("""
                UPDATE conversations
                SET is_archived = true
                WHERE id = :conversation_id
            """)
            
            await self.db.execute(update_query, {"conversation_id": conversation_id})
            await self.db.commit()
        else:
            # If the column doesn't exist, let the user know
            logger.warning(f"Cannot archive conversation {conversation_id}: is_archived column does not exist")
            raise ValueError("Archive feature is not available in this version")
        
    async def restore_archived_conversation(self, conversation_id):
        """
        Restore a previously archived conversation.
        
        Args:
            conversation_id: UUID of the conversation to restore
            
        Returns:
            None
        """
        # Check if is_archived column exists
        check_column_query = text("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'conversations'
                AND column_name = 'is_archived'
            )
        """)
        has_is_archived = await self.db.execute(check_column_query)
        has_is_archived = has_is_archived.scalar_one()
        
        if not has_is_archived:
            logger.warning(f"Cannot restore conversation {conversation_id}: is_archived column does not exist")
            raise ValueError("Archive feature is not available in this version")
        
        # Check if conversation exists and is archived
        query = text("""
            SELECT id FROM conversations 
            WHERE id = :conversation_id AND is_archived = true AND deleted_at IS NULL
        """)
        
        result = await self.db.execute(query, {"conversation_id": conversation_id})
        if not result.scalar_one_or_none():
            raise ValueError(f"Conversation {conversation_id} not found or not archived")
        
        # Update the conversation
        update_query = text("""
            UPDATE conversations
            SET is_archived = false
            WHERE id = :conversation_id
        """)
        
        await self.db.execute(update_query, {"conversation_id": conversation_id})
        await self.db.commit()
        
    async def get_database_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the database.
        
        Returns:
            Dict with database statistics
        """
        # Get user count
        # Check if table exists and has the deleted_at column
        check_table_query = text("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'users'
            )
        """)
        has_users = await self.db.execute(check_table_query)
        has_users = has_users.scalar_one()
        
        if has_users:
            # Check if deleted_at column exists
            check_column_query = text("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                    AND column_name = 'deleted_at'
                )
            """)
            has_deleted_at = await self.db.execute(check_column_query)
            has_deleted_at = has_deleted_at.scalar_one()
            
            if has_deleted_at:
                user_query = text("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL")
            else:
                user_query = text("SELECT COUNT(*) FROM users")
                
            user_count = await self.db.execute(user_query)
            user_count = user_count.scalar_one()
        else:
            user_count = 0
        
        # Get conversation counts
        # First check if is_archived column exists in conversations table
        check_column_query = text("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'conversations'
                AND column_name = 'is_archived'
            )
        """)
        has_is_archived = await self.db.execute(check_column_query)
        has_is_archived = has_is_archived.scalar_one()
        
        if has_is_archived:
            conv_query = text("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_archived = true THEN 1 ELSE 0 END) as archived,
                    SUM(CASE WHEN is_archived = false THEN 1 ELSE 0 END) as active
                FROM conversations
                WHERE deleted_at IS NULL
            """)
        else:
            # Fallback if the column doesn't exist - treat all as active
            conv_query = text("""
                SELECT 
                    COUNT(*) as total,
                    0 as archived,
                    COUNT(*) as active
                FROM conversations
                WHERE deleted_at IS NULL
            """)
        conv_result = await self.db.execute(conv_query)
        conv_row = conv_result.fetchone()
        conversation_count = {
            "total": conv_row[0],
            "archived": conv_row[1],
            "active": conv_row[2]
        }
        
        # Get message count
        # Check if table exists and has the deleted_at column
        check_table_query = text("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'messages'
            )
        """)
        has_messages = await self.db.execute(check_table_query)
        has_messages = has_messages.scalar_one()
        
        if has_messages:
            # Check if deleted_at column exists
            check_column_query = text("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'messages'
                    AND column_name = 'deleted_at'
                )
            """)
            has_deleted_at = await self.db.execute(check_column_query)
            has_deleted_at = has_deleted_at.scalar_one()
            
            if has_deleted_at:
                msg_query = text("SELECT COUNT(*) FROM messages WHERE deleted_at IS NULL")
            else:
                msg_query = text("SELECT COUNT(*) FROM messages")
                
            message_count = await self.db.execute(msg_query)
            message_count = message_count.scalar_one()
        else:
            message_count = 0
        
        # Calculate average messages per conversation
        avg_messages = 0
        if conversation_count["total"] > 0:
            avg_messages = round(message_count / conversation_count["total"], 1)
        
        # Get structured data count - first check if table exists
        check_table_query = text("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'structured_data'
            )
        """)
        has_structured_data = await self.db.execute(check_table_query)
        has_structured_data = has_structured_data.scalar_one()
        
        if has_structured_data:
            # Check if deleted_at column exists
            check_column_query = text("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'structured_data'
                    AND column_name = 'deleted_at'
                )
            """)
            has_deleted_at = await self.db.execute(check_column_query)
            has_deleted_at = has_deleted_at.scalar_one()
            
            if has_deleted_at:
                structured_query = text("SELECT COUNT(*) FROM structured_data WHERE deleted_at IS NULL")
            else:
                structured_query = text("SELECT COUNT(*) FROM structured_data")
                
            structured_result = await self.db.execute(structured_query)
            structured_data_count = structured_result.scalar_one()
        else:
            structured_data_count = 0
        
        # Get database size estimate
        size_query = text("""
            SELECT pg_database_size(current_database()) / (1024 * 1024.0) as size_mb
        """)
        size_result = await self.db.execute(size_query)
        estimated_storage_mb = size_result.scalar_one()
        
        # Get recent activity statistics - check if conversations table exists
        check_table_query = text("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'conversations'
            )
        """)
        has_conversations = await self.db.execute(check_table_query)
        has_conversations = has_conversations.scalar_one()
        
        if has_conversations:
            # Check if created_at and deleted_at columns exist
            check_created_at_query = text("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'conversations'
                    AND column_name = 'created_at'
                )
            """)
            has_created_at = await self.db.execute(check_created_at_query)
            has_created_at = has_created_at.scalar_one()
            
            check_deleted_at_query = text("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'conversations'
                    AND column_name = 'deleted_at'
                )
            """)
            has_deleted_at = await self.db.execute(check_deleted_at_query)
            has_deleted_at = has_deleted_at.scalar_one()
            
            if has_created_at:
                # Build the query based on whether deleted_at exists
                if has_deleted_at:
                    activity_query = text("""
                        SELECT 
                            SUM(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END) as last_day,
                            SUM(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as last_7_days,
                            SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as last_30_days
                        FROM conversations
                        WHERE deleted_at IS NULL
                    """)
                else:
                    activity_query = text("""
                        SELECT 
                            SUM(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END) as last_day,
                            SUM(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as last_7_days,
                            SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as last_30_days
                        FROM conversations
                    """)
                    
                activity_result = await self.db.execute(activity_query)
                recent_activity = dict(zip(["last_day", "last_7_days", "last_30_days"], activity_result.fetchone()))
            else:
                # No created_at column, so no way to determine recency
                recent_activity = {"last_day": 0, "last_7_days": 0, "last_30_days": 0}
        else:
            # No conversations table
            recent_activity = {"last_day": 0, "last_7_days": 0, "last_30_days": 0}
        
        return {
            "user_count": user_count,
            "conversation_count": conversation_count,
            "message_count": message_count,
            "avg_messages_per_conversation": avg_messages,
            "structured_data_count": structured_data_count,
            "estimated_storage_mb": estimated_storage_mb,
            "recent_activity": recent_activity
        }
        
    async def backup_database(self) -> str:
        """
        Create a database backup by directly executing SQL.
        
        Returns:
            Path to the created backup file
        """
        # Get database connection parameters from environment variables
        db_host = os.environ.get("DB_HOST", "localhost")
        db_port = os.environ.get("DB_PORT", "5432")
        db_user = os.environ.get("DB_USER", "postgres")
        db_pass = os.environ.get("DB_PASSWORD", "postgres")
        db_name = os.environ.get("DB_NAME", "sheetgpt")
        
        # Create backups directory with absolute path to ensure it exists
        # First try to create a directory that should be writable
        backup_dir = Path("/tmp/sheetgpt_backups")
        try:
            backup_dir.mkdir(exist_ok=True, parents=True)
            logger.info(f"Created or verified backup directory at {backup_dir}")
        except Exception as e:
            logger.error(f"Error creating backup directory at {backup_dir}: {str(e)}")
            raise Exception(f"Cannot create backup directory: {str(e)}")
        
        # Generate backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"backup_{timestamp}.sql"
        
        # Verify the directory and file path
        logger.info(f"Working directory: {os.getcwd()}")
        logger.info(f"Backup directory exists: {backup_dir.exists()}")
        logger.info(f"Backup directory is writable: {os.access(str(backup_dir), os.W_OK)}")
        logger.info(f"Creating backup at: {backup_file}")
        
        try:
            # Execute simple schema dump directly via SQL instead of pg_dump
            # This is more reliable since it doesn't depend on external tools
            
            # First, get a list of tables
            tables_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            
            result = await self.db.execute(tables_query)
            tables = [r[0] for r in result.fetchall()]
            
            # Generate SQL header
            sql_content = [
                "-- Database backup created by SheetGPT",
                f"-- Timestamp: {datetime.now().isoformat()}",
                "-- Tables: " + ", ".join(tables),
                "",
                "BEGIN;",
                ""
            ]
            
            # For each table, get the schema and data
            for table in tables:
                # Get table schema
                schema_query = text(f"""
                    SELECT 
                        'CREATE TABLE ' || 
                        quote_ident(table_schema) || '.' || quote_ident(table_name) || 
                        '(' || 
                        string_agg(
                            quote_ident(column_name) || ' ' || data_type || 
                            CASE 
                                WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
                                ELSE ''
                            END ||
                            CASE 
                                WHEN is_nullable = 'NO' THEN ' NOT NULL'
                                ELSE ''
                            END,
                            ', '
                        ) || 
                        ');' AS create_statement
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = :table_name
                    GROUP BY table_schema, table_name;
                """)
                
                schema_result = await self.db.execute(schema_query, {"table_name": table})
                create_statement = schema_result.scalar_one_or_none()
                
                # Add table creation statement
                if create_statement:
                    sql_content.append(f"-- Creating table {table}")
                    sql_content.append(create_statement)
                    sql_content.append("")
                
                # For small tables, include the data
                if table not in ["messages", "structured_data"]:  # Skip large tables
                    data_query = text(f"SELECT * FROM {table} LIMIT 1000")
                    data_result = await self.db.execute(data_query)
                    rows = data_result.fetchall()
                    
                    if rows:
                        sql_content.append(f"-- Inserting data into {table}")
                        for row in rows:
                            # Create INSERT statement for this row
                            values = []
                            for value in row:
                                if value is None:
                                    values.append("NULL")
                                elif isinstance(value, (int, float)):
                                    values.append(str(value))
                                else:
                                    # Escape single quotes for SQL - cannot use backslash in f-string
                                    escaped_value = str(value).replace("'", "''")
                                    values.append(f"'{escaped_value}'")
                            
                            sql_content.append(f"INSERT INTO {table} VALUES ({', '.join(values)});")
                        
                        sql_content.append("")
            
            # End transaction
            sql_content.append("COMMIT;")
            
            # Write the SQL to file
            with open(backup_file, "w") as f:
                f.write("\n".join(sql_content))
            
            logger.info(f"Database backup completed successfully: {backup_file}")
            return str(backup_file)
            
        except Exception as e:
            logger.error(f"Error creating database backup: {str(e)}", exc_info=True)
            raise Exception(f"Backup failed: {str(e)}")
            
    def list_backups(self) -> List[Dict[str, Any]]:
        """
        List available database backups.
        
        Returns:
            List of backup information dictionaries
        """
        # Use the same directory as in backup_database
        backup_dir = Path("/tmp/sheetgpt_backups")
        
        backups = []
        
        # Check for backups
        if backup_dir.exists():
            logger.info(f"Checking for backups in {backup_dir}")
            # Scan for backup files
            for backup_file in sorted(backup_dir.glob("backup_*.sql"), reverse=True):
                try:
                    # Get file stats
                    stats = backup_file.stat()
                    created_at = datetime.fromtimestamp(stats.st_ctime)
                    size_bytes = stats.st_size
                    size_mb = round(size_bytes / (1024 * 1024), 2)
                    
                    backups.append({
                        "filename": backup_file.name,
                        "path": str(backup_file),
                        "created_at": created_at.isoformat(),
                        "size_bytes": size_bytes,
                        "size_mb": size_mb
                    })
                except Exception as e:
                    logger.error(f"Error getting info for backup {backup_file}: {str(e)}")
                    continue
                
        return backups
        
    async def get_maintenance_status(self) -> Dict[str, Any]:
        """
        Get the current status of database maintenance operations.
        
        Returns:
            Dict with maintenance status information
        """
        # Check if system_metadata table exists
        check_table_query = text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'system_metadata'
            )
        """)
        
        table_exists_result = await self.db.execute(check_table_query)
        table_exists = table_exists_result.scalar_one()
        
        if not table_exists:
            # Return default status if table doesn't exist
            return {
                "backup_exists": len(self.list_backups()) > 0,
                "last_backup_time": None,
                "dry_run_completed": False,
                "dry_run_time": None,
                "cleanup_completed": False,
                "cleanup_time": None,
                "vacuum_completed": False,
                "vacuum_time": None
            }
        
        # Get maintenance status from system_metadata
        status_query = text("""
            SELECT value FROM system_metadata
            WHERE key = 'maintenance_status'
        """)
        
        status_result = await self.db.execute(status_query)
        status_row = status_result.scalar_one_or_none()
        
        if not status_row:
            # Return default status if no record found
            return {
                "backup_exists": len(self.list_backups()) > 0,
                "last_backup_time": None,
                "dry_run_completed": False,
                "dry_run_time": None,
                "cleanup_completed": False,
                "cleanup_time": None,
                "vacuum_completed": False,
                "vacuum_time": None
            }
        
        # Parse stored JSON status
        try:
            # Handle different types of status_row
            if isinstance(status_row, str):
                status = json.loads(status_row)
            elif isinstance(status_row, (dict, list)):
                status = status_row
            else:
                logger.warning(f"Unexpected maintenance status type: {type(status_row)}")
                status = {}
            
            # Check if there are any backups
            backups = self.list_backups()
            backup_exists = len(backups) > 0
            last_backup_time = backups[0]["created_at"] if backup_exists else None
            
            # Combine with backup information
            return {
                "backup_exists": backup_exists,
                "last_backup_time": last_backup_time,
                "dry_run_completed": status.get("dry_run_completed", False),
                "dry_run_time": status.get("dry_run_time"),
                "dry_run_results": status.get("dry_run_results"),
                "cleanup_completed": status.get("cleanup_completed", False),
                "cleanup_time": status.get("cleanup_time"),
                "cleanup_results": status.get("cleanup_results"),
                "vacuum_completed": status.get("vacuum_completed", False),
                "vacuum_time": status.get("vacuum_time"),
                "vacuum_results": status.get("vacuum_results")
            }
        except Exception as e:
            logger.error(f"Error parsing maintenance status: {str(e)}")
            return {
                "backup_exists": len(self.list_backups()) > 0,
                "last_backup_time": None,
                "dry_run_completed": False,
                "error": str(e)
            }
            
    async def run_cleanup_dry_run(self) -> Dict[str, Any]:
        """
        Run database cleanup in dry-run mode (analysis only, no changes).
        
        Returns:
            Dict with analysis results
        """
        try:
            # Import the DatabaseCleanupService from db_cleanup.py script
            from src.scripts.db_cleanup import DatabaseCleanupService
            
            # Create a new DatabaseCleanupService instance with dry_run=True
            cleanup_service = DatabaseCleanupService(self.db, dry_run=True)
            
            # Run the full cleanup in dry run mode
            stats = await cleanup_service.run_full_cleanup()
            
            # Extract and format the results
            analysis_results = {
                "duplicates_total": sum(stats.get("duplicates_found", {}).values()),
                "missing_relationships": sum(stats.get("relationships_repaired", {}).values()),
                "name_standardizations": sum([count for key, count in stats.get("relationships_repaired", {}).items() 
                                             if "name_standardization" in key]),
                "constraints_needed": len(stats.get("constraints_added", [])),
                "timestamp": datetime.now().isoformat(),
                "detailed_results": stats  # Include the full stats for detailed reporting
            }
            
            # Update the maintenance status in the database
            await self._update_dry_run_status(analysis_results)
            
            return {
                "success": True,
                **analysis_results
            }
            
        except Exception as e:
            logger.error(f"Error in cleanup dry run: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _update_dry_run_status(self, analysis_results: Dict[str, Any]):
        """Update the dry run status in system_metadata table."""
        try:
            # Convert any non-serializable objects to strings first
            def ensure_serializable(obj):
                if isinstance(obj, (datetime, date)):
                    return obj.isoformat()
                elif isinstance(obj, (set, frozenset)):
                    return list(obj)
                return obj
                
            # Check if system_metadata table exists
            check_table_query = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'system_metadata'
                )
            """)
            
            table_exists_result = await self.db.execute(check_table_query)
            table_exists = table_exists_result.scalar_one()
            
            if not table_exists:
                # Create the table if it doesn't exist
                create_table_query = text("""
                    CREATE TABLE system_metadata (
                        key VARCHAR(255) PRIMARY KEY,
                        value JSONB NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
                
                await self.db.execute(create_table_query)
                logger.info("Created system_metadata table")
            
            # Get current maintenance status
            status_query = text("""
                SELECT value FROM system_metadata
                WHERE key = 'maintenance_status'
            """)
            
            status_result = await self.db.execute(status_query)
            status_row = status_result.scalar_one_or_none()
            
            maintenance_data = {}
            if status_row:
                if isinstance(status_row, str):
                    maintenance_data = json.loads(status_row)
                elif isinstance(status_row, (dict, list)):
                    maintenance_data = status_row
                else:
                    logger.warning(f"Unexpected maintenance status type: {type(status_row)}")
            
            # For better logging
            logger.info(f"Current maintenance data type: {type(maintenance_data)}")
            
            # Update dry run status
            maintenance_data_copy = dict(maintenance_data)  # Create a copy to avoid modifying the original
            maintenance_data_copy.update({
                "dry_run_completed": True,
                "dry_run_time": datetime.now().isoformat(),
                "dry_run_results": {
                    "analysis": analysis_results,
                    "would_fix": {
                        "duplicates_removed": analysis_results["duplicates_total"],
                        "relationships_fixed": analysis_results["missing_relationships"],
                        "names_standardized": analysis_results["name_standardizations"],
                        "constraints_added": analysis_results["constraints_needed"]
                    }
                }
            })
            
            # Convert to JSON string
            maintenance_json = json.dumps(maintenance_data_copy, default=ensure_serializable)
            logger.info(f"Serialized maintenance data: {maintenance_json[:100]}...")
            
            # Upsert the data - use simpler approach to ensure compatibility
            try:
                # First try using positional parameters (preferred)
                upsert_query = text("""
                    INSERT INTO system_metadata (key, value, updated_at)
                    VALUES ('maintenance_status', $1::jsonb, NOW())
                    ON CONFLICT (key)
                    DO UPDATE SET value = $1::jsonb, updated_at = NOW()
                """)
                
                await self.db.execute(upsert_query, [maintenance_json])
                logger.info("Updated dry run status using positional parameters")
            except Exception as e:
                logger.warning(f"Error using positional parameters: {str(e)}, trying named parameters")
                # Fall back to named parameters if positional fails
                upsert_query = text("""
                    INSERT INTO system_metadata (key, value, updated_at)
                    VALUES ('maintenance_status', :value::jsonb, NOW())
                    ON CONFLICT (key)
                    DO UPDATE SET value = :value::jsonb, updated_at = NOW()
                """)
                
                await self.db.execute(upsert_query, {"value": maintenance_json})
            
            await self.db.commit()
            
            logger.info("Updated dry run status in system_metadata")
            
        except Exception as e:
            logger.error(f"Error updating dry run status: {str(e)}", exc_info=True)
            # Don't re-raise the exception, just log it
            # Update frontend logic instead
            
    async def run_cleanup(self) -> Dict[str, Any]:
        """
        Run database cleanup to fix duplicates and repair relationships.
        
        Returns:
            Dict with cleanup results
        """
        try:
            # Import the DatabaseCleanupService from db_cleanup.py script
            from src.scripts.db_cleanup import DatabaseCleanupService
            
            # Create a new DatabaseCleanupService instance with dry_run=False for actual changes
            cleanup_service = DatabaseCleanupService(self.db, dry_run=False)
            
            # Set a flag to indicate this is an API call, so it will skip interactive prompts
            cleanup_service.api_call = True
            
            # Set environment variable for backward compatibility
            os.environ["AUTOMATED_CLEANUP"] = "1"
            
            try:
                # Run the full cleanup for real
                stats = await cleanup_service.run_full_cleanup()
            except Exception as e:
                logger.error(f"Error during cleanup process: {str(e)}")
                # Make sure to rollback on error
                await self.db.rollback()
                # Return error 
                return {
                    "success": False,
                    "error": f"Cleanup process failed: {str(e)}"
                }
            
            # Extract and format the results - simplify to avoid serialization issues
            fixed_results = {
                "duplicates_removed": sum(stats.get("duplicates_removed", {}).values()),
                "relationships_fixed": sum(stats.get("relationships_repaired", {}).values()),
                "constraints_added": len(stats.get("constraints_added", [])),
                "timestamp": datetime.now().isoformat(),
                "success": stats.get("success", True)
            }
            
            # Always set cleanup as completed, even if there were no changes
            # This ensures the UI can progress to the next step
            await self._update_cleanup_status(fixed_results)
            
            # Just to be sure, force another update using a direct SQL approach
            try:
                # Direct SQL update as a fallback 
                direct_update = text("""
                    UPDATE system_metadata 
                    SET value = jsonb_set(
                        CASE WHEN value::jsonb IS NULL THEN '{}'::jsonb ELSE value::jsonb END, 
                        '{cleanup_completed}', 
                        'true'::jsonb
                    ),
                    updated_at = NOW()
                    WHERE key = 'maintenance_status'
                """)
                await self.db.execute(direct_update)
                await self.db.commit()
                logger.info("Forced cleanup_completed=true via direct SQL update")
            except Exception as e:
                logger.warning(f"Could not force direct SQL update: {str(e)}")
                # This is not critical, so just log and continue
            
            return {
                "success": True,
                **fixed_results
            }
            
        except Exception as e:
            logger.error(f"Error in cleanup: {str(e)}", exc_info=True)
            # Make sure to rollback
            try:
                await self.db.rollback()
            except Exception:
                pass
            return {
                "success": False,
                "error": str(e)
            }
            
    async def _update_cleanup_status(self, fixed_results: Dict[str, Any]):
        """Update the cleanup status in system_metadata table with a simplified, reliable approach."""
        try:
            # Check if system_metadata table exists
            check_table_query = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'system_metadata'
                )
            """)
            
            table_exists_result = await self.db.execute(check_table_query)
            table_exists = table_exists_result.scalar_one()
            
            if not table_exists:
                # Create the table if it doesn't exist
                create_table_query = text("""
                    CREATE TABLE system_metadata (
                        key VARCHAR(255) PRIMARY KEY,
                        value TEXT NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
                
                await self.db.execute(create_table_query)
                logger.info("Created system_metadata table")
            
            # Get current maintenance status
            status_query = text("""
                SELECT value FROM system_metadata
                WHERE key = 'maintenance_status'
            """)
            
            status_result = await self.db.execute(status_query)
            status_row = status_result.scalar_one_or_none()
            
            # Prepare maintenance data
            maintenance_data = {}
            if status_row:
                try:
                    if isinstance(status_row, str):
                        maintenance_data = json.loads(status_row)
                    elif isinstance(status_row, (dict, list)):
                        maintenance_data = status_row
                    else:
                        maintenance_data = {}
                except Exception:
                    maintenance_data = {}
            
            # Update cleanup status - simpler structure
            maintenance_data["cleanup_completed"] = True
            maintenance_data["cleanup_time"] = datetime.now().isoformat()
            maintenance_data["cleanup_results"] = fixed_results
            
            # Convert to JSON string with simple serialization
            def json_serial(obj):
                if isinstance(obj, (datetime, date)):
                    return obj.isoformat()
                if isinstance(obj, UUID):
                    return str(obj)
                raise TypeError(f"Type {type(obj)} not serializable")
                
            maintenance_json = json.dumps(maintenance_data, default=json_serial)
            
            # Use direct SQL query without type cast to avoid syntax issues
            # Store as TEXT instead of JSONB to simplify
            upsert_query = text("""
                INSERT INTO system_metadata (key, value, updated_at)
                VALUES ('maintenance_status', :value, NOW())
                ON CONFLICT (key)
                DO UPDATE SET value = :value, updated_at = NOW()
            """)
            
            # Execute with simple named parameter
            await self.db.execute(upsert_query, {"value": maintenance_json})
            await self.db.commit()
            
            logger.info("Updated cleanup status in system_metadata successfully")
            
        except Exception as e:
            logger.error(f"Error updating cleanup status: {str(e)}", exc_info=True)
            # Make sure we rollback on error
            try:
                await self.db.rollback()
            except Exception:
                pass
            
    async def run_vacuum(self, skip_reindex: bool = False) -> Dict[str, Any]:
        """
        Run database optimization (VACUUM ANALYZE and optionally REINDEX).
        
        Args:
            skip_reindex: Whether to skip the REINDEX operation
            
        Returns:
            Dict with vacuum results
        """
        try:
            # Import the DatabaseVacuumService from db_vacuum.py script
            from src.scripts.db_vacuum import DatabaseVacuumService
            
            # Create a new DatabaseVacuumService instance
            vacuum_service = DatabaseVacuumService(self.db)
            
            # Run the full vacuum process
            stats = await vacuum_service.run_full_vacuum(include_reindex=not skip_reindex)
            
            # Extract and format the results
            vacuum_results = {
                "space_reclaimed_mb": (stats.get("total_size_before", 0) - stats.get("total_size_after", 0)) / (1024 * 1024),
                "percent_reduction": ((stats.get("total_size_before", 0) - stats.get("total_size_after", 0)) / stats.get("total_size_before", 1)) * 100 if stats.get("total_size_before", 0) > 0 else 0,
                "duration_seconds": stats.get("vacuum_time", 0) + (0 if skip_reindex else stats.get("reindex_time", 0)),
                "size_before_mb": stats.get("total_size_before", 0) / (1024 * 1024),
                "size_after_mb": stats.get("total_size_after", 0) / (1024 * 1024),
                "skip_reindex": skip_reindex,
                "detailed_results": stats  # Include the full stats for detailed reporting
            }
            
            # Store results in system_metadata
            await self._update_vacuum_status(vacuum_results)
            
            return {
                "success": True,
                **vacuum_results
            }
            
        except Exception as e:
            logger.error(f"Error in vacuum: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
            
    async def _update_vacuum_status(self, vacuum_results: Dict[str, Any]):
        """Update the vacuum status in system_metadata table."""
        try:
            # Convert any non-serializable objects to strings first
            def ensure_serializable(obj):
                if isinstance(obj, (datetime, date)):
                    return obj.isoformat()
                elif isinstance(obj, (set, frozenset)):
                    return list(obj)
                return obj
                
            # Check if system_metadata table exists
            check_table_query = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'system_metadata'
                )
            """)
            
            table_exists_result = await self.db.execute(check_table_query)
            table_exists = table_exists_result.scalar_one()
            
            if not table_exists:
                # Create the table if it doesn't exist
                create_table_query = text("""
                    CREATE TABLE system_metadata (
                        key VARCHAR(255) PRIMARY KEY,
                        value JSONB NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
                
                await self.db.execute(create_table_query)
                logger.info("Created system_metadata table")
            
            # Get current maintenance status
            status_query = text("""
                SELECT value FROM system_metadata
                WHERE key = 'maintenance_status'
            """)
            
            status_result = await self.db.execute(status_query)
            status_row = status_result.scalar_one_or_none()
            
            maintenance_data = {}
            if status_row:
                if isinstance(status_row, str):
                    maintenance_data = json.loads(status_row)
                elif isinstance(status_row, (dict, list)):
                    maintenance_data = status_row
                else:
                    logger.warning(f"Unexpected maintenance status type: {type(status_row)}")
            
            # For better logging
            logger.info(f"Current maintenance data type: {type(maintenance_data)}")
            
            # Update vacuum status
            maintenance_data_copy = dict(maintenance_data)  # Create a copy to avoid modifying the original
            maintenance_data_copy.update({
                "vacuum_completed": True,
                "vacuum_time": datetime.now().isoformat(),
                "vacuum_results": vacuum_results
            })
            
            # Convert to JSON string
            maintenance_json = json.dumps(maintenance_data_copy, default=ensure_serializable)
            logger.info(f"Serialized maintenance data: {maintenance_json[:100]}...")
            
            # Upsert the data - use simpler approach to ensure compatibility
            try:
                # First try using positional parameters (preferred)
                upsert_query = text("""
                    INSERT INTO system_metadata (key, value, updated_at)
                    VALUES ('maintenance_status', $1::jsonb, NOW())
                    ON CONFLICT (key)
                    DO UPDATE SET value = $1::jsonb, updated_at = NOW()
                """)
                
                await self.db.execute(upsert_query, [maintenance_json])
                logger.info("Updated vacuum status using positional parameters")
            except Exception as e:
                logger.warning(f"Error using positional parameters: {str(e)}, trying named parameters")
                # Fall back to named parameters if positional fails
                upsert_query = text("""
                    INSERT INTO system_metadata (key, value, updated_at)
                    VALUES ('maintenance_status', :value::jsonb, NOW())
                    ON CONFLICT (key)
                    DO UPDATE SET value = :value::jsonb, updated_at = NOW()
                """)
                
                await self.db.execute(upsert_query, {"value": maintenance_json})
            
            await self.db.commit()
            
            logger.info("Updated vacuum status in system_metadata")
            
        except Exception as e:
            logger.error(f"Error updating vacuum status: {str(e)}", exc_info=True)
            # Don't re-raise the exception, just log it