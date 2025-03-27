import { useState, useCallback } from 'react';
import SportsDatabaseService, { EntityType } from '../../../../services/SportsDatabaseService';

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
    folderName?: string
  ) => {
    try {
      setIsExporting(true);
      
      // Get selected entity IDs
      const selectedIds = getSelectedEntityIds();
      
      // Determine which entities to export (selected or all)
      // We always export ALL available entities, not just the ones visible on the current page
      const entitiesToExport = selectedIds.length > 0
        ? entities.filter(entity => selectedIds.includes(entity.id as string))
        : allEntities;
      
      if (entitiesToExport.length === 0) {
        showNotification('info', 'No entities selected for export');
        setIsExporting(false);
        return;
      }

      // Use the SportsDatabaseService for exporting
      const data = await SportsDatabaseService.exportEntities(
        entityType,
        entitiesToExport.map(entity => entity.id as string),
        includeRelationships,
        visibleColumns,  // Pass visible columns to the export service
        folderName       // Pass target folder name if provided
      );
      
      showNotification('success', 'Export successful!');
      
      // Handle different response types
      if (data.csv_export) {
        // Google Sheets export failed, show a message about authentication
        showNotification('info', `${data.message} Please authenticate with Google Sheets.`);
      } else if (data.spreadsheet_url) {
        // If there's a URL in the response, open it
        window.open(data.spreadsheet_url, '_blank');
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
      
      await SportsDatabaseService.deleteEntity(entityType, entityId);
      
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
      const results = await SportsDatabaseService.bulkDeleteEntities(entityType, selectedIds);
      
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
      await SportsDatabaseService.updateEntity(entityType, entityId, updates);
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