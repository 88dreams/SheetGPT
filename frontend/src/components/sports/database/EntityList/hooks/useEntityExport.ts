import { useState, useCallback } from 'react';
import { useNotification } from '../../../../../contexts/NotificationContext';
import { saveCsvFile } from '../utils/csvExport';
import sportsService from '../../../../../services/sportsService';
import { useSportsDatabase } from '../../SportsDatabaseContext';
import { EntityType } from '../../../../../services/SportsDatabaseService';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface UseEntityExportProps {
  selectedEntityType: EntityType;
  handleExportToSheets: (entities: any[], visibleColumns?: string[]) => Promise<void>;
}

/**
 * Custom hook for handling entity export
 */
export function useEntityExport({ selectedEntityType, handleExportToSheets }: UseEntityExportProps) {
  const { showNotification } = useNotification();
  const { activeFilters, sortField, sortDirection } = useSportsDatabase();
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('');

  /**
   * Handle CSV export
   */
  const handleCsvExport = useCallback(async () => {
    setIsExporting(true);
    showNotification('info', 'Preparing full data export...');
    try {
      const response = await sportsService.getAllEntitiesForExport(
        selectedEntityType,
        activeFilters,
        sortField,
        sortDirection === 'none' ? 'asc' : sortDirection
      ) as PaginatedResponse<any> | null;

      const allEntities = response?.items || [];
      if (allEntities.length === 0) {
        showNotification('warning', 'No data available to export.');
        setIsExporting(false);
        return;
      }
      
      const suggestedName = `${selectedEntityType}-export-${new Date().toISOString().split('T')[0]}`;
      const columns = allEntities.length > 0 ? Object.keys(allEntities[0]) : [];

      const success = await saveCsvFile(allEntities, columns, suggestedName);

      if (success) {
        showNotification('success', `Successfully exported ${allEntities.length} records.`);
      } else {
        showNotification('info', 'CSV export was cancelled by the user.');
      }

    } catch (error) {
      console.error('Full entity fetch for CSV export failed:', error);
      showNotification('error', 'Could not fetch full dataset for export.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedEntityType, showNotification, activeFilters, sortField, sortDirection]);

  /**
   * Handle Google Sheets export
   */
  const handleSheetsExport = useCallback(async () => {
    showNotification('info', 'Google Sheets export uses the currently visible data. Full export not yet implemented for this option.');
    // This would need to be updated to fetch all data similar to handleCsvExport
  }, [showNotification]);

  /**
   * Open export dialog
   */
  const openExportDialog = useCallback(() => {
    setShowExportDialog(true);
    setSelectedFolderName('');
  }, []);

  /**
   * Handle Google Drive folder selection
   */
  const handleFolderSelection = useCallback(() => {
    showNotification('info', 'Folder selection is a placeholder.');
  }, [showNotification]);

  return {
    isExporting,
    showExportDialog,
    setShowExportDialog,
    selectedFolderName,
    openExportDialog,
    handleCsvExport,
    handleSheetsExport,
    handleFolderSelection,
  };
}