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
  } = useColumnManager({ queryResults, queryIdentifier: columnNamesHash });

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
        
        if (nameField && queryResults.length > 0 && queryResults[0].hasOwnProperty(nameField)) {
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
  }, [showFullUuids, sortedResults, queryResults]);
  
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
        setValidationError(data.validation_error);
        setSuggestedSql(data.suggested_sql || null);
        showNotification('warning', data.suggested_sql ? 'SQL validation issues found. Apply fix or edit SQL.' : 'SQL validation issues found.');
      } else if (data.success === true) {
        setValidationError(null);
        setSuggestedSql(null);
        setQueryResults(data.results || []);
        if (data.generated_sql) {
          setGeneratedSql(data.generated_sql);
        }
        if (data.export?.format === 'sheets') {
          if (data.export.error) {
            showNotification('error', data.export.error);
          } else if (data.export.url) {
            window.open(data.export.url, '_blank');
            showNotification('success', 'Successfully exported to Google Sheets via backend.');
            exporter.closeSheetsDialog();
          }
        } else if (data.export?.format === 'csv' && data.export.url) {
            window.open(data.export.url, '_blank');
            showNotification('success', 'CSV download link ready (via backend).');
        }
      }
    }
  }, [queryMutationFromHook.data, setValidationError, setSuggestedSql, showNotification, setGeneratedSql, exporter]);
  
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
            (!naturalLanguageQuery.trim() && !generatedSql?.trim() && queryResults.length === 0) ||
            queryMutationFromHook.isLoading || isTranslating
          }
        >
          <FaFileExport className="mr-2" /> Export
        </button>
        <div className="absolute right-0 z-10 hidden mt-2 bg-white border border-gray-200 rounded-md shadow-lg group-hover:block">
          <button
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            onClick={() => 
              queryResults.length > 0 
                ? exporter.exportCurrentDataToCsvClientSide(queryResults, reorderedColumns, visibleColumns, queryName)
                : exporter.triggerBackendExport('csv')
            }
            disabled={queryMutationFromHook.isLoading || isTranslating}
          >
            <FaFileAlt className="inline mr-2" /> Export as CSV
          </button>
          <button
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            onClick={() => 
              queryResults.length > 0
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
    if (queryResults.length > 0) {
      exporter.exportCurrentDataToSheetsAPI(queryResults, reorderedColumns, visibleColumns);
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
            validationError={validationError}
            suggestedSql={suggestedSql}
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
              ) : queryResults.length > 0 ? (
                <div>
                  <QueryResultsToolbar
                    queryResultsCount={queryResults.length}
                    selectedRowCount={selectedRowCount}
                    onExportCsv={() => exporter.exportCurrentDataToCsvClientSide(queryResults, reorderedColumns, visibleColumns, queryName)}
                    onExportSheets={exporter.openSheetsDialog}
                    onToggleColumns={() => setShowColumnSelector(!showColumnSelector)}
                    onToggleUuids={() => setShowFullUuids(!showFullUuids)}
                    showFullUuids={showFullUuids}
                    onClearResults={deleteSelectedRows}
                    onBulkEdit={handleBulkEdit}
                    onDeleteSelected={deleteSelectedRows}
                    isLoading={queryMutationFromHook.isLoading}
                    isTranslating={isTranslating}
                  />
                  
                  {showColumnSelector && (
                    <ColumnSelectorPanel 
                      allColumns={columnOrder.length > 0 ? columnOrder : (queryResults.length > 0 ? Object.keys(queryResults[0]) : [])}
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