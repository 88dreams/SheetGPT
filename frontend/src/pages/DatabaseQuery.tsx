import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, UseMutationResult } from '@tanstack/react-query';
import { useDataFlow } from '../contexts/DataFlowContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiClient } from '../utils/apiClient';
import { ensureValidToken } from '../utils/tokenRefresh';
import usePageTitle from '../hooks/usePageTitle';
import { useColumnManager } from '../hooks/useColumnManager';
import { useQueryInput } from '../hooks/useQueryInput';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageContainer from '../components/common/PageContainer';
import { Modal } from 'antd';
import { 
  FaDatabase, FaPlay, FaDownload, FaSave, FaFileExport, FaTable, FaKeyboard, 
  FaFileCode, FaFileAlt, FaSort, FaSortUp, FaSortDown, FaEye, FaEyeSlash, 
  FaTrash, FaCheck, FaColumns, FaEdit, FaPencilAlt, FaKey, FaArrowsAlt
} from 'react-icons/fa';
import BulkEditModal from '../components/common/BulkEditModal';
import QueryResultsTable from '../components/query/QueryResultsTable';
import { useRowSelection } from '../hooks/useRowSelection';
import { QueryData, useQueryExecution } from '../hooks/useQueryExecution';
import { useSavedQueries, SavedQuery } from '../hooks/useSavedQueries';
import { useExporter, BackendQueryArgsForExport } from '../hooks/useExporter';
import SheetsExportDialog from '../components/query/SheetsExportDialog';
import QueryInputPanel from '../components/query/QueryInputPanel';
import QueryResultsToolbar from '../components/query/QueryResultsToolbar';
import SavedQueriesDisplay from '../components/query/SavedQueriesDisplay';
import ColumnSelectorPanel from '../components/query/ColumnSelectorPanel';

const SESSION_STORAGE_KEY = 'databaseQueryState';

interface PersistedQueryState {
  naturalLanguageQuery: string;
  queryName: string;
  generatedSql: string | null;
  isNaturalLanguage: boolean;
  executedQueryResults: any[];
  executionValidationError: string | null;
  executionSuggestedSql: string | null;
  executionGeneratedSql: string | null;
}

const DatabaseQuery: React.FC = () => {
  usePageTitle('Database Query');
  
  const { setDestination } = useDataFlow();
  const { showNotification } = useNotification();
  
  const [isStateLoadedFromStorage, setIsStateLoadedFromStorage] = useState(false);

  const {
    naturalLanguageQuery,
    setNaturalLanguageQuery,
    queryName,
    setQueryName,
    generatedSql,
    setGeneratedSql,
    isNaturalLanguage,
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
  
  const {
    mutation: queryMutationFromHook,
    executedQueryResults,
    setExecutedQueryResults,
    executionValidationError,
    setExecutionValidationError,
    executionSuggestedSql,
    setExecutionSuggestedSql,
    executionGeneratedSql,
    setExecutionGeneratedSql,
  } = useQueryExecution({ initialQueryName: queryName });
  
  const columnNamesHash = useMemo(() => {
      if (executedQueryResults.length === 0) return 'no_results';
      return Object.keys(executedQueryResults[0]).sort().join('|');
  }, [executedQueryResults]);

  const {
    visibleColumns,
    showColumnSelector,
    showFullUuids,
    columnOrder,
    sortConfig,
    reorderedColumns,
    setShowColumnSelector,
    setShowFullUuids,
    toggleColumnVisibility,
    showAllColumns,
    handleSort,
    draggedItem,
    dragOverItem,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnDrop,
    handleColumnDragEnd
  } = useColumnManager({ queryResults: executedQueryResults, queryIdentifier: columnNamesHash });

  const [isBulkEditModalVisible, setIsBulkEditModalVisible] = useState<boolean>(false);
  
  const { savedQueries, addSavedQuery, deleteSavedQuery } = useSavedQueries();
  
  const getLatestQueryForBackendExport = useCallback(() => {
    return {
      queryText: (!isNaturalLanguage && generatedSql) ? generatedSql : naturalLanguageQuery,
      isNaturalLanguage: isNaturalLanguage || !generatedSql,
    };
  }, [naturalLanguageQuery, generatedSql, isNaturalLanguage]);

  const exporter = useExporter({
    baseQueryName: queryName,
    showNotification,
    apiClient,
    executeBackendQuery: queryMutationFromHook.mutate as (params: BackendQueryArgsForExport) => void,
    getLatestQueryForBackendExport,
  });
  
  React.useEffect(() => {
    setDestination('sportsdb');
  }, [setDestination]);
  
  const sortedResults = useMemo(() => {
    if (!sortConfig || executedQueryResults.length === 0) return executedQueryResults;
    
    return [...executedQueryResults].sort((a, b) => {
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
  }, [executedQueryResults, sortConfig]);
  
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
        
        if (nameField && executedQueryResults.length > 0 && executedQueryResults[0].hasOwnProperty(nameField)) {
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
  }, [showFullUuids, sortedResults, executedQueryResults]);
  
  const deleteSelectedRows = () => {
    const newResults = sortedResults.filter((_, index) => !selectedRows.has(index));
    setExecutedQueryResults(newResults);
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
    setExecutedQueryResults(updatedResults);
    setSelectedRows(new Set());
    showNotification('success', 'Bulk edit completed successfully');
  };
  
  useEffect(() => {
    if (executionGeneratedSql !== null) {
      setGeneratedSql(executionGeneratedSql);
    }
  }, [executionGeneratedSql, setGeneratedSql]);
  
  const executeQueryForDisplay = async () => {
    const queryText = !isNaturalLanguage && generatedSql ? generatedSql : naturalLanguageQuery;
    
    if (!queryText.trim() || isTranslating) return;
    
    const isValidToken = await ensureValidToken();
    if (!isValidToken) {
      showNotification('error', 'Authentication failed. Please log in again.');
      return;
    }
    
    const queryDataToSubmit: QueryData = {
      query: queryText,
      natural_language: isNaturalLanguage || !generatedSql,
      queryName: queryName || undefined
    };
    
    try {
      queryMutationFromHook.mutate(queryDataToSubmit);
    } catch (error) {
      console.error('Error in executeQueryForDisplay calling mutate:', error);
      showNotification('error', 'An unexpected error occurred while trying to execute the query.');
    }
  };

  const saveQuery = () => {
    if (!naturalLanguageQuery.trim() || !queryName.trim()) return;
    
    const newQueryData: SavedQuery = {
      id: '',
      timestamp: new Date().toISOString(),
      name: queryName,
      query: naturalLanguageQuery,
      sql: generatedSql || '',
      isNaturalLanguage: true,
    };
    addSavedQuery(newQueryData);
    showNotification('success', `Query "${queryName}" has been saved`);
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
          disabled={
            (!naturalLanguageQuery.trim() && !generatedSql?.trim() && executedQueryResults.length === 0) ||
            queryMutationFromHook.isLoading || isTranslating
          }
        >
          <FaFileExport className="mr-2" /> Export
        </button>
        <div className="absolute right-0 z-10 hidden mt-2 bg-white border border-gray-200 rounded-md shadow-lg group-hover:block">
          <button
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            onClick={() => 
              executedQueryResults.length > 0 
                ? exporter.exportCurrentDataToCsvClientSide(executedQueryResults, reorderedColumns, visibleColumns, queryName)
                : exporter.triggerBackendExport('csv')
            }
            disabled={queryMutationFromHook.isLoading || isTranslating}
          >
            <FaFileAlt className="inline mr-2" /> Export as CSV
          </button>
          <button
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            onClick={() => 
              executedQueryResults.length > 0
                ? exporter.openSheetsDialog()
                : exporter.triggerBackendExport('sheets', { sheetTitle: exporter.sheetsDialogTitle, templateName: exporter.selectedSheetTemplate })
            }
            disabled={queryMutationFromHook.isLoading || isTranslating}
          >
            <FaTable className="inline mr-2" /> Export to Google Sheets
          </button>
        </div>
      </div>
    </div>
  );

  const {
    selectedRows,
    setSelectedRows,
    selectAll,
    toggleRowSelection,
    toggleSelectAll,
    selectedRowCount
  } = useRowSelection({ itemCount: sortedResults.length });
  
  const handleConfirmSheetsExportFromDialog = () => {
    if (executedQueryResults.length > 0) {
      exporter.exportCurrentDataToSheetsAPI(executedQueryResults, reorderedColumns, visibleColumns);
    } else {
      exporter.triggerBackendExport('sheets', {
        sheetTitle: exporter.sheetsDialogTitle,
        templateName: exporter.selectedSheetTemplate,
      });
    }
  };

  const handleLoadSavedQuery = useCallback((query: SavedQuery) => {
    setNaturalLanguageQuery(query.query);
    setQueryName(`${query.name} (Copy)`);
    setGeneratedSql(query.sql || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showNotification('info', `Loaded query: "${query.name}"`);
  }, [setNaturalLanguageQuery, setQueryName, setGeneratedSql, showNotification]);

  // Log changes to naturalLanguageQuery directly
  useEffect(() => {
    console.log('[DEBUG] naturalLanguageQuery changed to:', naturalLanguageQuery);
  }, [naturalLanguageQuery]);

  // Log changes to executedQueryResults directly
  useEffect(() => {
    console.log('[DEBUG] executedQueryResults changed, length:', executedQueryResults?.length);
  }, [executedQueryResults]);

  // Load state from sessionStorage on mount
  useEffect(() => {
    console.log('[DEBUG] Attempting to load state from sessionStorage...');
    const storedStateRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (storedStateRaw) {
      try {
        const storedState: PersistedQueryState = JSON.parse(storedStateRaw);
        console.log('[DEBUG] Found stored state:', storedState);

        const rehydratedGeneratedSql = storedState.generatedSql || null;
        let rehydratedExecutionGeneratedSql = storedState.executionGeneratedSql || null;

        // If the main generatedSql was explicitly cleared (is null in storage),
        // then also treat executionGeneratedSql as cleared for rehydration purposes,
        // to prevent the sync effect from immediately overwriting the cleared input.
        if (rehydratedGeneratedSql === null) {
          rehydratedExecutionGeneratedSql = null;
        }

        console.log(`[DEBUG] Calling setNaturalLanguageQuery with: "${storedState.naturalLanguageQuery || ''}"`);
        setNaturalLanguageQuery(storedState.naturalLanguageQuery || '');
        
        console.log(`[DEBUG] Calling setQueryName with: "${storedState.queryName || ''}"`);
        setQueryName(storedState.queryName || '');

        console.log(`[DEBUG] Calling setGeneratedSql with: "${rehydratedGeneratedSql}"`);
        setGeneratedSql(rehydratedGeneratedSql); // This calls handleSqlChange from useQueryInput
        
        if (setExecutedQueryResults) {
            console.log(`[DEBUG] Calling setExecutedQueryResults with ${storedState.executedQueryResults?.length || 0} items.`);
            setExecutedQueryResults(storedState.executedQueryResults || []);
        } else {
            console.warn('[DEBUG] setExecutedQueryResults is not defined!');
        }
        
        if (setExecutionValidationError) {
            console.log(`[DEBUG] Calling setExecutionValidationError with: "${storedState.executionValidationError || null}"`);
            setExecutionValidationError(storedState.executionValidationError || null);
        }
        if (setExecutionSuggestedSql) {
            console.log(`[DEBUG] Calling setExecutionSuggestedSql with: "${storedState.executionSuggestedSql || null}"`);
            setExecutionSuggestedSql(storedState.executionSuggestedSql || null);
        }
        if (setExecutionGeneratedSql) {
            console.log(`[DEBUG] Calling setExecutionGeneratedSql with: "${rehydratedExecutionGeneratedSql}"`);
            setExecutionGeneratedSql(rehydratedExecutionGeneratedSql);
        }
        
        console.log('DatabaseQuery: Loaded state from sessionStorage successfully.');
      } catch (error) {
        console.error('DatabaseQuery: Error parsing state from sessionStorage', error);
        sessionStorage.removeItem(SESSION_STORAGE_KEY); 
      }
    }
    setIsStateLoadedFromStorage(true); 
    console.log('[DEBUG] isStateLoadedFromStorage set to true.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Save state to sessionStorage when relevant parts change, only after initial load attempt
  useEffect(() => {
    if (!isStateLoadedFromStorage) {
      console.log('[DEBUG] Skipping save to sessionStorage: initial load not complete.');
      return; 
    }

    console.log('[DEBUG] Attempting to save state to sessionStorage...');
    const stateToPersist: PersistedQueryState = {
      naturalLanguageQuery,
      queryName,
      generatedSql,
      isNaturalLanguage: isNaturalLanguage || !generatedSql, 
      executedQueryResults,
      executionValidationError: executionValidationError || null,
      executionSuggestedSql,
      executionGeneratedSql,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToPersist));
    console.log('[DEBUG] Saved state to sessionStorage:', stateToPersist);
  }, [isStateLoadedFromStorage, naturalLanguageQuery, queryName, generatedSql, isNaturalLanguage, executedQueryResults, executionValidationError, executionSuggestedSql, executionGeneratedSql]);

  const clearAllQueryResults = () => {
    console.log('[DEBUG] Clearing all query results');
    if (setExecutedQueryResults) {
      setExecutedQueryResults([]);
    }
    if (setSelectedRows) {
      setSelectedRows(new Set());
    }
    showNotification('info', 'Query results have been cleared.');
  };

  return (
    <div className="h-full pt-0">
      <SheetsExportDialog
        isVisible={exporter.isSheetsDialogVisible}
        spreadsheetTitle={exporter.sheetsDialogTitle}
        setSpreadsheetTitle={exporter.setSheetsDialogTitle}
        selectedSheetTemplate={exporter.selectedSheetTemplate}
        setSelectedSheetTemplate={exporter.setSelectedSheetTemplate}
        availableSheetTemplates={exporter.availableSheetTemplates}
        isLoadingSheetTemplates={exporter.isLoadingSheetTemplates}
        sheetAuthStatus={exporter.sheetAuthStatus}
        isConfirmExportingInProgress={exporter.isExportingToSheetsInProgress || queryMutationFromHook.isLoading}
        onClose={exporter.closeSheetsDialog}
        onConfirmExport={handleConfirmSheetsExportFromDialog}
        onInitiateAuth={exporter.handleSheetsAuthentication}
      />
      <PageContainer title="Database Query" actions={pageActions}>
        <div className="space-y-4">
          <QueryInputPanel 
            queryName={queryName}
            setQueryName={setQueryName}
            naturalLanguageQuery={naturalLanguageQuery}
            setNaturalLanguageQuery={setNaturalLanguageQuery}
            generatedSql={generatedSql}
            setGeneratedSql={setGeneratedSql}
            validationError={executionValidationError}
            suggestedSql={executionSuggestedSql}
            isTranslating={isTranslating}
            isLoadingExecution={queryMutationFromHook.isLoading && !queryMutationFromHook.variables?.export_format}
            onTranslateQuery={handleTranslateQuery}
            onExecuteQuery={executeQueryForDisplay}
            onClearNLQ={clearNaturalLanguageQuery}
            onClearSQL={clearGeneratedSql}
            onApplyFix={applySuggestedFix}
          />
          
          <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium">Query Results</h3>
            </div>
            <div className="p-4">
              {queryMutationFromHook.isLoading && (!queryMutationFromHook.variables || !queryMutationFromHook.variables.export_format) ? (
                <div className="flex justify-center items-center h-64">
                  <LoadingSpinner size="medium" />
                  <span className="ml-2 text-gray-600">Executing query...</span>
                </div>
              ) : queryMutationFromHook.isError ? (
                <div className="text-red-500 p-4 border border-red-200 rounded bg-red-50">
                  Error: {(queryMutationFromHook.error as Error)?.message || 'Failed to execute query'}
                </div>
              ) : executedQueryResults.length > 0 ? (
                <div>
                  <QueryResultsToolbar
                    queryResultsCount={executedQueryResults.length}
                    selectedRowCount={selectedRowCount}
                    onExportCsv={() => exporter.exportCurrentDataToCsvClientSide(executedQueryResults, reorderedColumns, visibleColumns, queryName)}
                    onExportSheets={exporter.openSheetsDialog}
                    onToggleColumns={() => setShowColumnSelector(!showColumnSelector)}
                    onToggleUuids={() => setShowFullUuids(!showFullUuids)}
                    showFullUuids={showFullUuids}
                    onClearResults={clearAllQueryResults}
                    onBulkEdit={handleBulkEdit}
                    onDeleteSelected={deleteSelectedRows}
                    isLoading={queryMutationFromHook.isLoading}
                    isTranslating={isTranslating}
                  />
                  
                  {showColumnSelector && (
                    <ColumnSelectorPanel 
                      allColumns={columnOrder.length > 0 ? columnOrder : (executedQueryResults.length > 0 ? Object.keys(executedQueryResults[0]) : [])}
                      visibleColumns={visibleColumns}
                      onToggleColumn={toggleColumnVisibility}
                      onShowAllColumns={showAllColumns}
                    />
                  )}
                  
                  <QueryResultsTable
                    sortedResults={sortedResults}
                    reorderedColumns={reorderedColumns}
                    visibleColumns={visibleColumns}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    draggedItem={draggedItem}
                    dragOverItem={dragOverItem}
                    hookDragStart={handleColumnDragStart}
                    hookDragOver={handleColumnDragOver}
                    hookDrop={handleColumnDrop}
                    hookDragEnd={handleColumnDragEnd}
                    selectedRows={selectedRows}
                    selectAll={selectAll}
                    toggleRowSelection={toggleRowSelection}
                    toggleSelectAll={toggleSelectAll}
                    formatCellValue={formatCellValue}
                  />
                </div>
              ) : queryMutationFromHook.isSuccess && executedQueryResults.length === 0 ? (
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
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium">Saved Queries</h3>
            </div>
            <div className="p-4">
              <SavedQueriesDisplay
                savedQueries={savedQueries}
                onLoadQuery={handleLoadSavedQuery}
                onDeleteQuery={deleteSavedQuery}
              />
            </div>
          </div>
        </div>
      </PageContainer>
      
      <BulkEditModal
        open={isBulkEditModalVisible}
        onCancel={() => setIsBulkEditModalVisible(false)}
        queryResults={executedQueryResults} 
        selectedIndexes={selectedRows}
        onSuccess={handleBulkEditSuccess}
      />
    </div>
  );
};

export default DatabaseQuery; 