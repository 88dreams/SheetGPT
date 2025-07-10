import os
import logging
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple, TypedDict, Optional, TYPE_CHECKING
from datetime import datetime, date
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import subprocess

if TYPE_CHECKING:
    from src.scripts.db_cleanup import DatabaseCleanupService
    from src.scripts.db_vacuum import DatabaseVacuumService
else:
    try:
        from src.scripts.db_cleanup import DatabaseCleanupService
        from src.scripts.db_vacuum import DatabaseVacuumService
    except ImportError as e:
        logging.getLogger(__name__).warning(f"Could not import script services: {e}. Cleanup/Vacuum operations might fail.")
        DatabaseCleanupService = None
        DatabaseVacuumService = None

logger = logging.getLogger(__name__)

BACKUP_STATUS_KEY = "maintenance_status"

class CleanupStats(TypedDict, total=False):
    duplicates_found: Dict[str, int]
    duplicates_removed: Dict[str, int]
    relationships_repaired: Dict[str, int]
    name_standardization: Dict[str, int]
    constraints_added: List[str]
    errors: List[str]
    success: bool
    skipped: bool
    integrity_issues: Dict[str, Any]

class VacuumStats(TypedDict, total=False):
    tables: Dict[str, Any]
    indexes: Dict[str, Any]
    total_size_before: int
    total_size_after: int
    vacuum_time: float
    reindex_time: float
    errors: List[str]

class DatabaseAdminService:
    """
    Service for database administrative tasks like backups, maintenance, and status tracking.
    """
    def __init__(self, db: AsyncSession):
        self.db = db

    async def backup_database(self) -> str:
        db_host = os.environ.get("DB_HOST", "localhost")
        db_port = os.environ.get("DB_PORT", "5432")
        db_user = os.environ.get("DB_USER", "postgres")
        db_pass = os.environ.get("DB_PASSWORD", "postgres")
        db_name = os.environ.get("DB_NAME", "sheetgpt")
        
        backup_dir = Path("/tmp/sheetgpt_backups")
        try:
            backup_dir.mkdir(exist_ok=True, parents=True)
        except Exception as e:
            logger.error(f"Error creating backup directory at {backup_dir}: {str(e)}")
            raise Exception(f"Cannot create backup directory: {str(e)}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file_path = backup_dir / f"backup_{timestamp}.sql"
        
        logger.info(f"Creating backup at: {backup_file_path}")
        
        pg_dump_command = [
            "pg_dump",
            f"--dbname=postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}",
            "--format=plain",
            "--clean",
            "--no-owner",
            "--no-privileges",
            f"--file={backup_file_path}"
        ]
        
        try:
            env = os.environ.copy()
            if db_pass:
                 env["PGPASSWORD"] = db_pass

            process = await asyncio.create_subprocess_exec(
                *pg_dump_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )
            stdout, stderr = await process.communicate()
                
            if process.returncode != 0:
                error_message = stderr.decode().strip() if stderr else "Unknown pg_dump error"
                logger.error(f"pg_dump failed with exit code {process.returncode}: {error_message}")
                raise Exception(f"pg_dump failed: {error_message}")

            if stdout:
                logger.info(f"pg_dump stdout: {stdout.decode().strip()}")
            if stderr:
                logger.warning(f"pg_dump stderr: {stderr.decode().strip()}")

            if not backup_file_path.exists() or backup_file_path.stat().st_size == 0:
                raise Exception(f"Backup file {backup_file_path} was not created or is empty.")

            logger.info(f"Database backup completed successfully: {backup_file_path}")
            return str(backup_file_path)
        except FileNotFoundError:
            logger.error("pg_dump command not found. Ensure PostgreSQL client tools are installed and in PATH.")
            raise Exception("pg_dump command not found. Please install PostgreSQL client tools.")
        except Exception as e:
            logger.error(f"Error creating database backup with pg_dump: {str(e)}", exc_info=True)
            if backup_file_path.exists() and backup_file_path.stat().st_size == 0:
                try:
                    backup_file_path.unlink()
                except Exception as rm_err:
                    logger.error(f"Could not remove partial backup file {backup_file_path}: {rm_err}")
            raise Exception(f"Backup failed: {str(e)}")

    def list_backups(self) -> List[Dict[str, Any]]:
        backup_dir = Path("/tmp/sheetgpt_backups")
        backups = []
        if backup_dir.exists():
            for backup_file in sorted(backup_dir.glob("backup_*.sql"), reverse=True):
                try:
                    stats = backup_file.stat()
                    backups.append({
                        "filename": backup_file.name,
                        "path": str(backup_file),
                        "created_at": datetime.fromtimestamp(stats.st_ctime).isoformat(),
                        "size_bytes": stats.st_size,
                        "size_mb": round(stats.st_size / (1024 * 1024), 2)
                    })
                except Exception as e:
                    logger.error(f"Error getting info for backup {backup_file}: {str(e)}")
        return backups

    async def _ensure_system_metadata_table(self):
        check_table_query = text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_metadata')")
        table_exists_result = await self.db.execute(check_table_query)
        if not table_exists_result.scalar_one():
            create_table_query = text("""
                CREATE TABLE system_metadata (
                    key VARCHAR(255) PRIMARY KEY,
                    value JSONB NOT NULL, 
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """)
            await self.db.execute(create_table_query)
            await self.db.commit()
            logger.info("Created system_metadata table")

    async def _get_maintenance_status_json(self) -> Dict[str, Any]:
        await self._ensure_system_metadata_table()
        status_query = text("SELECT value FROM system_metadata WHERE key = :key")
        status_result = await self.db.execute(status_query, {"key": BACKUP_STATUS_KEY})
        status_row = status_result.scalar_one_or_none()
        if status_row:
            if isinstance(status_row, str): return json.loads(status_row)
            if isinstance(status_row, dict): return status_row
            logger.warning(f"Unexpected maintenance status type: {type(status_row)}")
        return {}

    async def _update_maintenance_status_json(self, status_data: Dict[str, Any]):
        await self._ensure_system_metadata_table()
        def json_serial(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            elif isinstance(obj, (set, frozenset)):
                 return list(obj)
            raise TypeError(f"Type {type(obj)} not serializable for maintenance status")

        maintenance_json = json.dumps(status_data, default=json_serial)
        
        upsert_query = text("""
            INSERT INTO system_metadata (key, value, updated_at)
            VALUES (:key, :value::jsonb, NOW())
            ON CONFLICT (key)
            DO UPDATE SET value = :value::jsonb, updated_at = NOW()
        """)
        await self.db.execute(upsert_query, {"key": BACKUP_STATUS_KEY, "value": maintenance_json})
        await self.db.commit()

    async def get_schema_summary(self) -> Dict[str, Any]:
        """Loads and returns the schema summary from the markdown file."""
        try:
            schema_path = Path("src/config/database_schema_for_ai.md")
            if not schema_path.exists():
                logger.error(f"Schema summary file not found at {schema_path}")
                return {"error": "Schema summary file not found."}

            with open(schema_path, "r") as f:
                content = f.read()
            
            json_str = content.split("```json")[1].split("```")[0]
            schema_data = json.loads(json_str)
            if not isinstance(schema_data, dict):
                raise TypeError("Schema summary is not a dictionary.")
            return schema_data

        except (IndexError, json.JSONDecodeError, TypeError) as e:
            logger.error(f"Error parsing schema summary: {e}", exc_info=True)
            return {"error": f"Failed to parse schema summary: {e}"}
        except Exception as e:
            logger.error(f"An unexpected error occurred while getting schema summary: {e}", exc_info=True)
            return {"error": "An unexpected error occurred."}

    async def get_database_stats(self) -> Dict[str, Any]:
        """
        Gathers various statistics about the database.
        """
        if DatabaseVacuumService is None:
            return {"error": "DatabaseVacuumService not available."}
        
        try:
            vacuum_service = DatabaseVacuumService(self.db)
            stats = await vacuum_service.get_table_stats()
            
            total_live_rows = 0
            total_dead_rows = 0
            total_table_size_bytes = 0
            total_index_size_bytes = 0

            for table_stats in stats.values():
                if isinstance(table_stats, dict):
                    total_live_rows += table_stats.get("live_rows", 0)
                    total_dead_rows += table_stats.get("dead_rows", 0)
                    total_table_size_bytes += table_stats.get("total_bytes", 0)
                    
                    index_stats = table_stats.get("indexes", {})
                    if isinstance(index_stats, dict):
                        total_index_size_bytes += sum(v.get("total_bytes", 0) for v in index_stats.values() if isinstance(v, dict))

            return {
                "total_tables": len(stats),
                "total_live_rows": total_live_rows,
                "total_dead_rows": total_dead_rows,
                "total_table_size_mb": round(total_table_size_bytes / (1024 * 1024), 2),
                "total_index_size_mb": round(total_index_size_bytes / (1024 * 1024), 2),
                "total_database_size_mb": round((total_table_size_bytes + total_index_size_bytes) / (1024 * 1024), 2),
                "detailed_stats": stats
            }
        except Exception as e:
            logger.error(f"Error getting database stats: {str(e)}", exc_info=True)
            return {"error": str(e)}

    async def get_maintenance_status(self) -> Dict[str, Any]:
        try:
            status = await self._get_maintenance_status_json()
            backups = self.list_backups()
            return {
                "backup_exists": len(backups) > 0,
                "last_backup_time": backups[0]["created_at"] if backups else None,
                "migrations_completed": status.get("migrations_completed", False),
                "migrations_time": status.get("migrations_time"),
                "migrations_results": status.get("migrations_results"),
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
            logger.error(f"Error parsing maintenance status: {str(e)}", exc_info=True)
            return {"backup_exists": len(self.list_backups()) > 0, "last_backup_time": None, "error": str(e)}

    async def _update_specific_maintenance_status(self, operation_key: str, results_data: Dict[str, Any]):
        current_status = await self._get_maintenance_status_json()
        current_status[f"{operation_key}_completed"] = True
        current_status[f"{operation_key}_time"] = datetime.now().isoformat()
        current_status[f"{operation_key}_results"] = results_data
        
        if results_data.get("status") == "failure":
             current_status[f"{operation_key}_completed"] = False
        elif results_data.get("status") == "success":
            current_status[f"{operation_key}_completed"] = True

        await self._update_maintenance_status_json(current_status)
        logger.info(f"Updated {operation_key} status in system_metadata")

    async def run_cleanup_dry_run(self) -> Dict[str, Any]:
        if DatabaseCleanupService is None:
            logger.error("DatabaseCleanupService not available for dry run.")
            return {"success": False, "error": "Cleanup service not available."}
        try:
            cleanup_service = DatabaseCleanupService(self.db, dry_run=True)
            stats = await cleanup_service.run_full_cleanup()
            
            duplicates_found = sum(stats.get("duplicates_found", {}).values())
            relationships_repaired = sum(stats.get("relationships_repaired", {}).values())
            constraints_needed = len(stats.get("constraints_added", []))

            analysis_results = {
                "duplicates_total": duplicates_found,
                "missing_relationships": relationships_repaired,
                "name_standardizations": sum(count for count in stats.get("name_standardization", {}).values() if isinstance(count, int)),
                "constraints_needed": constraints_needed,
                "timestamp": datetime.now().isoformat(),
                "detailed_results": stats
            }
            await self._update_specific_maintenance_status("dry_run", analysis_results)
            return {"success": True, **analysis_results}
        except Exception as e:
            logger.error(f"Error in cleanup dry run: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}

    async def run_cleanup(self) -> Dict[str, Any]:
        if DatabaseCleanupService is None:
            logger.error("DatabaseCleanupService not available for cleanup.")
            return {"success": False, "error": "Cleanup service not available."}
        try:
            cleanup_service = DatabaseCleanupService(self.db, dry_run=False)
            setattr(cleanup_service, 'api_call', True) # Safely set attribute
            os.environ["AUTOMATED_CLEANUP"] = "1"
            stats = await cleanup_service.run_full_cleanup()

            duplicates_removed = sum(stats.get("duplicates_removed", {}).values())
            relationships_fixed = sum(stats.get("relationships_repaired", {}).values())
            constraints_added = len(stats.get("constraints_added", []))
            
            fixed_results = {
                "duplicates_removed": duplicates_removed,
                "relationships_fixed": relationships_fixed,
                "constraints_added": constraints_added,
                "timestamp": datetime.now().isoformat(),
                "success": stats.get("success", True)
            }
            await self._update_specific_maintenance_status("cleanup", fixed_results)
            
            try:
                direct_update = text("UPDATE system_metadata SET value = jsonb_set(COALESCE(value::jsonb, '{}'::jsonb), '{cleanup_completed}', 'true'::jsonb), updated_at = NOW() WHERE key = :key")
                await self.db.execute(direct_update, {"key": BACKUP_STATUS_KEY})
                await self.db.commit()
            except Exception as e:
                logger.warning(f"Could not force direct SQL update for cleanup_completed: {str(e)}")
            return {"success": True, **fixed_results}
        except Exception as e:
            logger.error(f"Error in cleanup: {str(e)}", exc_info=True)
            await self.db.rollback()
            return {"success": False, "error": str(e)}

    async def run_vacuum(self, skip_reindex: bool = False) -> Dict[str, Any]:
        if DatabaseVacuumService is None:
            logger.error("DatabaseVacuumService not available for vacuum.")
            return {"success": False, "error": "Vacuum service not available."}
        try:
            vacuum_service = DatabaseVacuumService(self.db)
            stats = await vacuum_service.run_full_vacuum(include_reindex=not skip_reindex)

            total_size_before = stats.get("total_size_before", 0)
            total_size_after = stats.get("total_size_after", 0)

            vacuum_results = {
                "space_reclaimed_mb": (total_size_before - total_size_after) / (1024 * 1024),
                "percent_reduction": ((total_size_before - total_size_after) / total_size_before) * 100 if total_size_before > 0 else 0,
                "duration_seconds": stats.get("vacuum_time", 0) + (0 if skip_reindex else stats.get("reindex_time", 0)),
                "size_before_mb": total_size_before / (1024 * 1024),
                "size_after_mb": total_size_after / (1024 * 1024),
                "skip_reindex": skip_reindex,
                "detailed_results": stats
            }
            await self._update_specific_maintenance_status("vacuum", vacuum_results)
            return {"success": True, **vacuum_results}
        except Exception as e:
            logger.error(f"Error in vacuum: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}

    async def mark_conversation_archived(self, conversation_id: UUID):
        """Mark a conversation as archived."""
        query_exists = text("SELECT id FROM conversations WHERE id = :id AND deleted_at IS NULL")
        result_exists = await self.db.execute(query_exists, {"id": conversation_id})
        if not result_exists.scalar_one_or_none():
            raise ValueError(f"Conversation {conversation_id} not found or already deleted")

        check_column_query = text("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'is_archived')")
        has_is_archived_result = await self.db.execute(check_column_query)
        has_is_archived = has_is_archived_result.scalar_one()
        
        if has_is_archived:
            update_query = text("UPDATE conversations SET is_archived = true WHERE id = :id")
            await self.db.execute(update_query, {"id": conversation_id})
            await self.db.commit()
            logger.info(f"Archived conversation {conversation_id}")
        else:
            logger.warning(f"Cannot archive conversation {conversation_id}: is_archived column does not exist")
            raise ValueError("Archive feature is not available in this version")

    async def restore_archived_conversation(self, conversation_id: UUID):
        """Restore a previously archived conversation."""
        check_column_query = text("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'is_archived')")
        has_is_archived_result = await self.db.execute(check_column_query)
        has_is_archived = has_is_archived_result.scalar_one()
        
        if not has_is_archived:
            logger.warning(f"Cannot restore conversation {conversation_id}: is_archived column does not exist")
            raise ValueError("Archive feature is not available in this version")
            
        query_exists = text("SELECT id FROM conversations WHERE id = :id AND is_archived = true AND deleted_at IS NULL")
        result_exists = await self.db.execute(query_exists, {"id": conversation_id})
        if not result_exists.scalar_one_or_none():
             raise ValueError(f"Conversation {conversation_id} not found, not archived, or deleted.")

        update_query = text("UPDATE conversations SET is_archived = false WHERE id = :id")
        await self.db.execute(update_query, {"id": conversation_id})
        await self.db.commit()
        logger.info(f"Restored conversation {conversation_id}") 

    async def run_migrations(self) -> Dict[str, Any]:
        logger.info("Attempting to apply database migrations...")
        try:
            current_dir = Path(__file__).parent
            script_path = current_dir.parent / "scripts" / "alembic_wrapper.py"
            
            if not script_path.exists():
                logger.error(f"Alembic wrapper script not found at {script_path}")
                raise Exception(f"Alembic wrapper script not found at {script_path}")

            command = ["python", str(script_path), "upgrade", "head"]
            
            logger.info(f"Executing migration command: {' '.join(command)}")

            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=current_dir.parent.parent
            )
            
            stdout, stderr = await process.communicate()
            
            output = stdout.decode().strip() if stdout else ""
            error_output = stderr.decode().strip() if stderr else ""

            if process.returncode == 0:
                logger.info(f"Migrations applied successfully. Output: {output}")
                await self._update_specific_maintenance_status("migrations", {"status": "success", "output": output, "errors": error_output})
                return {"success": True, "message": "Database migrations applied successfully.", "output": output, "errors": error_output}
            else:
                logger.error(f"Migration command failed with code {process.returncode}. Output: {output}. Errors: {error_output}")
                await self._update_specific_maintenance_status("migrations", {"status": "failure", "output": output, "errors": error_output, "return_code": process.returncode})
                raise Exception(f"Migration command failed: {error_output if error_output else output}")

        except FileNotFoundError:
            logger.error("Python interpreter or alembic_wrapper.py not found.")
            await self._update_specific_maintenance_status("migrations", {"status": "failure", "errors": "Python interpreter or alembic_wrapper.py not found."})
            raise Exception("Python interpreter or alembic_wrapper.py not found.")
        except Exception as e:
            logger.error(f"Error applying migrations: {str(e)}", exc_info=True)
            await self._update_specific_maintenance_status("migrations", {"status": "failure", "errors": str(e)})
            raise Exception(f"Failed to apply migrations: {str(e)}")