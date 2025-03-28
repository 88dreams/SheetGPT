import { renderHook, act } from '@testing-library/react-hooks';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Import the hook to test
import { useEntityExport } from '../../../../../../frontend/src/components/sports/database/EntityList/hooks/useEntityExport';

// Mock dependencies
jest.mock('../../../../../../frontend/src/contexts/NotificationContext', () => ({
  useNotification: () => ({
    showNotification: jest.fn()
  })
}));

jest.mock('../../../../../../frontend/src/components/sports/database/EntityList/utils/csvExport', () => ({
  saveCsvFile: jest.fn().mockImplementation((data, columns, name, onSuccess) => {
    // Call the success callback if provided
    onSuccess?.();
    return Promise.resolve(true);
  })
}));

// Mock window.prompt for folder selection
global.prompt = jest.fn();

describe('useEntityExport Hook', () => {
  // Test props
  const mockProps = {
    selectedEntityType: 'team' as const,
    handleExportToSheets: jest.fn().mockResolvedValue(undefined)
  };
  
  // Sample entities for export testing
  const mockEntities = [
    { id: '1', name: 'Entity 1', created_at: '2023-01-01', updated_at: '2023-01-02' }
  ];
  
  // Sample visible columns
  const mockVisibleColumns = ['id', 'name', 'created_at', 'updated_at'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useEntityExport(mockProps));
    
    // Check initial state
    expect(result.current.showExportDialog).toBe(false);
    expect(result.current.exportFileName).toBe('');
    expect(result.current.exportType).toBe('sheets');
    expect(result.current.includeRelationships).toBe(false);
    expect(result.current.selectedFolderId).toBeNull();
    expect(result.current.selectedFolderName).toBe('');
  });

  it('should open export dialog with reset states', () => {
    const { result } = renderHook(() => useEntityExport(mockProps));
    
    // Set initial states to non-default values
    act(() => {
      result.current.setShowExportDialog(false);
      result.current.setExportFileName('existing-name');
      result.current.setExportType('csv');
      result.current.setIncludeRelationships(false);
      result.current.setSelectedFolderId('some-folder-id');
      result.current.setSelectedFolderName('Some Folder');
    });
    
    // Open the export dialog
    act(() => {
      result.current.openExportDialog();
    });
    
    // Verify states are reset
    expect(result.current.showExportDialog).toBe(true);
    expect(result.current.exportType).toBe('sheets');
    expect(result.current.includeRelationships).toBe(true);
    expect(result.current.exportFileName).toBe('');
    expect(result.current.selectedFolderId).toBeNull();
    expect(result.current.selectedFolderName).toBe('');
  });

  it('should handle CSV export with default filename when none provided', async () => {
    const { saveCsvFile } = require('../../../../../../frontend/src/components/sports/database/EntityList/utils/csvExport');
    const { useNotification } = require('../../../../../../frontend/src/contexts/NotificationContext');
    const showNotification = useNotification().showNotification;
    
    const { result } = renderHook(() => useEntityExport(mockProps));
    
    // Call handleCsvExport with empty filename
    await act(async () => {
      await result.current.handleCsvExport(mockEntities, mockVisibleColumns);
    });
    
    // Verify saveCsvFile is called with default filename and callbacks
    expect(saveCsvFile).toHaveBeenCalledWith(
      mockEntities, 
      mockVisibleColumns, 
      'team-export',
      expect.any(Function),
      expect.any(Function)
    );
    
    // Verify notification is shown on success (called by the callback)
    expect(showNotification).toHaveBeenCalledWith('success', 'CSV export completed successfully');
  });

  it('should handle CSV export with provided filename', async () => {
    const { saveCsvFile } = require('../../../../../../frontend/src/components/sports/database/EntityList/utils/csvExport');
    
    const { result } = renderHook(() => useEntityExport(mockProps));
    
    // Set a custom filename
    act(() => {
      result.current.setExportFileName('custom-export-name');
    });
    
    // Call handleCsvExport
    await act(async () => {
      await result.current.handleCsvExport(mockEntities, mockVisibleColumns);
    });
    
    // Verify saveCsvFile is called with custom filename and callbacks
    expect(saveCsvFile).toHaveBeenCalledWith(
      mockEntities, 
      mockVisibleColumns, 
      'custom-export-name',
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should handle CSV export error', async () => {
    const { saveCsvFile } = require('../../../../../../frontend/src/components/sports/database/EntityList/utils/csvExport');
    const { useNotification } = require('../../../../../../frontend/src/contexts/NotificationContext');
    const showNotification = useNotification().showNotification;
    
    // Mock CSV export failure
    saveCsvFile.mockRejectedValueOnce(new Error('CSV export failed'));
    
    const { result } = renderHook(() => useEntityExport(mockProps));
    
    // Spy on console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Call handleCsvExport
    await act(async () => {
      await result.current.handleCsvExport(mockEntities, mockVisibleColumns);
    });
    
    // Verify error notification is shown
    expect(showNotification).toHaveBeenCalledWith('error', 'Failed to export CSV');
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle Google Sheets export', async () => {
    const { result } = renderHook(() => useEntityExport(mockProps));
    
    // Set custom filename and folder ID
    act(() => {
      result.current.setExportFileName('sheets-export');
      result.current.setSelectedFolderId('folder-123');
    });
    
    // Call handleSheetsExport
    await act(async () => {
      await result.current.handleSheetsExport(mockEntities, mockVisibleColumns);
    });
    
    // Verify handleExportToSheets is called with correct parameters
    expect(mockProps.handleExportToSheets).toHaveBeenCalledWith(
      mockEntities,
      mockVisibleColumns,
      'folder-123',
      'sheets-export',
      true
    );
  });

  it('should handle Google Sheets export error', async () => {
    const { useNotification } = require('../../../../../../frontend/src/contexts/NotificationContext');
    const showNotification = useNotification().showNotification;
    
    // Mock Sheets export failure
    mockProps.handleExportToSheets.mockRejectedValueOnce(new Error('Sheets export failed'));
    
    const { result } = renderHook(() => useEntityExport(mockProps));
    
    // Spy on console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Call handleSheetsExport
    await act(async () => {
      await result.current.handleSheetsExport(mockEntities, mockVisibleColumns);
    });
    
    // Verify error notification is shown
    expect(showNotification).toHaveBeenCalledWith('error', 'Failed to export to Google Sheets');
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle folder selection with user input', async () => {
    const { useNotification } = require('../../../../../../frontend/src/contexts/NotificationContext');
    const showNotification = useNotification().showNotification;
    
    // Mock prompt to return a folder ID
    (global.prompt as jest.Mock).mockReturnValueOnce('custom-folder-id');
    
    const { result } = renderHook(() => useEntityExport(mockProps));
    
    // Call handleFolderSelection
    act(() => {
      result.current.handleFolderSelection();
    });
    
    // Verify prompt was called
    expect(global.prompt).toHaveBeenCalledWith(
      'Enter a Google Drive folder ID (or leave empty for default folder):'
    );
    
    // Verify folder ID and name are set
    expect(result.current.selectedFolderId).toBe('custom-folder-id');
    expect(result.current.selectedFolderName).toBe('Manually entered folder');
    
    // Verify notification is shown
    expect(showNotification).toHaveBeenCalledWith('info', 'Please authenticate with Google Sheets');
  });

  it('should handle folder selection with default (empty) input', async () => {
    // Mock prompt to return null (user cancelled or empty input)
    (global.prompt as jest.Mock).mockReturnValueOnce('');
    
    const { result } = renderHook(() => useEntityExport(mockProps));
    
    // Call handleFolderSelection
    act(() => {
      result.current.handleFolderSelection();
    });
    
    // Verify default folder ID and name are set
    expect(result.current.selectedFolderId).toBe('root');
    expect(result.current.selectedFolderName).toBe('My Drive (root)');
  });

  it('should handle folder selection error', async () => {
    const { useNotification } = require('../../../../../../frontend/src/contexts/NotificationContext');
    const showNotification = useNotification().showNotification;
    
    // Mock prompt to throw an error
    (global.prompt as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Prompt error');
    });
    
    // Spy on console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useEntityExport(mockProps));
    
    // Call handleFolderSelection
    act(() => {
      result.current.handleFolderSelection();
    });
    
    // Verify error notification is shown
    expect(showNotification).toHaveBeenCalledWith('error', 'Error selecting folder');
    expect(console.error).toHaveBeenCalled();
  });
});