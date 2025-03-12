import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../utils/api';
import LoadingSpinner from '../../common/LoadingSpinner';
import ExportDialog from '../ExportDialog';

// Import hooks
import {
  useColumnResize,
  useDragAndDrop,
  useResizable,
  usePagination,
  useDataTransformer
} from './hooks';

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
  
  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ['structured-data', dataId],
    queryFn: () => api.data.getStructuredDataById(dataId),
  });

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

  // Use drag and drop for headers
  const {
    reorderedItems: reorderedHeaders,
    draggedItem: draggedHeader,
    dragOverItem: dragOverHeader,
    handleDragStart: handleHeaderDragStart,
    handleDragOver: handleHeaderDragOver,
    handleDrop: handleHeaderDrop,
    handleDragEnd: handleHeaderDragEnd
  } = useDragAndDrop<string>({ items: headers });

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

  // Get rows in the reordered sequence
  const orderedRows = reorderedRowIndices.map(index => rows[index]);

  // Loading state
  if (isLoading || (isPaginationEnabled && isPaginatedLoading)) {
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
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="text-red-600 py-4">
        No data found for the selected item.
      </div>
    );
  }
  
  // Empty data state
  if (!headers.length || !rows.length) {
    return (
      <div className="text-gray-500 py-4 text-center">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
        {/* Data Grid Header */}
        <DataGridHeader
          showHeaders={showHeaders}
          setShowHeaders={setShowHeaders}
          showRowNumbers={showRowNumbers}
          setShowRowNumbers={setShowRowNumbers}
          isExpanded={isGridExpanded}
          toggleExpansion={toggleGridExpansion}
          onExport={() => setShowExportDialog(true)}
        />
        
        {/* Data Grid Table */}
        <DataGridTable
          tableRef={tableRef}
          height={gridHeight}
          headers={reorderedHeaders}
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