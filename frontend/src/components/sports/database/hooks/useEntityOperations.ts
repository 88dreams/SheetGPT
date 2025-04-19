import { useState, useCallback } from 'react';
import { sportsDatabaseService } from '../../../../services';
import { EntityType } from '../../../../services/SportsDatabaseService';

type NotificationFn = (type: 'success' | 'error' | 'info', message: string) => void;

export function useEntityOperations(
  entityType: EntityType,
  entities: Record<string, unknown>[],
  getSelectedEntityIds: () => string[],
  refetch: () => void,
  showNotification: NotificationFn,
  deselectAllEntities: () => void
) {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [includeRelationships, setIncludeRelationships] = useState(false);

  // Handle export to Google Sheets
  const handleExportToSheets = useCallback(async (
    allEntities: Record<string, unknown>[],
    visibleColumns?: string[],
    folderName?: string,
    fileName?: string,
    useDrivePicker: boolean = false
  ) => {
    try {
      setIsExporting(true);
      
      // Get selected entity IDs
      const selectedIds = getSelectedEntityIds();
      
      // Get IDs to export - either selected IDs or ALL entity IDs
      let idsToExport: string[];
      
      if (selectedIds.length > 0) {
        // If there are selected entities, export only those
        idsToExport = selectedIds;
        console.log(`Exporting ${idsToExport.length} selected ${entityType} entities`);
      } else {
        // Export ALL entities of this type that match the current filters
        // We just send null to the backend to indicate it should query for all entities
        // of this type rather than sending a specific list
        idsToExport = allEntities.map(entity => entity.id as string);
        console.log(`Exporting all ${idsToExport.length} ${entityType} entities matching filters`);
      }
      
      if (idsToExport.length === 0) {
        showNotification('info', 'No entities selected for export');
        setIsExporting(false);
        return;
      }

      // Log options before export
      console.log(`useEntityOperations.handleExportToSheets: Export options:`, {
        visibleColumns: visibleColumns ? `${visibleColumns.length} columns` : 'undefined',
        folderName: folderName || 'not provided',
        fileName: fileName || 'not provided',
        useDrivePicker: useDrivePicker
      });
      
      if (visibleColumns && visibleColumns.length > 0) {
        console.log(`useEntityOperations.handleExportToSheets: sample visible columns:`, 
          visibleColumns.slice(0, 5)
        );
      }
      
      // Use the sportsDatabaseService for exporting
      const data = await sportsDatabaseService.exportEntities(
        entityType,
        idsToExport,
        includeRelationships,
        visibleColumns,  // Pass visible columns to the export service
        folderName,      // Pass target folder name if provided
        fileName,        // Pass custom filename if provided
        useDrivePicker   // Pass drive picker preference
      );
      
      showNotification('success', 'Export successful!');
      
      // Handle different response types
      if (data.csv_export) {
        // Google Sheets export failed, show a message about authentication
        showNotification('info', `${data.message} Please authenticate with Google Sheets.`);
      } else if (data.spreadsheet_url) {
        // If there's a URL in the response, open it
        window.open(data.spreadsheet_url, '_blank');
        
        // If using the drive picker, we need to show a message about moving the file
        if (useDrivePicker && data.folder_id === "USE_PICKER") {
          showNotification('info', 'Your file has been created. Please select a folder in Google Drive to store it.');
          // Here you would implement the Google Drive picker UI logic in a real implementation
        }
      }
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      
      // Show error notification
      showNotification('error', `Failed to export ${entityType} entities to Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [entityType, entities, getSelectedEntityIds, includeRelationships, showNotification]);

  // Handle entity deletion
  const handleDeleteEntity = useCallback(async (entityId: string) => {
    try {
      setIsDeleting(true);
      
      await sportsDatabaseService.deleteEntity(entityType, entityId);
      
      // Show success notification
      showNotification('success', `Successfully deleted ${entityType} entity`);
      
      // Refresh the entity list
      refetch();
    } catch (error) {
      console.error(`Error deleting ${entityType}:`, error);
      
      // Check if it's a 404 Not Found error
      const is404 = error instanceof Error && error.message.includes('404');
      
      if (is404) {
        // If record not found, it might have been deleted already
        showNotification('info', `The ${entityType} entity was not found in the database. It may have been deleted already. Refreshing data.`);
        
        // Still refetch to ensure UI and database stay in sync
        refetch();
      } else {
        // Show error notification for other types of errors
        showNotification('error', `Failed to delete ${entityType} entity: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(null);
    }
  }, [entityType, refetch, showNotification]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    const selectedIds = getSelectedEntityIds();
    if (selectedIds.length === 0) return;

    // Special validation for broadcast rights to prevent misidentified IDs
    if (entityType === 'broadcast') {
      const entitiesWithSameId = entities.filter(entity => 
        selectedIds.includes(entity.id as string) && 
        entity.broadcast_company_id === entity.id
      );
      
      if (entitiesWithSameId.length > 0) {
        console.error('Detected potential ID confusion in bulk delete broadcast rights');
        showNotification('error', 'Cannot delete: Some IDs appear to be broadcast company IDs, not broadcast right IDs.');
        return;
      }
    }

    setIsDeleting(true);
    try {
      const results = await sportsDatabaseService.bulkDeleteEntities(entityType, selectedIds);
      
      // Show results notification
      if (results.failed.length === 0) {
        showNotification('success', `Successfully deleted ${results.success.length} ${entityType}(s)`);
      } else {
        const message = `Deleted ${results.success.length} of ${selectedIds.length} ${entityType}(s). ${results.failed.length} items failed to delete. Check the console for details.`;
        showNotification('info', message);
      }

      // Clear selections and force refetch
      deselectAllEntities();
      refetch();
    } catch (error) {
      console.error('Bulk delete error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showNotification('error', `Error during bulk delete: ${errorMessage}`);
      
      // Even on bulk error, deselectAll and refetch to keep UI in sync
      deselectAllEntities();
      refetch();
    } finally {
      setIsDeleting(false);
    }
  }, [entityType, entities, getSelectedEntityIds, showNotification, deselectAllEntities, refetch]);

  // Handle entity update
  const handleUpdateEntity = useCallback(async (entityId: string, updates: Record<string, unknown>) => {
    try {
      await sportsDatabaseService.updateEntity(entityType, entityId, updates);
      showNotification('success', 'Entity updated successfully');
      refetch();
    } catch (error) {
      console.error('Error updating entity:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showNotification('error', `Error updating entity: ${errorMessage}`);
    }
  }, [entityType, refetch, showNotification]);

  return {
    isExporting,
    isDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    includeRelationships,
    setIncludeRelationships,
    handleExportToSheets,
    handleDeleteEntity,
    handleBulkDelete,
    handleUpdateEntity
  };
}