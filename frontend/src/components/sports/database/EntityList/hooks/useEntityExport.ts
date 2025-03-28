import { useState, useCallback } from 'react';
import { useNotification } from '../../../../../contexts/NotificationContext';
import { saveCsvFile } from '../utils/csvExport';
import { EntityType } from '../../../../../types/sports';

interface UseEntityExportProps {
  selectedEntityType: EntityType;
  handleExportToSheets: (
    allEntities: any[], 
    visibleColumns?: string[], 
    folderName?: string, 
    fileName?: string, 
    useDrivePicker?: boolean
  ) => Promise<void>;
}

/**
 * Custom hook for handling entity export
 */
export function useEntityExport({ selectedEntityType, handleExportToSheets }: UseEntityExportProps) {
  const { showNotification } = useNotification();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [exportType, setExportType] = useState<'sheets' | 'csv'>('sheets');
  const [includeRelationships, setIncludeRelationships] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('');

  /**
   * Handle CSV export
   */
  const handleCsvExport = useCallback(async (entities: any[], visibleColumns: string[]) => {
    try {
      const suggestedName = exportFileName || `${selectedEntityType}-export`;
      const success = await saveCsvFile(
        entities, 
        visibleColumns, 
        suggestedName,
        () => showNotification('success', 'CSV export completed successfully'),
        () => showNotification('error', 'Failed to export CSV')
      );
      
      if (!success) {
        showNotification('error', 'CSV export was cancelled');
      }
    } catch (error) {
      console.error('CSV export error:', error);
      showNotification('error', 'Failed to export CSV');
    }
  }, [exportFileName, selectedEntityType, showNotification]);

  /**
   * Handle Google Sheets export
   */
  const handleSheetsExport = useCallback(async (entities: any[], visibleColumns: string[]) => {
    try {
      await handleExportToSheets(
        entities,
        visibleColumns,
        selectedFolderId || undefined,
        exportFileName.trim() || undefined,
        true // Always use Drive picker approach
      );
    } catch (error) {
      console.error('Sheets export error:', error);
      showNotification('error', 'Failed to export to Google Sheets');
    }
  }, [
    exportFileName, 
    selectedFolderId, 
    handleExportToSheets, 
    showNotification
  ]);

  /**
   * Open export dialog
   */
  const openExportDialog = useCallback(() => {
    // Show folder selection dialog first and reset states
    setShowExportDialog(true);
    // Default to Google Sheets export
    setExportType('sheets');
    setIncludeRelationships(true);
    // Clear previous selections
    setExportFileName('');
    setSelectedFolderId(null);
    setSelectedFolderName('');
  }, []);

  /**
   * Handle Google Drive folder selection
   */
  const handleFolderSelection = useCallback(() => {
    try {
      // Simplified folder selection to avoid gapi issues
      showNotification('info', 'Please authenticate with Google Sheets');
      // Prompt for manual folder ID entry as a fallback
      const folderId = prompt('Enter a Google Drive folder ID (or leave empty for default folder):');
      if (folderId) {
        setSelectedFolderId(folderId);
        setSelectedFolderName('Manually entered folder');
      } else {
        // Use a default "My Drive" as fallback
        setSelectedFolderId('root');
        setSelectedFolderName('My Drive (root)');
      }
    } catch (error) {
      console.error('Error with folder selection:', error);
      showNotification('error', 'Error selecting folder');
    }
  }, [showNotification]);

  return {
    showExportDialog,
    setShowExportDialog,
    exportFileName,
    setExportFileName,
    exportType,
    setExportType,
    includeRelationships,
    setIncludeRelationships,
    selectedFolderId,
    setSelectedFolderId,
    selectedFolderName,
    setSelectedFolderName,
    openExportDialog,
    handleCsvExport,
    handleSheetsExport,
    handleFolderSelection
  };
}