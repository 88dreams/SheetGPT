import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../utils/api';
import LoadingSpinner from '../../common/LoadingSpinner';
import ExportDialog from '../ExportDialog';
import { useNotification } from '../../../contexts/NotificationContext';

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
  
  // Fetch data
  const { data, isLoading, error } = useQuery({
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
    totalItems: data?.data?.rows?.length || 0,
    initialRowsPerPage: 50
  });
  
  console.log('DataTable: Current data state:', {
    hasData: !!data,
    dataId,
    rowCount: data?.data?.rows?.length || 0,
    hasHeaders: !!data?.data?.column_order?.length,
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
  
  // Filter visible headers
  const visibleHeaders = headers.filter(header => !hiddenColumns[header]);
  
  // Simplified CSV export
  const handleCsvExport = () => {
    // Basic validation
    if (!rows || rows.length === 0 || !headers || headers.length === 0) {
      showNotification('error', 'No data available for export');
      return;
    }

    try {
      // Create header row
      const visibleHeaders = headers.filter(header => !hiddenColumns[header]);
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
      
      // Download the CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const filename = data?.meta_data?.name || 'export';
      link.setAttribute('download', `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification('success', 'CSV file downloaded successfully');
    } catch (e) {
      console.error('Error generating CSV:', e);
      showNotification('error', 'Failed to generate CSV file');
    }
  };

  // Use drag and drop for headers with localStorage persistence
  const {
    reorderedItems: reorderedHeaders,
    draggedItem: draggedHeader,
    dragOverItem: dragOverHeader,
    handleDragStart: handleHeaderDragStart,
    handleDragOver: handleHeaderDragOver,
    handleDrop: handleHeaderDrop,
    handleDragEnd: handleHeaderDragEnd
  } = useDragAndDrop<string>({ 
    items: headers,
    storageKey: `dataTable_${dataId}_columnOrder` // Persist ordering
  });

  // Use drag and drop for rows
  const {
    reorderedItems: reorderedRowIndices,
    draggedItem: draggedRowIndex,
    dragOverItem: dragOverRowIndex,
    handleDragStart: handleRowDragStart,
    handleDragOver: handleRowDragOver,
    handleDrop: handleRowDrop,
    handleDragEnd: handleRowDragEnd
  } = useDragAndDrop<number>({ 
    items: Array.from({ length: rows.length }, (_, i) => i)
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

  // Get rows in the reordered sequence and apply sorting
  const orderedRows = getSortedData(reorderedRowIndices.map(index => rows[index]));

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
          Error: {error.message || 'Unknown error'}
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