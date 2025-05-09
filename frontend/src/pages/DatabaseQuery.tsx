import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useDataFlow } from '../contexts/DataFlowContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiClient, getToken } from '../utils/apiClient';
import { ensureValidToken } from '../utils/tokenRefresh';
import usePageTitle from '../hooks/usePageTitle';
import { useColumnManager } from '../hooks/useColumnManager';
import { useQueryInput } from '../hooks/useQueryInput';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageContainer from '../components/common/PageContainer';
import SmartColumn from '../components/common/SmartColumn';
import { Modal } from 'antd';
import { 
  FaDatabase, FaPlay, FaDownload, FaSave, FaFileExport, FaTable, FaKeyboard, 
  FaFileCode, FaFileAlt, FaSort, FaSortUp, FaSortDown, FaEye, FaEyeSlash, 
  FaTrash, FaCheck, FaColumns, FaEdit, FaPencilAlt, FaKey, FaArrowsAlt
} from 'react-icons/fa';
import BulkEditModal from '../components/common/BulkEditModal';
import QueryResultsTable from '../components/query/QueryResultsTable';
import { useRowSelection } from '../hooks/useRowSelection';
import { useQueryExecution } from '../hooks/useQueryExecution';
import { useSavedQueries, SavedQuery } from '../hooks/useSavedQueries';

const DatabaseQuery: React.FC = () => {
  usePageTitle('Database Query');
  
  const { setDestination } = useDataFlow();
  const { showNotification } = useNotification();
  
  const {
    naturalLanguageQuery,
    setNaturalLanguageQuery,
    queryName,
    setQueryName,
    generatedSql,
    setGeneratedSql,
    isNaturalLanguage,
    setIsNaturalLanguage,
    validationError,
    setValidationError,
    suggestedSql,
    setSuggestedSql,
    isTranslating,
    handleTranslateQuery,
    clearNaturalLanguageQuery,
    clearGeneratedSql,
    applySuggestedFix
  } = useQueryInput();
  
  const { mutation: queryMutationFromHook } = useQueryExecution(queryName);
  
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [exportFormat, setExportFormat] = useState<string | null>(null);
  
  const fallbackDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.setAttribute('download', filename);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    showNotification('success', 'CSV downloaded successfully (fallback method).');
  };
  
  const columnNamesHash = useMemo(() => {
      if (queryResults.length === 0) return 'no_results';
      return Object.keys(queryResults[0]).sort().join('|');
  }, [queryResults]);

  const {
    visibleColumns,
    showColumnSelector,
    showFullUuids,
    columnOrder,
    sortConfig,
    reorderedColumns,
    draggedItem,
    dragOverItem,
    setShowColumnSelector,
    setShowFullUuids,
    toggleColumnVisibility,
    showAllColumns,
    handleSort,
    handleColumnDragStart: hookDragStart,
    handleColumnDragOver: hookDragOver,
    handleColumnDrop: hookDrop,
    handleColumnDragEnd: hookDragEnd
  } = useColumnManager({ queryResults, queryIdentifier: columnNamesHash });

  const [isBulkEditModalVisible, setIsBulkEditModalVisible] = useState<boolean>(false);
  
  const { savedQueries, addSavedQuery, deleteSavedQuery } = useSavedQueries();
  
  const [showSheetsDialog, setShowSheetsDialog] = useState<boolean>(false);
  const [sheetsTitle, setSheetsTitle] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  const [templates, setTemplates] = useState<string[]>(['default']);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [sheetsAuthStatus, setSheetsAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  React.useEffect(() => {
    setDestination('sportsdb');
  }, [setDestination]);
  
  useEffect(() => {
    const loadTemplatesAndAuthStatus = async () => {
      try {
        setIsLoadingTemplates(true);
        const templateResponse = await apiClient.get('/export/templates');
        if (templateResponse.data && Array.isArray(templateResponse.data)) {
          setTemplates(templateResponse.data);
        }
        
        const authResponse = await apiClient.get('/export/auth/status');
        if (authResponse.data && authResponse.data.authenticated !== undefined) {
          setSheetsAuthStatus(authResponse.data.authenticated ? 'authenticated' : 'unauthenticated');
        } else {
          setSheetsAuthStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Error loading templates or auth status:', error);
        setTemplates(['default']);
        setSheetsAuthStatus('unauthenticated');
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    
    loadTemplatesAndAuthStatus();
  }, []);
  
  useEffect(() => {
    if (queryName) {
      setSheetsTitle(queryName);
    } else {
      setSheetsTitle(`Query Results - ${new Date().toLocaleDateString()}`);
    }
  }, [queryName]);
  
  const sortedResults = useMemo(() => {
    if (!sortConfig || queryResults.length === 0) return queryResults;
    
    return [...queryResults].sort((a, b) => {
      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];
      
      if (aValue === null || aValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue === null || bValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return sortConfig.direction === 'asc' 
        ? (aValue > bValue ? 1 : -1) 
        : (aValue > bValue ? -1 : 1);
    });
  }, [queryResults, sortConfig]);
  
  const formatCellValue = useCallback((value: any, column: string) => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      if (column === 'id' || column.endsWith('_id')) {
        if (column === 'entity_id' && !showFullUuids) {
          return `${value.substring(0, 8)}...`;
        }
        
        if (column === 'division_conference_id' && !showFullUuids) {
          const currentRow = sortedResults.find(row => row[column] === value);
          if (currentRow && currentRow['division_conference_name']) {
            return currentRow['division_conference_name']; 
          }
        }
        
        const nameField = column === 'id' ? 'name' : column.replace('_id', '_name');
        
        if (nameField && queryResults.some(row => nameField in row)) {
          const currentRow = sortedResults.find(row => row[column] === value);
          
          if (currentRow && currentRow[nameField] && 
              currentRow[nameField] !== 'N/A' && 
              currentRow[nameField] !== 'NULL') {
            return showFullUuids ? value : currentRow[nameField];
          }
        }
        
        if (!showFullUuids) {
          const entityRow = sortedResults.find(row => row.id === value && row.name);
          if (entityRow?.name) {
            return entityRow.name;
          }
          
          if (column === 'broadcast_company_id') {
            const matchingCompany = sortedResults.find(row => row.id === value && row.type === 'Broadcaster');
            if (matchingCompany?.name) {
              return matchingCompany.name;
            }
            
            const currentRow = sortedResults.find(row => row[column] === value);
            if (currentRow?.broadcast_company_name) {
              return currentRow.broadcast_company_name;
            }
          }
        }
        
        return showFullUuids ? value : `${value.substring(0, 8)}...`;
      }
    }
    
    return String(value);
  }, [showFullUuids, sortedResults]);
  
  const deleteSelectedRows = () => {
    const newResults = sortedResults.filter((_, index) => !selectedRows.has(index));
    setQueryResults(newResults);
    setSelectedRows(new Set());
  };
  
  const handleBulkEdit = () => {
    if (selectedRowCount === 0) {
      showNotification('warning', 'Please select rows to edit');
      return;
    }
    setIsBulkEditModalVisible(true);
  };
  
  const handleBulkEditSuccess = (updatedResults: any[]) => {
    setQueryResults(updatedResults);
    setSelectedRows(new Set());
    showNotification('success', 'Bulk edit completed successfully');
  };
  
  useEffect(() => {
    if (queryMutationFromHook.data) {
      const data = queryMutationFromHook.data;
      if (data.success === false && data.validation_error) {
        console.log('SQL validation failed', data);
        setValidationError(data.validation_error);
        setSuggestedSql(data.suggested_sql || null);
        if (data.suggested_sql) {
          showNotification('warning', 'SQL validation issues found. Apply the suggested fix or edit the SQL.');
        } else {
          showNotification('warning', 'SQL validation detected issues but couldn\'t generate a fix');
        }
      } else {
        setValidationError(null);
        setSuggestedSql(null);
        console.log('Query executed successfully', data);
        setQueryResults(data.results || []);
        if (data.generated_sql) {
          setGeneratedSql(data.generated_sql);
        }
        if (data.export?.format === 'sheets') {
          if (data.export.error) {
            showNotification('error', data.export.error);
          } else if (data.export.url) {
            window.open(data.export.url, '_blank');
          }
        }
      }
    }
  }, [queryMutationFromHook.data, setValidationError, setSuggestedSql, showNotification, setGeneratedSql]);
  
  useEffect(() => {
    if (queryMutationFromHook.error) {
      const error = queryMutationFromHook.error;
      console.error('Error executing query via hook:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      if (typeof error === 'object' && error !== null && 'response' in error && 
          typeof (error as any).response === 'object' && (error as any).response !== null && 'status' in (error as any).response) {
        const axiosError = error as { response: { status: number; data?: { detail?: string; message?: string } } };
        if (axiosError.response.status === 401) {
          showNotification('error', 'Authentication error: Please log in again.');
        } else {
          const apiErrorMessage = axiosError.response?.data?.detail || axiosError.response?.data?.message || errorMessage;
          showNotification('error', `Error executing query: ${apiErrorMessage}`);
        }
      } else {
        showNotification('error', `Error executing query: ${errorMessage}`);
      }
      setGeneratedSql(null);
    }
  }, [queryMutationFromHook.error, showNotification, setGeneratedSql]);
  
  useEffect(() => {
    if (queryMutationFromHook.isSuccess || queryMutationFromHook.isError) {
      setExportFormat(null);
    }
  }, [queryMutationFromHook.isSuccess, queryMutationFromHook.isError]);
  
  const executeQuery = async () => {
    const queryText = !isNaturalLanguage && generatedSql ? generatedSql : naturalLanguageQuery;
    
    if (!queryText.trim() || isTranslating) return;
    
    const isValidToken = await ensureValidToken();
    if (!isValidToken) {
      showNotification('error', 'Authentication failed. Please log in again.');
      return;
    }
    
    const queryDataToSubmit = {
      query: queryText,
      natural_language: isNaturalLanguage || !generatedSql,
      export_format: exportFormat || undefined,
      sheet_title: (exportFormat === 'sheets' && sheetsTitle) ? sheetsTitle : undefined,
      queryName: queryName || undefined
    };
    
    try {
      queryMutationFromHook.mutate(queryDataToSubmit);
    } catch (error) {
      console.error('Error in executeQuery calling mutate:', error);
      showNotification('error', 'An unexpected error occurred while trying to execute the query.');
    }
  };

  const saveQuery = () => {
    if (!naturalLanguageQuery.trim() || !queryName.trim()) return;
    
    const newQueryData = {
      name: queryName,
      query: naturalLanguageQuery,
      sql: generatedSql || '',
      isNaturalLanguage: true,
    };
    addSavedQuery(newQueryData);
    alert(`Query "${queryName}" has been saved`);
  };
  
  const handleSheetsAuth = async () => {
    try {
      const response = await apiClient.get('/export/auth/google');
      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No authentication URL returned');
      }
    } catch (error) {
      console.error('Error initiating Google authentication:', error);
      alert('Failed to start Google authentication. Please try again.');
    }
  };
  
  const handleExportToSheets = async () => {
    if (!sheetsTitle.trim()) {
      alert('Please enter a title for your Google Sheet');
      return;
    }
    
    try {
      setIsExporting(true);
      
      const visibleHeaders = reorderedColumns.filter(col => visibleColumns[col]);
      
      const rows = queryResults.map(row => 
        visibleHeaders.map(h => row[h])
      );
      const allRows = [visibleHeaders, ...rows];
      
      const response = await apiClient.post('/export/sheets', {
        data: allRows,
        template_name: selectedTemplate,
        title: sheetsTitle
      });
      
      console.log('Google Sheets export response:', response.data);
      
      if (response.data && response.data.spreadsheetUrl) {
        window.open(response.data.spreadsheetUrl, '_blank');
        setShowSheetsDialog(false);
        alert('Data exported successfully to Google Sheets');
      } else {
        throw new Error('No spreadsheet URL returned');
      }
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      alert('Failed to export to Google Sheets. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  const exportResults = (format: string) => {
    setExportFormat(format);
    executeQuery();
  };
  
  const exportExistingResults = async (format: string) => {
    if (queryResults.length === 0) return;
    
    try {
      if (format === 'csv') {
        setIsExporting(true);
      } else if (format === 'sheets') {
        setShowSheetsDialog(true);
        return;
      }
      
      const filename = queryName ? 
        `${queryName.replace(/[^a-zA-Z0-9]/g, '_')}.csv` : 
        'query_results.csv';
      
      console.log('Exporting results:', {
        resultCount: queryResults.length,
        format,
        filename
      });
      
      if (format === 'csv') {
        try {
          const visibleHeaders = reorderedColumns.filter(col => visibleColumns[col]);
          
          let csvContent = visibleHeaders.join(',') + '\n';
          
          queryResults.forEach(row => {
            const values = visibleHeaders.map(header => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'string') {
                if (value.includes('"') || value.includes(',') || value.includes('\n')) {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
              }
              return String(value);
            });
            csvContent += values.join(',') + '\n';
          });
          
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.setAttribute('download', filename);
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          console.log('CSV download initiated with visible columns:', visibleHeaders);
        } catch (error) {
          console.error('Error generating CSV:', error);
          alert('Error generating CSV. Please try again.');
        }
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      alert(`Failed to export to ${format}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  const pageActions = (
    <div className="flex gap-2">
      <button
        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 flex items-center"
        onClick={saveQuery}
        disabled={!naturalLanguageQuery.trim() || !queryName.trim()}
      >
        <FaSave className="mr-2" /> Save Query
      </button>
      
      <div className="relative group">
        <button
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 flex items-center"
          disabled={!naturalLanguageQuery.trim() || queryMutationFromHook.isLoading}
        >
          <FaFileExport className="mr-2" /> Export
        </button>
        <div className="absolute right-0 z-10 hidden mt-2 bg-white border border-gray-200 rounded-md shadow-lg group-hover:block">
          <button
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            onClick={() => queryResults.length > 0 ? exportExistingResults('csv') : exportResults('csv')}
            disabled={queryMutationFromHook.isLoading || isTranslating}
          >
            <FaFileAlt className="inline mr-2" /> Export as CSV
          </button>
          <button
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            onClick={() => queryResults.length > 0 ? exportExistingResults('sheets') : exportResults('sheets')}
            disabled={queryMutationFromHook.isLoading || isTranslating}
          >
            <FaTable className="inline mr-2" /> Export to Google Sheets
          </button>
        </div>
      </div>
    </div>
  );

  const renderSheetsDialog = () => {
    if (!showSheetsDialog) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Export to Google Sheets</h2>
            <button
              onClick={() => setShowSheetsDialog(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div>
            {sheetsAuthStatus === 'checking' ? (
              <div className="flex items-center mb-4">
                <LoadingSpinner size="small" />
                <span className="ml-2">Checking authentication...</span>
              </div>
            ) : sheetsAuthStatus === 'authenticated' ? (
              <div className="flex items-center text-green-600 mb-4">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Connected to Google Sheets
              </div>
            ) : (
              <div className="mb-4">
                <p className="mb-2">To export to Google Sheets, you need to authenticate with your Google account.</p>
                <button
                  onClick={handleSheetsAuth}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Connect to Google Sheets
                </button>
              </div>
            )}
            
            {sheetsAuthStatus === 'authenticated' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template
                  </label>
                  {isLoadingTemplates ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {templates.map(template => (
                        <option key={template} value={template}>
                          {template}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spreadsheet Name
                  </label>
                  <input
                    type="text"
                    value={sheetsTitle}
                    onChange={(e) => setSheetsTitle(e.target.value)}
                    placeholder="Enter spreadsheet name"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowSheetsDialog(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded mr-2 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExportToSheets}
                    disabled={isExporting || !sheetsTitle.trim()}
                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
                  >
                    {isExporting ? (
                      <>
                        <LoadingSpinner size="small" className="text-white" />
                        <span className="ml-2">Exporting...</span>
                      </>
                    ) : (
                      'Export to Google Sheets'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const {
    selectedRows,
    setSelectedRows,
    selectAll,
    toggleRowSelection,
    toggleSelectAll,
    selectedRowCount
  } = useRowSelection({ itemCount: sortedResults.length });
  
  return (
    <div className="h-full pt-0">
      {renderSheetsDialog()}
      <div className="page-content">
        <div className="space-y-4">
          <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
              <h3 className="text-lg font-medium">Query Editor</h3>
              {pageActions}
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Query Name (for saving)
                </label>
                <input
                  type="text"
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter a name for this query"
                />
              </div>
              
              <div className="mb-4">
                <p className="mt-1 text-xs text-gray-500">
                  Ask questions about your database in plain English, or write SQL directly. The system will translate natural language to SQL and execute the query.
                </p>
              </div>
              
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Question
                      </label>
                      <button 
                        onClick={clearNaturalLanguageQuery}
                        className="text-gray-400 hover:text-gray-600 px-1 text-xs"
                        title="Clear"
                      >
                        <FaTrash className="inline" /> Clear
                      </button>
                    </div>
                    <textarea
                      value={naturalLanguageQuery}
                      onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md h-48"
                      placeholder="E.g., Show me all users who signed up last month with their email addresses"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        SQL Query
                      </label>
                      <div>
                        {suggestedSql && (
                          <button 
                            onClick={applySuggestedFix}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs mr-2"
                            title="Apply suggested SQL fix"
                          >
                            <FaCheck className="inline mr-1" /> Apply Fix
                          </button>
                        )}
                        <button 
                          onClick={clearGeneratedSql}
                          className="text-gray-400 hover:text-gray-600 px-1 text-xs"
                          title="Clear"
                        >
                          <FaTrash className="inline" /> Clear
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={generatedSql || ''}
                      onChange={(e) => setGeneratedSql(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md font-mono h-48 ${
                        validationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter SQL directly or use the Translate button to generate SQL from your question"
                    />
                    
                    {validationError && (
                      <div className="mt-2 p-3 border border-red-300 bg-red-50 rounded text-sm">
                        <div className="font-semibold mb-2">SQL Validation Issues:</div>
                        <pre className="whitespace-pre-wrap text-xs">{validationError}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={handleTranslateQuery}
                  disabled={!naturalLanguageQuery.trim() || isTranslating || queryMutationFromHook.isLoading}
                  className={`px-3 py-1 text-sm rounded flex items-center ${
                    !naturalLanguageQuery.trim() || isTranslating || queryMutationFromHook.isLoading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {isTranslating ? <LoadingSpinner size="small" /> : <FaKeyboard className="mr-2" />}
                  {isTranslating ? 'Translating...' : 'Translate'}
                </button>
                <button
                  onClick={executeQuery}
                  disabled={(!naturalLanguageQuery.trim() && !generatedSql?.trim()) || queryMutationFromHook.isLoading || isTranslating}
                  className={`px-3 py-1 text-sm rounded flex items-center ${
                    (!naturalLanguageQuery.trim() && !generatedSql?.trim()) || queryMutationFromHook.isLoading || isTranslating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {queryMutationFromHook.isLoading ? <LoadingSpinner size="small" /> : <FaPlay className="mr-2" />}
                  {queryMutationFromHook.isLoading ? 'Executing...' : 'Execute Query'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
              <h3 className="text-lg font-medium">Query Results</h3>
            </div>
            
            <div className="p-4">
              {queryMutationFromHook.isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <LoadingSpinner size="medium" />
                  <span className="ml-2 text-gray-600">Executing query...</span>
                </div>
              ) : queryMutationFromHook.isError ? (
                <div className="text-red-500 p-4 border border-red-200 rounded bg-red-50">
                  Error: {(queryMutationFromHook.error as Error)?.message || 'Failed to execute query'}
                </div>
              ) : queryResults.length > 0 ? (
                <div>
                  <div className="mb-4 text-green-600 p-2 border border-green-200 rounded bg-green-50 flex justify-between items-center">
                    <span>
                      Query executed successfully - 
                      {selectedRowCount > 0 
                        ? ` ${selectedRowCount} of ${queryResults.length} rows selected` 
                        : ` ${queryResults.length} rows returned`}
                    </span>
                    <div className="flex space-x-2">
                      <button 
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        onClick={() => exportExistingResults('csv')}
                        disabled={queryMutationFromHook.isLoading || isTranslating}
                      >
                        <FaFileAlt className="inline mr-1" /> Export CSV
                      </button>
                      <button 
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        onClick={() => exportExistingResults('sheets')}
                        disabled={queryMutationFromHook.isLoading || isTranslating}
                      >
                        <FaTable className="inline mr-1" /> Export to Sheets
                      </button>
                      <button 
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => setShowColumnSelector(!showColumnSelector)}
                      >
                        <FaColumns className="inline mr-1" /> Columns
                      </button>
                      <button 
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        onClick={() => setShowFullUuids(!showFullUuids)}
                      >
                        <FaKey className="inline mr-1" /> {showFullUuids ? 'Names' : 'IDs'}
                      </button>
                      <button 
                        className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                        onClick={() => {
                          setQueryResults([]);
                          setSelectedRows(new Set());
                          sessionStorage.removeItem('queryResults');
                          sessionStorage.removeItem('visibleColumns');
                          sessionStorage.removeItem('sortConfig');
                        }}
                      >
                        <FaTrash className="inline mr-1" /> Clear Results
                      </button>
                      {selectedRowCount > 0 && (
                        <>
                          <button 
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                            onClick={handleBulkEdit}
                          >
                            <FaEdit className="inline mr-1" /> Bulk Edit {selectedRowCount} row(s)
                          </button>
                          <button 
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            onClick={deleteSelectedRows}
                          >
                            <FaTrash className="inline mr-1" /> Delete {selectedRowCount} row(s)
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {showColumnSelector && (
                    <div className="mb-4 p-3 border border-gray-200 rounded bg-white">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-700">Column Visibility</h4>
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={showAllColumns}
                        >
                          Show All Columns
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {(columnOrder.length > 0 ? columnOrder : (queryResults.length > 0 ? Object.keys(queryResults[0]) : [])).map((column) => (
                          <div key={column} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`col-${column}`}
                              checked={visibleColumns[column] || false}
                              onChange={() => toggleColumnVisibility(column)}
                              className="mr-2"
                            />
                            <label htmlFor={`col-${column}`} className="text-sm text-gray-700 truncate">
                              {column}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <QueryResultsTable
                    sortedResults={sortedResults}
                    reorderedColumns={reorderedColumns}
                    visibleColumns={visibleColumns}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    draggedItem={draggedItem}
                    dragOverItem={dragOverItem}
                    hookDragStart={hookDragStart}
                    hookDragOver={hookDragOver}
                    hookDrop={hookDrop}
                    hookDragEnd={hookDragEnd}
                    selectedRows={selectedRows}
                    selectAll={selectAll}
                    toggleRowSelection={toggleRowSelection}
                    toggleSelectAll={toggleSelectAll}
                    formatCellValue={formatCellValue}
                  />
                </div>
              ) : queryMutationFromHook.isSuccess && queryResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-amber-600">
                  <FaDatabase className="text-4xl mb-4" />
                  <p>Query executed successfully, but returned no results</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <FaDatabase className="text-4xl mb-4" />
                  <p>Enter a query and click Execute to see results</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
              <h3 className="text-lg font-medium">Saved Queries</h3>
            </div>
            <div className="p-4">
              {savedQueries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <p>Your saved queries will appear here</p>
                  <p className="text-sm mt-2">Save a query to add it to your collection</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedQueries.map((query) => (
                    <div key={query.id} className="border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">{query.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${query.isNaturalLanguage ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {query.isNaturalLanguage ? 'Natural Language' : 'SQL'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mb-2 truncate">
                        {query.query.length > 60 ? query.query.substring(0, 60) + '...' : query.query}
                      </div>
                      <div className="text-xs text-gray-400 mb-3">
                        Saved on {new Date(query.timestamp).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                          onClick={() => {
                            setNaturalLanguageQuery(query.query);
                            setIsNaturalLanguage(true);
                            setQueryName(`${query.name} (Copy)`);
                            setGeneratedSql(query.sql || null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Load Query
                        </button>
                        <button
                          className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${query.name}"?`)) {
                              deleteSavedQuery(query.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <BulkEditModal
        visible={isBulkEditModalVisible}
        onCancel={() => setIsBulkEditModalVisible(false)}
        queryResults={queryResults} 
        selectedIndexes={selectedRows}
        onSuccess={handleBulkEditSuccess}
      />
    </div>
  );
};

export default DatabaseQuery; 