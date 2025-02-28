import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../utils/api'
import LoadingSpinner from '../common/LoadingSpinner'
import { transformDataForDisplay } from '../../utils/dataTransformer'
// @ts-ignore
import { FaEye, FaEyeSlash, FaFileExport, FaArrowsAlt, FaExpand, FaCompress } from 'react-icons/fa'
// @ts-ignore
import { FaChevronLeft, FaChevronRight, FaStepBackward, FaStepForward } from 'react-icons/fa'
import ExportDialog from './ExportDialog'

interface DataTableProps {
  dataId: string
}

/**
 * DataTable component for displaying structured data in a grid format
 * Uses a centralized data transformer to handle all data formats consistently
 */
const DataTable: React.FC<DataTableProps> = ({ dataId }) => {
  // UI state
  const [showHeaders, setShowHeaders] = useState(true)
  const [showRowNumbers, setShowRowNumbers] = useState(true)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [gridHeight, setGridHeight] = useState(400)
  const [rawDataHeight, setRawDataHeight] = useState(300)
  const [isGridExpanded, setIsGridExpanded] = useState(false)
  const [isRawDataExpanded, setIsRawDataExpanded] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalRows, setTotalRows] = useState(0)
  const [isPaginationEnabled, setIsPaginationEnabled] = useState(false)
  
  // Column and row management
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(0)
  const [reorderedHeaders, setReorderedHeaders] = useState<string[]>([])
  const [reorderedRows, setReorderedRows] = useState<number[]>([])
  const [draggedHeader, setDraggedHeader] = useState<string | null>(null)
  const [draggedRow, setDraggedRow] = useState<number | null>(null)
  const [dragOverHeader, setDragOverHeader] = useState<string | null>(null)
  const [dragOverRow, setDragOverRow] = useState<number | null>(null)
  
  // References
  const tableRef = useRef<HTMLDivElement>(null)
  
  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ['structured-data', dataId],
    queryFn: () => api.data.getStructuredDataById(dataId),
  })

  // Fetch paginated rows when pagination is enabled
  const { 
    data: paginatedData, 
    isLoading: isPaginatedLoading,
    error: paginatedError
  } = useQuery({
    queryKey: ['structured-data-rows', dataId, currentPage, rowsPerPage],
    queryFn: async () => {
      const skip = (currentPage - 1) * rowsPerPage;
      const response = await api.data.getRows(dataId, skip, rowsPerPage);
      return response;
    },
    enabled: isPaginationEnabled && !!dataId,
  });

  // Transform the data for display using the centralized transformer
  const transformData = useCallback(() => {
    if (!data) {
      console.error('DataTable: No data available');
      return { headers: [], rows: [] };
    }
    
    console.log('DataTable: Processing data for display', {
      id: data.id,
      dataType: data.data_type,
      metaData: data.meta_data
    });
    
    // Handle empty data
    if (!data.data || Object.keys(data.data).length === 0) {
      console.error('DataTable: Data is empty');
      return { headers: [], rows: [] };
    }
    
    // Check if this is sports data based on metadata or headers
    const isSportsData = 
      (data.meta_data?.data_type === 'sports-data') || 
      (data.data.headers && Array.isArray(data.data.headers) && 
       data.data.headers.some((header: string) => 
         ['Team', 'Player', 'League', 'City', 'State', 'Stadium', 'Home Stadium'].includes(header)
       ));
    
    if (isSportsData) {
      console.log('DataTable: Detected sports data format - ensuring proper display');
    }
    
    // Use the centralized data transformer for all formats
    // The transformer will handle all data formats including transposition if needed
    const transformedData = transformDataForDisplay(data.data);
    
    console.log('DataTable: Data transformation complete', {
      headers: transformedData.headers,
      rowCount: transformedData.rows.length
    });
    
    // Check if we should enable pagination based on row count
    const shouldEnablePagination = transformedData.rows.length > rowsPerPage;
    if (shouldEnablePagination !== isPaginationEnabled) {
      setIsPaginationEnabled(shouldEnablePagination);
      setTotalRows(transformedData.rows.length);
    }
    
    return transformedData;
  }, [data, isPaginationEnabled, rowsPerPage]);

  // Get transformed data
  const { headers: originalHeaders = [], rows: originalRows = [] } = useMemo(() => {
    // If pagination is enabled and we have paginated data, use that
    if (isPaginationEnabled && paginatedData) {
      const columnOrder = paginatedData.column_order || [];
      return {
        headers: columnOrder,
        rows: paginatedData.rows || []
      };
    }
    
    // Otherwise use the full data
    return transformData();
  }, [transformData, isPaginationEnabled, paginatedData]);

  // Update total rows when paginated data changes
  useEffect(() => {
    if (isPaginationEnabled && paginatedData) {
      setTotalRows(paginatedData.total);
    }
  }, [isPaginationEnabled, paginatedData]);

  // Use reordered headers and rows if available, otherwise use original
  const headers = useMemo(() => {
    return reorderedHeaders.length > 0 ? reorderedHeaders : originalHeaders;
  }, [reorderedHeaders, originalHeaders]);

  const rows = useMemo(() => {
    if (reorderedRows.length === 0) return originalRows;
    return reorderedRows.map(index => originalRows[index]);
  }, [reorderedRows, originalRows]);

  // Initialize reordered headers and rows when original data changes
  useEffect(() => {
    if (originalHeaders.length > 0 && reorderedHeaders.length === 0) {
      setReorderedHeaders([...originalHeaders]);
    }
    
    if (originalRows.length > 0 && reorderedRows.length === 0) {
      setReorderedRows(Array.from({ length: originalRows.length }, (_, i) => i));
    }
  }, [originalHeaders, originalRows, reorderedHeaders.length, reorderedRows.length]);

  // Initialize column widths
  useEffect(() => {
    if (headers.length > 0 && Object.keys(columnWidths).length === 0) {
      const initialWidths: Record<string, number> = {};
      headers.forEach(header => {
        initialWidths[header] = 150; // Default width
      });
      setColumnWidths(initialWidths);
    }
  }, [headers, columnWidths]);

  // Log data details for debugging
  useEffect(() => {
    if (data) {
      console.log('DataTable: Data details', {
        dataId,
        dataType: data.data_type,
        headers,
        rowCount: rows.length,
        isPaginationEnabled,
        totalRows
      });
    }
  }, [data, headers, rows, dataId, isPaginationEnabled, totalRows]);

  // Handle column resize start
  const handleResizeStart = (e: React.MouseEvent, header: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent drag and drop from triggering
    
    // Store initial values
    const initialX = e.clientX;
    const initialWidth = columnWidths[header] || 150;
    
    // Get the table element and header element
    const tableElement = tableRef.current;
    if (!tableElement) return;
    
    const headerElement = tableElement.querySelector(`th[data-header="${header}"]`);
    if (!headerElement) return;
    
    // Define the mousemove handler
    function handleMouseMove(moveEvent: MouseEvent) {
      moveEvent.preventDefault();
      
      // Calculate the new width
      const diff = moveEvent.clientX - initialX;
      const newWidth = Math.max(80, initialWidth + diff); // Minimum width of 80px
      
      // Update the column width in real-time
      setColumnWidths(prev => ({
        ...prev,
        [header]: newWidth
      }));
    }
    
    // Define the mouseup handler
    function handleMouseUp(upEvent: MouseEvent) {
      // Remove event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle header drag start
  const handleHeaderDragStart = (e: React.DragEvent, header: string) => {
    e.dataTransfer.setData('text/plain', header);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedHeader(header);
  };

  // Handle header drag over
  const handleHeaderDragOver = (e: React.DragEvent, header: string) => {
    e.preventDefault();
    if (draggedHeader && draggedHeader !== header) {
      setDragOverHeader(header);
    }
  };

  // Handle header drop
  const handleHeaderDrop = (e: React.DragEvent, targetHeader: string) => {
    e.preventDefault();
    if (!draggedHeader || draggedHeader === targetHeader) return;
    
    const sourceIndex = reorderedHeaders.indexOf(draggedHeader);
    const targetIndex = reorderedHeaders.indexOf(targetHeader);
    
    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newHeaders = [...reorderedHeaders];
      newHeaders.splice(sourceIndex, 1);
      newHeaders.splice(targetIndex, 0, draggedHeader);
      
      setReorderedHeaders(newHeaders);
    }
    
    setDraggedHeader(null);
    setDragOverHeader(null);
  };

  // Handle row drag start
  const handleRowDragStart = (e: React.DragEvent, rowIndex: number) => {
    e.dataTransfer.setData('text/plain', rowIndex.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedRow(rowIndex);
  };

  // Handle row drag over
  const handleRowDragOver = (e: React.DragEvent, rowIndex: number) => {
    e.preventDefault();
    if (draggedRow !== null && draggedRow !== rowIndex) {
      setDragOverRow(rowIndex);
    }
  };

  // Handle row drop
  const handleRowDrop = (e: React.DragEvent, targetRowIndex: number) => {
    e.preventDefault();
    if (draggedRow === null || draggedRow === targetRowIndex) return;
    
    const sourceIndex = reorderedRows.indexOf(draggedRow);
    const targetIndex = reorderedRows.indexOf(targetRowIndex);
    
    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newRows = [...reorderedRows];
      newRows.splice(sourceIndex, 1);
      newRows.splice(targetIndex, 0, draggedRow);
      
      setReorderedRows(newRows);
    }
    
    setDraggedRow(null);
    setDragOverRow(null);
  };

  // Toggle grid expansion
  const toggleGridExpansion = () => {
    const newExpandedState = !isGridExpanded;
    setIsGridExpanded(newExpandedState);
    
    if (newExpandedState) {
      const newHeight = window.innerHeight * 0.7;
      setGridHeight(newHeight);
    } else {
      setGridHeight(400);
    }
  };

  // Toggle raw data expansion
  const toggleRawDataExpansion = () => {
    setIsRawDataExpanded(!isRawDataExpanded);
    if (!isRawDataExpanded) {
      setRawDataHeight(window.innerHeight * 0.5);
    } else {
      setRawDataHeight(300);
    }
  };

  // Handle grid resize
  const handleGridResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = gridHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientY - startY;
      setGridHeight(Math.max(200, startHeight + diff)); // Minimum height of 200px
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle raw data resize
  const handleRawDataResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = rawDataHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientY - startY;
      setRawDataHeight(Math.max(100, startHeight + diff)); // Minimum height of 100px
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRowsPerPage = parseInt(e.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  const totalPages = Math.ceil(totalRows / rowsPerPage);

  // Add a cleanup effect to ensure no lingering event listeners
  useEffect(() => {
    return () => {
      // This is a safety cleanup in case the component unmounts during a resize operation
      document.removeEventListener('mousemove', () => {});
      document.removeEventListener('mouseup', () => {});
    };
  }, []);

  // Loading state
  if (isLoading || (isPaginationEnabled && isPaginatedLoading)) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  // Error state
  if (error || (isPaginationEnabled && paginatedError)) {
    console.error('DataTable: Error loading data:', error || paginatedError);
    return (
      <div className="text-red-600 py-4">
        Failed to load data. Please try again.
      </div>
    )
  }

  // No data state
  if (!data) {
    return (
      <div className="text-red-600 py-4">
        No data found for the selected item.
      </div>
    )
  }
  
  // Empty data state
  if (!headers.length || !rows.length) {
    return (
      <div className="text-gray-500 py-4 text-center">
        No data available
      </div>
    )
  }

  // Render the data table
  return (
    <div className="space-y-4">
      <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
        <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-medium">Data Grid</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowHeaders(!showHeaders)}
              className={`px-2 py-1 text-xs rounded flex items-center space-x-1 ${
                showHeaders ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {showHeaders ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
              <span>{showHeaders ? 'Hide Headers' : 'Show Headers'}</span>
            </button>
            <button
              onClick={() => setShowRowNumbers(!showRowNumbers)}
              className={`px-2 py-1 text-xs rounded flex items-center space-x-1 ${
                showRowNumbers ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {showRowNumbers ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
              <span>{showRowNumbers ? 'Hide Rows' : 'Show Rows'}</span>
            </button>
            <button
              onClick={toggleGridExpansion}
              className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              {isGridExpanded ? <FaCompress size={12} /> : <FaExpand size={12} />}
              <span>{isGridExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
            <button
              onClick={() => setShowExportDialog(true)}
              className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-green-100 text-green-700 hover:bg-green-200"
            >
              <FaFileExport size={12} />
              <span>Export to Sheets</span>
            </button>
          </div>
        </div>
        
        <div 
          ref={tableRef}
          className="overflow-auto" 
          style={{ 
            height: `${gridHeight}px`,
            maxHeight: `${gridHeight}px`,
            overflowX: 'auto',
            overflowY: 'auto'
          }}
        >
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            {showHeaders && (
              <thead className="bg-gray-50">
                <tr>
                  {showRowNumbers && (
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-0 bg-gray-50 z-10">
                      #
                    </th>
                  )}
                  {headers.map((header: string) => (
                    <th 
                      key={header} 
                      scope="col" 
                      className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-move ${
                        dragOverHeader === header ? 'bg-blue-100' : 'bg-gray-50'
                      }`}
                      style={{
                        width: `${columnWidths[header] || 150}px`,
                      }}
                      data-header={header}
                      draggable
                      onDragStart={(e) => handleHeaderDragStart(e, header)}
                      onDragOver={(e) => handleHeaderDragOver(e, header)}
                      onDrop={(e) => handleHeaderDrop(e, header)}
                      onDragEnd={() => {
                        setDraggedHeader(null);
                        setDragOverHeader(null);
                      }}
                    >
                      {header}
                      <div 
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize z-20"
                        onMouseDown={(e) => handleResizeStart(e, header)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="h-full w-1 bg-gray-300 mx-auto hover:bg-blue-500 hover:w-2 transition-all"></div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row: Record<string, any>, rowIndex: number) => (
                <tr 
                  key={rowIndex}
                  className={`hover:bg-gray-50 ${
                    dragOverRow === rowIndex ? 'bg-blue-50' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleRowDragStart(e, rowIndex)}
                  onDragOver={(e) => handleRowDragOver(e, rowIndex)}
                  onDrop={(e) => handleRowDrop(e, rowIndex)}
                  onDragEnd={() => {
                    setDraggedRow(null);
                    setDragOverRow(null);
                  }}
                >
                  {showRowNumbers && (
                    <td 
                      className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 w-12 sticky left-0 bg-white z-10 cursor-move"
                    >
                      {isPaginationEnabled 
                        ? (currentPage - 1) * rowsPerPage + rowIndex + 1 
                        : rowIndex + 1}
                    </td>
                  )}
                  {headers.map((header: string) => (
                    <td 
                      key={`${rowIndex}-${header}`} 
                      className="px-3 py-2 whitespace-pre-wrap break-words text-sm text-gray-900"
                      style={{ width: `${columnWidths[header] || 150}px` }}
                    >
                      {row[header] !== undefined ? String(row[header]) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        {isPaginationEnabled && (
          <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Rows per page:
              </span>
              <select
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-700 mr-2">
                {(currentPage - 1) * rowsPerPage + 1}-
                {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows}
              </span>
              
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className={`p-1 rounded ${
                  currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="First page"
              >
                <FaStepBackward size={14} />
              </button>
              
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-1 rounded ${
                  currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="Previous page"
              >
                <FaChevronLeft size={14} />
              </button>
              
              <div className="px-2 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-1 rounded ${
                  currentPage === totalPages 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="Next page"
              >
                <FaChevronRight size={14} />
              </button>
              
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className={`p-1 rounded ${
                  currentPage === totalPages 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="Last page"
              >
                <FaStepForward size={14} />
              </button>
            </div>
          </div>
        )}
        
        {/* Resizer handle */}
        <div 
          className="h-2 bg-gray-100 cursor-ns-resize flex justify-center items-center hover:bg-gray-200"
          onMouseDown={handleGridResize}
        >
          <div className="w-10 h-1 bg-gray-300 rounded"></div>
        </div>
      </div>
      
      <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
        <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Raw Data</h3>
            <p className="text-sm text-gray-500">JSON format</p>
          </div>
          <button
            onClick={toggleRawDataExpansion}
            className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            {isRawDataExpanded ? <FaCompress size={12} /> : <FaExpand size={12} />}
            <span>{isRawDataExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
        <div 
          className="p-4 overflow-auto" 
          style={{ 
            maxHeight: `${rawDataHeight}px`,
            overflowX: 'auto',
            overflowY: 'auto'
          }}
        >
          <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {JSON.stringify(data?.data, null, 2)}
          </pre>
        </div>
        
        {/* Resizer handle */}
        <div 
          className="h-2 bg-gray-100 cursor-ns-resize flex justify-center items-center hover:bg-gray-200"
          onMouseDown={handleRawDataResize}
        >
          <div className="w-10 h-1 bg-gray-300 rounded"></div>
        </div>
      </div>
      
      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          dataId={dataId}
        />
      )}
    </div>
  )
}

export default DataTable 