import os
import logging
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
from datetime import datetime, date
from uuid import UUID # Added for conversation methods
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio # Added for subprocess
import subprocess # For Alembic

# Assuming DatabaseCleanupService and DatabaseVacuumService will be refactored
# into proper services or their paths correctly handled. For now, direct import from scripts.
# This might need adjustment based on final project structure for scripts.
# If scripts are not directly importable, this part will fail and need rethinking on how to call them.
try:
    from src.scripts.db_cleanup import DatabaseCleanupService
    from src.scripts.db_vacuum import DatabaseVacuumService
except ImportError as e:
    logging.getLogger(__name__).warning(f"Could not import script services: {e}. Cleanup/Vacuum operations might fail.")
    DatabaseCleanupService = None # Placeholder
    DatabaseVacuumService = None  # Placeholder

logger = logging.getLogger(__name__)

BACKUP_STATUS_KEY = "maintenance_status"

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
        
        # Construct the pg_dump command
        # Using --column-inserts or --inserts makes the dump more verbose but can be more stable for cross-version restores or problematic data.
        # --no-owner and --no-privileges can make it more portable if restoring to a different user/role setup.
        # For simplicity and general re-importability, a plain format dump is often sufficient.
        # We will use --clean to add DROP statements for a cleaner restore.
        pg_dump_command = [
            "pg_dump",
            f"--dbname=postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}",
            "--format=plain",  # Output plain SQL
            "--clean",         # Add DROP commands before CREATE commands
            "--no-owner",      # Do not output commands to set ownership of objects
            "--no-privileges", # Do not output GRANT/REVOKE commands
            f"--file={backup_file_path}"
        ]
        
        try:
            # Set environment variables for pg_dump if password is not in DSN
            env = os.environ.copy()
            if db_pass: # pg_dump can use PGPASSWORD or a .pgpass file
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

            if stdout: # Should be empty if --file is used correctly
                logger.info(f"pg_dump stdout: {stdout.decode().strip()}")
            if stderr: # Might contain warnings even on success
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
            # Attempt to remove partial backup file if it exists and is empty or an error occurred
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
            await self.db.commit() # Commit table creation immediately
            logger.info("Created system_metadata table")

    async def _get_maintenance_status_json(self) -> Dict[str, Any]:
        await self._ensure_system_metadata_table()
        status_query = text("SELECT value FROM system_metadata WHERE key = 'maintenance_status'")
        status_result = await self.db.execute(status_query)
        status_row = status_result.scalar_one_or_none()
        if status_row:
            if isinstance(status_row, str): return json.loads(status_row)
            if isinstance(status_row, (dict, list)): return status_row # Already JSONB dict/list
            logger.warning(f"Unexpected maintenance status type: {type(status_row)}")
        return {}

    async def _update_maintenance_status_json(self, status_data: Dict[str, Any]):
        await self._ensure_system_metadata_table()
        # Ensure all datetime objects are ISO formatted strings for JSON serialization
        def json_serial(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            elif isinstance(obj, (set, frozenset)):
                 return list(obj)
            raise TypeError(f"Type {type(obj)} not serializable for maintenance status")

        maintenance_json = json.dumps(status_data, default=json_serial)
        
        # Use consistent JSONB casting for value
        upsert_query = text("""
            INSERT INTO system_metadata (key, value, updated_at)
            VALUES ('maintenance_status', :value::jsonb, NOW())
            ON CONFLICT (key)
            DO UPDATE SET value = :value::jsonb, updated_at = NOW()
        """)
        await self.db.execute(upsert_query, {"value": maintenance_json})
        await self.db.commit()

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
        
        # Ensure boolean for completion status
        if results_data.get("status") == "failure":
             current_status[f"{operation_key}_completed"] = False
        elif results_data.get("status") == "success":
            current_status[f"{operation_key}_completed"] = True
        # else, if 'status' is not present, keep True for backward compatibility or simple cases

        await self._update_maintenance_status_json(current_status)
        logger.info(f"Updated {operation_key} status in system_metadata")

    async def run_cleanup_dry_run(self) -> Dict[str, Any]:
        if DatabaseCleanupService is None:
            logger.error("DatabaseCleanupService not available for dry run.")
            return {"success": False, "error": "Cleanup service not available."}
        try:
            cleanup_service = DatabaseCleanupService(self.db, dry_run=True)
            stats = await cleanup_service.run_full_cleanup()
            analysis_results = {
                "duplicates_total": sum(stats.get("duplicates_found", {}).values()),
                "missing_relationships": sum(stats.get("relationships_repaired", {}).values()),
                "name_standardizations": sum(count for key, count in stats.get("relationships_repaired", {}).items() if "name_standardization" in key),
                "constraints_needed": len(stats.get("constraints_added", [])),
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
            cleanup_service.api_call = True # To skip interactive prompts
            os.environ["AUTOMATED_CLEANUP"] = "1" # For backward compatibility if script uses it
            stats = await cleanup_service.run_full_cleanup()
            fixed_results = {
                "duplicates_removed": sum(stats.get("duplicates_removed", {}).values()),
                "relationships_fixed": sum(stats.get("relationships_repaired", {}).values()),
                "constraints_added": len(stats.get("constraints_added", [])),
                "timestamp": datetime.now().isoformat(),
                "success": stats.get("success", True) # Assuming script returns success status
            }
            await self._update_specific_maintenance_status("cleanup", fixed_results)
            # Fallback direct SQL update for cleanup_completed - kept from original for safety but ideally handled by _update_specific_maintenance_status
            try:
                direct_update = text("UPDATE system_metadata SET value = jsonb_set(COALESCE(value::jsonb, '{}'::jsonb), '{cleanup_completed}', 'true'::jsonb), updated_at = NOW() WHERE key = 'maintenance_status'")
                await self.db.execute(direct_update)
                await self.db.commit()
            except Exception as e:
                logger.warning(f"Could not force direct SQL update for cleanup_completed: {str(e)}")
            return {"success": True, **fixed_results}
        except Exception as e:
            logger.error(f"Error in cleanup: {str(e)}", exc_info=True)
            await self.db.rollback() # Ensure rollback on error during actual cleanup
            return {"success": False, "error": str(e)}

    async def run_vacuum(self, skip_reindex: bool = False) -> Dict[str, Any]:
        if DatabaseVacuumService is None:
            logger.error("DatabaseVacuumService not available for vacuum.")
            return {"success": False, "error": "Vacuum service not available."}
        try:
            vacuum_service = DatabaseVacuumService(self.db)
            stats = await vacuum_service.run_full_vacuum(include_reindex=not skip_reindex)
            vacuum_results = {
                "space_reclaimed_mb": (stats.get("total_size_before", 0) - stats.get("total_size_after", 0)) / (1024 * 1024),
                "percent_reduction": ((stats.get("total_size_before", 0) - stats.get("total_size_after", 0)) / stats.get("total_size_before", 1)) * 100 if stats.get("total_size_before", 0) > 0 else 0,
                "duration_seconds": stats.get("vacuum_time", 0) + (0 if skip_reindex else stats.get("reindex_time", 0)),
                "size_before_mb": stats.get("total_size_before", 0) / (1024 * 1024),
                "size_after_mb": stats.get("total_size_after", 0) / (1024 * 1024),
                "skip_reindex": skip_reindex,
                "detailed_results": stats
            }
            await self._update_specific_maintenance_status("vacuum", vacuum_results)
            return {"success": True, **vacuum_results}
        except Exception as e:
            logger.error(f"Error in vacuum: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}

    # TODO: Move conversation archiving/restoring to a dedicated ConversationService?
    async def mark_conversation_archived(self, conversation_id: UUID):
        """Mark a conversation as archived."""
        # Check if conversation exists and is not deleted
        query_exists = text("SELECT id FROM conversations WHERE id = :id AND deleted_at IS NULL")
        result_exists = await self.db.execute(query_exists, {"id": conversation_id})
        if not result_exists.scalar_one_or_none():
            raise ValueError(f"Conversation {conversation_id} not found or already deleted")

        # Check if is_archived column exists
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

    # TODO: Move conversation archiving/restoring to a dedicated ConversationService?
    async def restore_archived_conversation(self, conversation_id: UUID):
        """Restore a previously archived conversation."""
        # Check if is_archived column exists
        check_column_query = text("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'is_archived')")
        has_is_archived_result = await self.db.execute(check_column_query)
        has_is_archived = has_is_archived_result.scalar_one()
        
        if not has_is_archived:
            logger.warning(f"Cannot restore conversation {conversation_id}: is_archived column does not exist")
            raise ValueError("Archive feature is not available in this version")
            
        # Check if conversation exists, is archived and not deleted
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
            # Construct the path to alembic_wrapper.py relative to the current file
            # This assumes database_admin_service.py is in src/services/
            # and alembic_wrapper.py is in src/scripts/
            current_dir = Path(__file__).parent
            script_path = current_dir.parent / "scripts" / "alembic_wrapper.py"
            
            if not script_path.exists():
                logger.error(f"Alembic wrapper script not found at {script_path}")
                raise Exception(f"Alembic wrapper script not found at {script_path}")

            command = ["python", str(script_path), "upgrade", "head"]
            
            logger.info(f"Executing migration command: {' '.join(command)}")

            # Using asyncio.create_subprocess_exec for consistency with pg_dump
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=current_dir.parent.parent # Run from project root (/app)
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