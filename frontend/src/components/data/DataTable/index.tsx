import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../utils/api';
import { StructuredData } from '../../../types/data';
import LoadingSpinner from '../../common/LoadingSpinner';
import ExportDialog from '../ExportDialog';
import { useNotification } from '../../../contexts/NotificationContext';
import { fingerprint } from '../../../utils/fingerprint';

// Import hooks
import {
  useColumnResize,
  useDragAndDrop,
  useResizable,
  usePagination,
  useDataTransformer
} from './hooks';

// To avoid TypeScript import issues, we'll implement basic sorting functionality inline
// instead of using the separate hooks

// Import components
import {
  DataGridHeader,
  DataGridTable,
  Pagination,
  RawDataViewer
} from './components';

interface DataTableProps {
  dataId: string;
}

/**
 * DataTable component for displaying structured data in a grid format
 * Uses a centralized data transformer to handle all data formats consistently
 */
const DataTable: React.FC<DataTableProps> = ({ dataId }) => {
  // UI state
  const [showHeaders, setShowHeaders] = useState(true);
  const [showRowNumbers, setShowRowNumbers] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Record<string, boolean>>({});
  const [showFullUuids, setShowFullUuids] = useState(false);
  const { showNotification } = useNotification();
  
  // State for reordered headers
  const [reorderedHeaders, setReorderedHeaders] = useState<string[]>([]);
  
  // State for reordered row indices
  const [reorderedRowIndices, setReorderedRowIndices] = useState<number[]>([]);

  // Fetch data
  const { data, isLoading, error } = useQuery<StructuredData | null, Error>({
    queryKey: ['structured-data', dataId],
    queryFn: () => api.data.getStructuredDataById(dataId),
  });
  
  // Simple inline sorting implementation
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | 'none'>('none');
  
  // Simple sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      // If clicking the same field, cycle through: asc -> desc -> none
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField('');
        setSortDirection('none');
      }
    } else {
      // If clicking a new field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Render sort icon (simplification)
  const renderSortIcon = (field: string) => {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };
  
  // Simple selection state
  const [selectedItems, setSelectedItems] = useState<Record<string | number, boolean>>({});
  
  // Toggle item selection
  const toggleItemSelection = (id: string | number) => {
    setSelectedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Toggle all items selection
  const toggleAllItemsSelection = (ids: (string | number)[]) => {
    // Check if all are selected
    const allSelected = ids.every(id => selectedItems[id]);
    
    if (allSelected) {
      // Deselect all
      setSelectedItems({});
    } else {
      // Select all
      const newSelectedItems: Record<string | number, boolean> = {};
      ids.forEach(id => {
        newSelectedItems[id] = true;
      });
      setSelectedItems(newSelectedItems);
    }
  };
  
  // Check if all items are selected
  const areAllItemsSelected = (ids: (string | number)[]) => {
    if (ids.length === 0) return false;
    return ids.every(id => selectedItems[id]);
  };

  // Grid resize hook
  const {
    height: gridHeight,
    isExpanded: isGridExpanded,
    toggleExpansion: toggleGridExpansion,
    handleResize: handleGridResize
  } = useResizable({ defaultHeight: 400, minHeight: 200 });

  // Raw data viewer resize hook
  const {
    height: rawDataHeight,
    isExpanded: isRawDataExpanded,
    toggleExpansion: toggleRawDataExpansion,
    handleResize: handleRawDataResize
  } = useResizable({ defaultHeight: 300, minHeight: 100 });

  // Initialize pagination
  const {
    currentPage,
    rowsPerPage,
    totalRows,
    totalPages,
    isPaginationEnabled,
    handlePageChange,
    handleRowsPerPageChange
  } = usePagination({
    totalItems: (data?.data && typeof data.data === 'object' && Array.isArray(data.data.rows) ? data.data.rows.length : 0),
    initialRowsPerPage: 50
  });
  
  // Calculate rowCount and hasHeaders safely
  const rowCount = (data?.data && typeof data.data === 'object' && Array.isArray(data.data.rows) ? data.data.rows.length : 0);
  const hasHeaders = (data?.data && typeof data.data === 'object' && Array.isArray(data.data.column_order) ? data.data.column_order.length > 0 : false);

  console.log('DataTable: Current data state:', {
    hasData: !!data,
    dataId,
    rowCount: rowCount, 
    hasHeaders: hasHeaders,
    dataStructure: data ? Object.keys(data) : []
  });

  // Fetch paginated rows when pagination is enabled
  const { 
    data: paginatedData, 
    isLoading: isPaginatedLoading
  } = useQuery({
    queryKey: ['structured-data-rows', dataId, currentPage, rowsPerPage],
    queryFn: async () => {
      const skip = (currentPage - 1) * rowsPerPage;
      const response = await api.data.getRows(dataId, skip, rowsPerPage);
      return response;
    },
    enabled: isPaginationEnabled && !!dataId,
  });

  // Use the data transformer hook
  const { headers, rows, total } = useDataTransformer({
    data,
    isPaginationEnabled,
    paginatedData
  });

  // Use the column resize hook
  const { columnWidths, tableRef, handleResizeStart } = useColumnResize({
    headers
  });
  
  // Load saved column visibility on mount
  React.useEffect(() => {
    if (!dataId) return;
    
    try {
      const savedVisibility = localStorage.getItem(`dataTable_${dataId}_columnVisibility`);
      if (savedVisibility) {
        setHiddenColumns(JSON.parse(savedVisibility));
      }
    } catch (error) {
      console.error('Error loading column visibility from localStorage:', error);
    }
  }, [dataId]);

  // Function to toggle column visibility
  const toggleColumnVisibility = (header: string) => {
    setHiddenColumns(prev => {
      const updated = {
        ...prev,
        [header]: !prev[header]
      };
      
      // Persist to localStorage
      if (dataId) {
        localStorage.setItem(`dataTable_${dataId}_columnVisibility`, JSON.stringify(updated));
      }
      
      return updated;
    });
  };
  
  // Memoize visibility state for headers
  const hiddenColumnsFingerprint = useMemo(() => fingerprint(hiddenColumns), [hiddenColumns]);
  const headersFingerprint = useMemo(() => fingerprint(headers), [headers]);
  
  // Filter visible headers with memoization
  const visibleHeaders = useMemo(() => 
    headers.filter(header => !hiddenColumns[header]),
    [headersFingerprint, hiddenColumnsFingerprint]
  );
  
  // Simplified CSV export
  const handleCsvExport = async () => {
    // Basic validation
    if (!rows || rows.length === 0 || !headers || headers.length === 0) {
      showNotification('error', 'No data available for export');
      return;
    }

    try {
      // Use the already memoized visibleHeaders
      let csvContent = visibleHeaders.join(',') + '\n';
      
      // Add data rows
      const sortedRows = getSortedData(rows);
      sortedRows.forEach(row => {
        const formattedRow = visibleHeaders.map(column => {
          const cellValue = row[column];
          const value = (cellValue === null || cellValue === undefined) ? '' : String(cellValue);
          return value.includes(',') ? `"${value}"` : value;
        });
        csvContent += formattedRow.join(',') + '\n';
      });
      
      // Create a blob for the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const filename = data?.meta_data?.name || 'export';
      const suggestedName = `${filename}.csv`;
      
      // Check if the File System Access API is supported
      if ('showSaveFilePicker' in window) {
        try {
          // Use modern File System Access API for OS-level save dialog
          const options = {
            suggestedName,
            types: [{
              description: 'CSV Files',
              accept: { 'text/csv': ['.csv'] }
            }]
          };
          
          // Show OS-level save dialog
          const fileHandle = await window.showSaveFilePicker(options);
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          showNotification('success', 'CSV file saved successfully');
        } catch (err) {
          // User cancelled or API failed, fall back to legacy approach
          if ((err as Error).name !== 'AbortError') {
            console.error('Error using File System Access API:', err);
            // Fall back to legacy download method
            fallbackDownload();
          }
        }
      } else {
        // Fall back to legacy download method for browsers without File System Access API
        fallbackDownload();
      }
      
      // Legacy download method as fallback
      function fallbackDownload() {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', suggestedName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('success', 'CSV file downloaded successfully');
      }
    } catch (e) {
      console.error('Error generating CSV:', e);
      showNotification('error', 'Failed to generate CSV file');
    }
  };

  // Use drag and drop for headers
  const {
    draggedItem: draggedHeader,
    dragOverItem: dragOverHeader,
    handleDragStart: handleHeaderDragStart,
    handleDragOver: handleHeaderDragOver,
    handleDrop: handleHeaderDrop,
    handleDragEnd: handleHeaderDragEnd
  } = useDragAndDrop<string>({ 
    items: reorderedHeaders,
    onReorder: setReorderedHeaders
  });

  // Use drag and drop for rows
  const {
    draggedItem: draggedRowIndex,
    dragOverItem: dragOverRowIndex,
    handleDragStart: handleRowDragStart,
    handleDragOver: handleRowDragOver,
    handleDrop: handleRowDrop,
    handleDragEnd: handleRowDragEnd
  } = useDragAndDrop<number>({ 
    items: reorderedRowIndices,
    onReorder: setReorderedRowIndices
  });

  // Sort function for the data
  const getSortedData = <T extends Record<string, any>>(data: T[]): T[] => {
    if (sortField === '' || sortDirection === 'none' || !data || data.length === 0) {
      return data;
    }
    
    return [...data].sort((a, b) => {
      const aValue = a[sortField] ?? '';
      const bValue = b[sortField] ?? '';
      
      // Simple comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return sortDirection === 'asc' ? 
        aStr.localeCompare(bStr) : 
        bStr.localeCompare(aStr);
    });
  };

  // Memoize sorting and row reordering state
  const rowsFingerprint = useMemo(() => fingerprint(rows, { depth: 1 }), [rows]);
  const indicesFingerprint = useMemo(() => fingerprint(reorderedRowIndices), [reorderedRowIndices]);
  const sortStateFingerprint = useMemo(() => fingerprint({ field: sortField, direction: sortDirection }), [sortField, sortDirection]);
  
  // Get rows in the reordered sequence and apply sorting
  const orderedRows = useMemo(() => 
    getSortedData(reorderedRowIndices.map(index => rows[index])),
    [rowsFingerprint, indicesFingerprint, sortStateFingerprint]
  );

  // Loading state
  if (isLoading || (isPaginationEnabled && isPaginatedLoading)) {
    console.log('DataTable: Loading data for ID:', dataId);
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    console.error('DataTable: Error loading data:', error);
    return (
      <div className="text-red-600 py-4">
        Failed to load data. Please try again.
        <div className="text-sm text-gray-500 mt-2">
          Error: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    console.error('DataTable: No data returned from API for ID:', dataId);
    return (
      <div className="text-red-600 py-4">
        No data found for the selected item (ID: {dataId}).
        <div className="text-sm text-gray-500 mt-2">
          This could be due to a temporary issue. If this persists, please try refreshing the page.
        </div>
      </div>
    );
  }
  
  // Empty data state
  if (!headers.length || !rows.length) {
    console.warn('DataTable: Data exists but has no headers or rows:', {
      dataId,
      headersLength: headers.length,
      rowsLength: rows.length
    });
    return (
      <div className="text-gray-500 py-4 text-center">
        No data available in the selected item
        <div className="text-sm mt-2">
          The data structure exists but contains no displayable content
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
        {/* Data Grid Header */}
        <DataGridHeader
          isExpanded={isGridExpanded}
          toggleExpansion={toggleGridExpansion}
          onExport={() => setShowExportDialog(true)}
          onExportCsv={handleCsvExport}
          onUnhideAllColumns={() => {
            setHiddenColumns({});
            if (dataId) {
              localStorage.setItem(`dataTable_${dataId}_columnVisibility`, JSON.stringify({}));
            }
          }}
          hasHiddenColumns={Object.keys(hiddenColumns).length > 0}
          showFullUuids={showFullUuids}
          onToggleUuidDisplay={() => setShowFullUuids(prev => !prev)}
          onShowColumnSelector={() => setShowColumnSelector(prev => !prev)}
        />
        
        {/* Column selector dropdown */}
        {showColumnSelector && (
          <div className="bg-white p-2 border-b border-gray-200 shadow-md">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-medium">Select visible columns</h4>
              <button 
                className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                onClick={() => {
                  setHiddenColumns({});
                  if (dataId) {
                    localStorage.setItem(`dataTable_${dataId}_columnVisibility`, JSON.stringify({}));
                  }
                }}
              >
                Show All
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1">
              {headers.map(header => (
                <div key={header} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`col-${header}`}
                    checked={!hiddenColumns[header]}
                    onChange={() => toggleColumnVisibility(header)}
                    className="mr-1"
                  />
                  <label htmlFor={`col-${header}`} className="text-xs text-gray-700 truncate">
                    {header.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Data Grid Table with basic props */}
        <DataGridTable
          tableRef={tableRef}
          height={gridHeight}
          headers={reorderedHeaders.filter(header => !hiddenColumns[header])}
          rows={orderedRows}
          showHeaders={showHeaders}
          showRowNumbers={showRowNumbers}
          columnWidths={columnWidths}
          draggedHeader={draggedHeader}
          dragOverHeader={dragOverHeader}
          draggedRow={draggedRowIndex}
          dragOverRow={dragOverRowIndex}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          isPaginationEnabled={isPaginationEnabled}
          onHeaderDragStart={handleHeaderDragStart}
          onHeaderDragOver={handleHeaderDragOver}
          onHeaderDrop={handleHeaderDrop}
          onHeaderDragEnd={handleHeaderDragEnd}
          onRowDragStart={handleRowDragStart}
          onRowDragOver={handleRowDragOver}
          onRowDrop={handleRowDrop}
          onRowDragEnd={handleRowDragEnd}
          onColumnResize={handleResizeStart}
          // Sorting props
          onSort={handleSort}
          sortField={sortField}
          sortDirection={sortDirection}
          // Column management
          onHideColumn={toggleColumnVisibility}
          // Selection props
          selectedItems={selectedItems}
          toggleItemSelection={toggleItemSelection}
          toggleAllItemsSelection={toggleAllItemsSelection}
          areAllItemsSelected={areAllItemsSelected}
          rowIdField="id" // Using id as unique identifier, fallback to index
          // UUID display props
          showFullUuids={showFullUuids}
          relationshipFields={{
            // Define mapping between UUID fields and their display name fields
            "league_id": "league_name",
            "team_id": "team_name",
            "division_conference_id": "division_conference_name",
            "player_id": "player_name",
            "stadium_id": "stadium_name",
            "game_id": "game_name",
            "broadcast_id": "broadcast_name"
          }}
        />
        
        {/* Pagination */}
        {isPaginationEnabled && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            totalRows={total}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        )}
        
        {/* Grid Resizer */}
        <div 
          className="h-2 bg-gray-100 cursor-ns-resize flex justify-center items-center hover:bg-gray-200"
          onMouseDown={handleGridResize}
        >
          <div className="w-10 h-1 bg-gray-300 rounded"></div>
        </div>
      </div>
      
      {/* Raw Data Viewer */}
      <RawDataViewer
        data={data?.data}
        height={rawDataHeight}
        isExpanded={isRawDataExpanded}
        toggleExpansion={toggleRawDataExpansion}
        onResize={handleRawDataResize}
      />
      
      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          dataId={dataId}
        />
      )}
    </div>
  );
};

export default DataTable;