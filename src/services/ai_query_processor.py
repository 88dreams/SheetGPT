import abc
import re
from typing import Tuple, List
from src.services.anthropic_service import AnthropicService
import logging

logger = logging.getLogger(__name__)

class AIQueryProcessor(abc.ABC):
    """
    Abstract interface for AI-powered query processing tasks.
    """

    @abc.abstractmethod
    async def generate_sql_from_text(
        self, natural_language_query: str, schema_info: str, specialized_guidance: str
    ) -> str:
        """
        Generates SQL from natural language text.

        Args:
            natural_language_query: The user's query in natural language.
            schema_info: String describing the database schema.
            specialized_guidance: String containing additional context or rules for the AI.

        Returns:
            The generated SQL query string.
        """
        pass

    @abc.abstractmethod
    async def validate_and_correct_sql(
        self, sql_query: str, db_type: str = "PostgreSQL"
    ) -> Tuple[bool, str, str]:
        """
        Validates an SQL query and attempts to correct it if issues are found.

        Args:
            sql_query: The SQL query to validate.
            db_type: The type of database (e.g., "PostgreSQL") for specific validation.

        Returns:
            A tuple: (is_valid, corrected_sql, explanation_message).
        """
        pass

class AnthropicAIProcessor(AIQueryProcessor):
    """
    Concrete implementation of AIQueryProcessor using the Anthropic (Claude) service.
    """
    def __init__(self, anthropic_service: AnthropicService):
        self.anthropic_service = anthropic_service

    async def generate_sql_from_text(
        self, natural_language_query: str, schema_info: str, specialized_guidance: str
    ) -> str:
        logger.info(f"[AI_PROCESSOR_GENERATE_SQL] Received natural_language_query: '{natural_language_query}'")
        prompt = f"""You are an expert SQL developer specializing in sports broadcasting databases. Convert the following natural language query to a PostgreSQL SQL query.

Database Schema:
{schema_info}

Natural Language Query:
{natural_language_query}

{specialized_guidance}

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
7. When the user\'s query includes a specific string value intended for filtering a column (e.g., a name, a type, a status like \'In-House Production\'), use that exact string value from the user\'s query in the SQL comparison (e.g., in `LOWER(column) = LOWER(\'User Provided Value\')`). Preserve punctuation like hyphens from the user\'s value.

SQL Query:"""

        try:
            sql_query = await self.anthropic_service.generate_code(prompt, temperature=0.2)
            
            # Clean up the response - extract just the SQL if Claude wrapped it in markdown
            sql_query = re.sub(r'^```sql\s*', '', sql_query, flags=re.MULTILINE)
            sql_query = re.sub(r'\s*```$', '', sql_query, flags=re.MULTILINE)
            sql_query = sql_query.strip()
            
            logger.info(f"AnthropicAIProcessor generated SQL: {sql_query}")
            return sql_query
            
        except Exception as e:
            logger.error(f"Error in AnthropicAIProcessor.generate_sql_from_text: {str(e)}")
            raise ValueError(f"Failed to generate SQL from text via Anthropic: {str(e)}")

    async def validate_and_correct_sql(
        self, sql_query: str, db_type: str = "PostgreSQL"
    ) -> Tuple[bool, str, str]:
        prompt = f"""As an expert {db_type} SQL validator, analyze this query for errors and common pitfalls.
Focus on {db_type}-specific syntax errors and runtime issues, particularly:

1. Using ORDER BY with SELECT DISTINCT incorrectly
2. Ordering issues in aggregation functions like STRING_AGG
3. Using columns in ORDER BY that aren't in the SELECT clause
4. GROUP BY issues with aggregation functions
5. Syntax errors in CTEs (WITH clauses)
6. JOIN condition errors
7. Subquery syntax issues
8. Improper use of window functions
9. Invalid column references

SQL query to validate:
```sql
{sql_query}
```

If you find issues, provide:
1. A clear explanation of each issue
2. A corrected version of the query
3. Why the correction works

If no issues are found, respond with: "VALID: The query appears syntactically correct."
If issues are found, start with: "INVALID: Found the following issues:"

Response format:
[VALID/INVALID status]
[Explanation if INVALID]
[Corrected SQL if INVALID]"""

        try:
            validation_result = await self.anthropic_service.generate_code(prompt, temperature=0.1)
            
            is_valid = validation_result.startswith("VALID")
            
            if is_valid:
                return True, sql_query, ""
            else:
                corrected_sql_match = re.search(r'```sql\s*(.*?)\s*```', validation_result, re.DOTALL)
                corrected_sql = corrected_sql_match.group(1).strip() if corrected_sql_match else sql_query

                explanation = validation_result
                if corrected_sql_match:
                    explanation = explanation.replace(corrected_sql_match.group(0), "").strip()
                explanation = explanation.replace("INVALID: Found the following issues:", "").strip()

                logger.info(f"AnthropicAIProcessor SQL validation found issues. Explanation (start): {explanation[:100]}...")
                
                if corrected_sql != sql_query :
                     logger.info(f"AnthropicAIProcessor provided corrected SQL: {corrected_sql}")
                     return False, corrected_sql, explanation
                else:
                    logger.warning("AnthropicAIProcessor validation marked SQL as invalid but did not provide a distinct corrected version.")
                    return False, sql_query, explanation

        except Exception as e:
            logger.error(f"Error during AI SQL validation: {str(e)}", exc_info=True)
            # If any exception occurs during validation, it's not valid.
            # Return False, the original query (as it wasn't corrected), and the error message.
            return False, sql_query, f"AI Validation service error: {str(e)}" 