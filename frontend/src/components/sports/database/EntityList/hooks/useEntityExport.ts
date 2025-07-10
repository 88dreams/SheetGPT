import { useState, useCallback, useEffect } from 'react';
import { useNotification } from '../../../../../contexts/NotificationContext';
import { saveCsvFile } from '../utils/csvExport';
import sportsService from '../../../../../services/sportsService';
import { useSportsDatabase } from '../../SportsDatabaseContext';
import { EntityType } from '../../../../../types/sports';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

interface UseEntityExportProps {
  selectedEntityType: EntityType;
}

/**
 * Custom hook for handling entity export
 */
export function useEntityExport({ selectedEntityType }: UseEntityExportProps) {
  const { showNotification } = useNotification();
  const { activeFilters, sortField, sortDirection } = useSportsDatabase();
  const [exportState, setExportState] = useState<'idle' | 'fetching' | 'saving'>('idle');

  /**
   * Handle CSV export
   */
  const handleCsvExport = useCallback(async () => {
    setExportState('fetching');
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
        setExportState('idle');
        return;
      }
      
      setExportState('saving');
      const suggestedName = `${selectedEntityType}-export-${new Date().toISOString().split('T')[0]}`;
      const columns = Object.keys(allEntities[0] || {});

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
      setExportState('idle');
    }
  }, [selectedEntityType, activeFilters, sortField, sortDirection, showNotification]);

  /**
   * Handle Google Sheets export
   */
  const handleSheetsExport = useCallback(async () => {
    showNotification('info', 'Google Sheets export uses the currently visible data. Full export not yet implemented for this option.');
    // This would need to be updated to fetch all data similar to handleCsvExport
  }, [showNotification]);

  /**
   * Handle Google Drive folder selection
   */
  const handleFolderSelection = useCallback(() => {
    showNotification('info', 'Folder selection is a placeholder.');
  }, [showNotification]);

  return {
    exportState,
    handleCsvExport,
    handleSheetsExport,
    handleFolderSelection,
  };
}