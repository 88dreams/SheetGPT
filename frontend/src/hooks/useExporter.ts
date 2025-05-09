import { useState, useCallback, useEffect } from 'react';
import { AxiosInstance } from 'axios';

// Types for the hook
export interface BackendQueryArgsForExport {
  query: string;
  natural_language: boolean;
  export_format: 'csv' | 'sheets';
  sheet_title?: string;
  template_name?: string; // Added for backend Sheets export
  queryName?: string;
}

export interface UseExporterProps {
  baseQueryName?: string;
  showNotification: (
    type: 'success' | 'error' | 'warning' | 'info',
    message: string
  ) => void;
  apiClient: AxiosInstance;
  executeBackendQuery: (params: BackendQueryArgsForExport) => void;
  getLatestQueryForBackendExport: () => {
    queryText: string;
    isNaturalLanguage: boolean;
  };
}

export interface UseExporterReturn {
  // Sheets Dialog State & Handlers
  isSheetsDialogVisible: boolean;
  openSheetsDialog: () => void;
  closeSheetsDialog: () => void;
  sheetsDialogTitle: string;
  setSheetsDialogTitle: (title: string) => void;
  selectedSheetTemplate: string;
  setSelectedSheetTemplate: (template: string) => void;
  availableSheetTemplates: string[];
  isLoadingSheetTemplates: boolean;
  sheetAuthStatus: 'checking' | 'authenticated' | 'unauthenticated';
  isExportingToSheetsInProgress: boolean;
  handleSheetsAuthentication: () => Promise<void>;
  exportCurrentDataToSheetsAPI: (
    currentData: any[],
    columnOrder: string[],
    visibleColumns: Record<string, boolean>
  ) => Promise<void>;

  // CSV Export Handler
  exportCurrentDataToCsvClientSide: (
    currentData: any[],
    columnOrder: string[],
    visibleColumns: Record<string, boolean>,
    filename?: string
  ) => void;

  // Backend-driven Export
  triggerBackendExport: (
    format: 'csv' | 'sheets',
    options?: { sheetTitle?: string; templateName?: string }
  ) => void;
}

export const useExporter = (props: UseExporterProps): UseExporterReturn => {
  const {
    baseQueryName,
    showNotification,
    apiClient,
    executeBackendQuery,
    getLatestQueryForBackendExport,
  } = props;

  // --- State for Google Sheets Export Dialog ---
  const [isSheetsDialogVisible, setIsSheetsDialogVisible] = useState<boolean>(false);
  const [sheetsDialogTitle, setSheetsDialogTitle] = useState<string>('');
  const [selectedSheetTemplate, setSelectedSheetTemplate] = useState<string>('default');
  const [availableSheetTemplates, setAvailableSheetTemplates] = useState<string[]>(['default']);
  const [isLoadingSheetTemplates, setIsLoadingSheetTemplates] = useState<boolean>(false);
  const [sheetAuthStatus, setSheetAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [isExportingToSheetsInProgress, setIsExportingToSheetsInProgress] = useState<boolean>(false);

  // --- Effects ---
  // Effect to set initial sheets dialog title
  useEffect(() => {
    if (baseQueryName) {
      setSheetsDialogTitle(baseQueryName);
    } else {
      setSheetsDialogTitle(`Query Results - ${new Date().toLocaleDateString()}`);
    }
  }, [baseQueryName]);

  // Effect to load templates and auth status when dialog becomes visible
  useEffect(() => {
    const loadDataForSheetsDialog = async () => {
      if (!isSheetsDialogVisible) return;

      setIsLoadingSheetTemplates(true);
      setSheetAuthStatus('checking');
      try {
        const templateResponse = await apiClient.get('/export/templates');
        if (templateResponse.data && Array.isArray(templateResponse.data)) {
          setAvailableSheetTemplates(templateResponse.data.length > 0 ? templateResponse.data : ['default']);
          if (!templateResponse.data.includes(selectedSheetTemplate) && templateResponse.data.length > 0) {
            setSelectedSheetTemplate(templateResponse.data[0]);
          } else if (templateResponse.data.length === 0) {
            setSelectedSheetTemplate('default');
          }
        }
        
        const authResponse = await apiClient.get('/export/auth/status');
        setSheetAuthStatus(
          authResponse.data && authResponse.data.authenticated
            ? 'authenticated'
            : 'unauthenticated'
        );
      } catch (error) {
        console.error('Error loading templates or auth status:', error);
        showNotification('error', 'Failed to load Google Sheets integration details.');
        setAvailableSheetTemplates(['default']);
        setSelectedSheetTemplate('default');
        setSheetAuthStatus('unauthenticated');
      } finally {
        setIsLoadingSheetTemplates(false);
      }
    };

    loadDataForSheetsDialog();
  }, [isSheetsDialogVisible, apiClient, showNotification, selectedSheetTemplate]);

  // --- Core Functions ---
  const openSheetsDialog = useCallback(() => {
    // Reset title based on baseQueryName when opening
    if (baseQueryName) {
      setSheetsDialogTitle(baseQueryName);
    } else {
      setSheetsDialogTitle(`Query Results - ${new Date().toLocaleDateString()}`);
    }
    setIsSheetsDialogVisible(true);
  }, [baseQueryName]);

  const closeSheetsDialog = useCallback(() => {
    setIsSheetsDialogVisible(false);
  }, []);

  const handleSheetsAuthentication = useCallback(async () => {
    try {
      const response = await apiClient.get('/export/auth/google');
      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No authentication URL returned');
      }
    } catch (error) {
      console.error('Error initiating Google authentication:', error);
      showNotification('error', 'Failed to start Google authentication. Please try again.');
    }
  }, [apiClient, showNotification]);

  const exportCurrentDataToSheetsAPI = useCallback(async (
    currentData: any[],
    columnOrder: string[],
    visibleColumns: Record<string, boolean>
  ) => {
    if (!sheetsDialogTitle.trim()) {
      showNotification('warning', 'Please enter a title for your Google Sheet.');
      return;
    }
    if (sheetAuthStatus !== 'authenticated') {
      showNotification('warning', 'Please authenticate with Google Sheets first.');
      return;
    }

    setIsExportingToSheetsInProgress(true);
    try {
      const visibleHeaders = columnOrder.filter(col => visibleColumns[col] !== false); // Ensure true or undefined means visible
      const rowsToExport = currentData.map(row =>
        visibleHeaders.map(header => row[header])
      );
      const dataPayload = [visibleHeaders, ...rowsToExport];

      const response = await apiClient.post('/export/sheets', {
        data: dataPayload,
        template_name: selectedSheetTemplate,
        title: sheetsDialogTitle,
      });

      if (response.data && response.data.spreadsheetUrl) {
        window.open(response.data.spreadsheetUrl, '_blank');
        showNotification('success', 'Data exported successfully to Google Sheets!');
        closeSheetsDialog();
      } else {
        throw new Error(response.data?.error || 'No spreadsheet URL returned');
      }
    } catch (error: any) {
      console.error('Error exporting to Google Sheets:', error);
      const message = error?.response?.data?.detail || error?.message || 'Failed to export to Google Sheets.';
      showNotification('error', message);
    } finally {
      setIsExportingToSheetsInProgress(false);
    }
  }, [
    apiClient,
    sheetsDialogTitle,
    selectedSheetTemplate,
    showNotification,
    closeSheetsDialog,
    sheetAuthStatus,
  ]);

  const exportCurrentDataToCsvClientSide = useCallback((
    currentData: any[],
    columnOrder: string[],
    visibleColumns: Record<string, boolean>,
    filename?: string
  ) => {
    if (currentData.length === 0) {
      showNotification('info', 'No data available to export.');
      return;
    }

    const finalFilename = filename || 
      (baseQueryName ? `${baseQueryName.replace(/[^a-zA-Z0-9]/g, '_')}.csv` : 'query_results.csv');
    
    try {
      const visibleHeaders = columnOrder.filter(col => visibleColumns[col] !== false);
      
      let csvContent = visibleHeaders.join(',') + '\n';
      currentData.forEach(row => {
        const values = visibleHeaders.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          let stringValue = String(value);
          if (typeof value === 'string' && (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n'))) {
            stringValue = `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csvContent += values.join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.setAttribute('download', finalFilename);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      showNotification('success', `${finalFilename} downloaded successfully.`);
    } catch (error) {
      console.error('Error generating CSV:', error);
      showNotification('error', 'Error generating CSV. Please try again.');
    }
  }, [baseQueryName, showNotification]);

  const triggerBackendExport = useCallback((
    format: 'csv' | 'sheets',
    options?: { sheetTitle?: string; templateName?: string }
  ) => {
    const { queryText, isNaturalLanguage } = getLatestQueryForBackendExport();
    if (!queryText.trim()) {
      showNotification('warning', 'No query to export.');
      return;
    }

    const exportArgs: BackendQueryArgsForExport = {
      query: queryText,
      natural_language: isNaturalLanguage,
      export_format: format,
      queryName: baseQueryName,
    };

    if (format === 'sheets') {
      exportArgs.sheet_title = options?.sheetTitle || sheetsDialogTitle || baseQueryName || `Query Export - ${Date.now()}`;
      exportArgs.template_name = options?.templateName || selectedSheetTemplate;
      // If dialog is not open and we trigger backend sheets export, ensure title is somewhat sensible.
      if (!isSheetsDialogVisible && !options?.sheetTitle && !sheetsDialogTitle && baseQueryName) {
         exportArgs.sheet_title = baseQueryName;
      } else if (!isSheetsDialogVisible && !options?.sheetTitle && !sheetsDialogTitle && !baseQueryName) {
         exportArgs.sheet_title = `Query Results - ${new Date().toLocaleDateString()}`;
      }
    }
    
    executeBackendQuery(exportArgs);
    if (format === 'sheets' && isSheetsDialogVisible) {
      // Assume backend will handle opening the sheet, close dialog after triggering.
      // Or, the main component's effect on queryMutation success will handle it.
      // For now, let's not close it from here to avoid race conditions.
      // showNotification('info', `Exporting to Google Sheets started for query: ${baseQueryName || 'current query'}`);
    } else if (format === 'csv') {
      // showNotification('info', `CSV export started for query: ${baseQueryName || 'current query'}`);
    }

  }, [
    executeBackendQuery,
    getLatestQueryForBackendExport,
    baseQueryName,
    sheetsDialogTitle,
    selectedSheetTemplate,
    isSheetsDialogVisible,
    showNotification,
  ]);

  return {
    isSheetsDialogVisible,
    openSheetsDialog,
    closeSheetsDialog,
    sheetsDialogTitle,
    setSheetsDialogTitle,
    selectedSheetTemplate,
    setSelectedSheetTemplate,
    availableSheetTemplates,
    isLoadingSheetTemplates,
    sheetAuthStatus,
    isExportingToSheetsInProgress,
    handleSheetsAuthentication,
    exportCurrentDataToSheetsAPI,
    exportCurrentDataToCsvClientSide,
    triggerBackendExport,
  };
}; 