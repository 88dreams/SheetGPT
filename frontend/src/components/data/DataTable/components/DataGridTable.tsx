import React from 'react';
import { FaSort, FaSortUp, FaSortDown, FaEyeSlash } from 'react-icons/fa';

// To avoid TypeScript issues, we'll define this type locally
type SortDirection = 'asc' | 'desc' | 'none';

interface DataGridTableProps {
  tableRef: React.RefObject<HTMLDivElement>;
  height: number;
  headers: string[];
  rows: Record<string, any>[];
  showHeaders: boolean;
  showRowNumbers: boolean;
  columnWidths: Record<string, number>;
  draggedHeader: string | null;
  dragOverHeader: string | null;
  draggedRow: number | null;
  dragOverRow: number | null;
  currentPage: number;
  rowsPerPage: number;
  isPaginationEnabled: boolean;
  onHeaderDragStart: (e: React.DragEvent, header: string) => void;
  onHeaderDragOver: (e: React.DragEvent, header: string) => void;
  onHeaderDrop: (e: React.DragEvent, header: string) => void;
  onHeaderDragEnd: () => void;
  onRowDragStart: (e: React.DragEvent, index: number) => void;
  onRowDragOver: (e: React.DragEvent, index: number) => void;
  onRowDrop: (e: React.DragEvent, index: number) => void;
  onRowDragEnd: () => void;
  onColumnResize: (e: React.MouseEvent, header: string) => void;
  // New props
  onSort?: (field: string) => void;
  sortField?: string;
  sortDirection?: SortDirection;
  renderSortIcon?: (field: string) => React.ReactNode;
  onHideColumn?: (header: string) => void;
  hiddenColumns?: Record<string, boolean>;
  // Selection props
  selectedItems?: Record<string | number, boolean>;
  toggleItemSelection?: (id: string | number) => void;
  toggleAllItemsSelection?: (ids: (string | number)[]) => void;
  areAllItemsSelected?: (ids: (string | number)[]) => boolean;
  rowIdField?: string;
  // UUID display props
  showFullUuids?: boolean;
  relationshipFields?: Record<string, string>;
}

const DataGridTable: React.FC<DataGridTableProps> = ({
  tableRef,
  height,
  headers,
  rows,
  showHeaders,
  showRowNumbers,
  columnWidths,
  draggedHeader,
  dragOverHeader,
  draggedRow,
  dragOverRow,
  currentPage,
  rowsPerPage,
  isPaginationEnabled,
  onHeaderDragStart,
  onHeaderDragOver,
  onHeaderDrop,
  onHeaderDragEnd,
  onRowDragStart,
  onRowDragOver,
  onRowDrop,
  onRowDragEnd,
  onColumnResize,
  // New props
  onSort = () => {},
  sortField = '',
  sortDirection = 'none',
  renderSortIcon = () => null,
  onHideColumn = () => {},
  hiddenColumns = {},
  // Selection props
  selectedItems = {},
  toggleItemSelection = () => {},
  toggleAllItemsSelection = () => {},
  areAllItemsSelected = () => false,
  rowIdField = 'id',
  // UUID display props
  showFullUuids = false,
  relationshipFields = {}
}) => {
  // Function to detect and format UUIDs
  const formatCellValue = (value: any, header: string) => {
    if (value === null || value === undefined) return '';
    
    // Check if it's a UUID field (ends with _id) and we have a relation name for it
    const isUuidField = header.endsWith('_id');
    const relationFieldName = isUuidField ? relationshipFields[header] : null;
    
    // If this is a UUID field and we have a relationship display name for it
    if (isUuidField && relationFieldName) {
      // When showing UUIDs, return the full UUID
      if (showFullUuids) {
        return String(value);
      }
      
      // For a row, find the corresponding entry with the relationship name field
      const currentRow = rows.find(row => row[header] === value);
      if (currentRow && currentRow[relationFieldName]) {
        return String(currentRow[relationFieldName]);
      }
      
      // If it's a UUID (guessing by format) but we don't have a mapping, show shortened version
      if (typeof value === 'string' && 
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return showFullUuids ? value : `${value.substring(0, 8)}...`;
      }
    }
    
    // Check if it's a UUID by format
    if (typeof value === 'string' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return showFullUuids ? value : `${value.substring(0, 8)}...`;
    }
    
    // Default string conversion
    return String(value);
  };

  return (
    <div 
      ref={tableRef}
      className="overflow-auto" 
      style={{ 
        height: `${height}px`,
        maxHeight: `${height}px`,
        overflowX: 'auto',
        overflowY: 'auto'
      }}
    >
      <table className="min-w-full divide-y divide-gray-200 table-fixed border-collapse">
        {showHeaders && (
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              {/* Selection column for row selection */}
              <th scope="col" className="w-10 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    checked={areAllItemsSelected && rows.length > 0 ? areAllItemsSelected(rows.map((row, index) => {
                      return row && row[rowIdField] !== undefined ? row[rowIdField] : `row-${index}`;
                    })) : false}
                    onChange={() => toggleAllItemsSelection && toggleAllItemsSelection(rows.map((row, index) => {
                      return row && row[rowIdField] !== undefined ? row[rowIdField] : `row-${index}`;
                    }))}
                  />
                </div>
              </th>
              {showRowNumbers && (
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-10 bg-gray-50 z-10 border-r border-gray-200">
                  #
                </th>
              )}
              {headers.map((header: string) => (
                <th 
                  key={header} 
                  scope="col" 
                  className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer border-r border-gray-200 ${
                    dragOverHeader === header ? 'bg-blue-100' : 'bg-gray-50'
                  }`}
                  style={{
                    width: `${columnWidths[header] || 150}px`,
                  }}
                  data-header={header}
                  draggable
                  onDragStart={(e) => onHeaderDragStart(e, header)}
                  onDragOver={(e) => onHeaderDragOver(e, header)}
                  onDrop={(e) => onHeaderDrop(e, header)}
                  onDragEnd={onHeaderDragEnd}
                  onClick={() => onSort(header)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={sortField === header ? "font-bold text-blue-700" : ""}>
                        {header}
                      </span>
                      {sortField === header ? (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? (
                            <FaSortUp className="text-blue-700" size={16} />
                          ) : (
                            <FaSortDown className="text-blue-700" size={16} />
                          )}
                        </span>
                      ) : (
                        <FaSort className="ml-1 text-gray-400" size={12} />
                      )}
                    </div>
                    <div className="flex items-center">
                      <button
                        className="text-gray-400 hover:text-gray-700 ml-2 p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onHideColumn) onHideColumn(header);
                        }}
                        title="Hide column"
                      >
                        <FaEyeSlash size={12} />
                      </button>
                    </div>
                  </div>
                  <div 
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize z-20"
                    onMouseDown={(e) => onColumnResize(e, header)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-full w-0 mx-auto hover:bg-blue-500 hover:w-2 transition-all"></div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row: Record<string, any> | null | undefined, rowIndex: number) => (
            <tr 
              key={rowIndex}
              className={`hover:bg-gray-50 border-b border-gray-200 ${
                dragOverRow === rowIndex ? 'bg-blue-50' : 
                (row && row[rowIdField] !== undefined && selectedItems[row[rowIdField]]) ? 'bg-blue-50' : ''
              }`}
              draggable
              onDragStart={(e) => onRowDragStart(e, rowIndex)}
              onDragOver={(e) => onRowDragOver(e, rowIndex)}
              onDrop={(e) => onRowDrop(e, rowIndex)}
              onDragEnd={onRowDragEnd}
            >
              {/* Selection checkbox */}
              <td className="px-3 py-2 whitespace-nowrap text-sm w-10 sticky left-0 bg-white z-10 border-r border-gray-200">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    checked={row && row[rowIdField] !== undefined && selectedItems ? !!selectedItems[row[rowIdField] || `row-${rowIndex}`] : false}
                    onChange={() => row && row[rowIdField] !== undefined && toggleItemSelection && toggleItemSelection(row[rowIdField] || `row-${rowIndex}`)}
                  />
                </div>
              </td>
              {showRowNumbers && (
                <td 
                  className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 w-12 sticky left-10 bg-white z-10 cursor-move border-r border-gray-200"
                >
                  {isPaginationEnabled 
                    ? (currentPage - 1) * rowsPerPage + rowIndex + 1 
                    : rowIndex + 1}
                </td>
              )}
              {headers.map((header: string) => (
                <td 
                  key={`${rowIndex}-${header}`} 
                  className="px-3 py-2 whitespace-pre-wrap break-words text-sm text-gray-900 border-r border-gray-200"
                  style={{ width: `${columnWidths[header] || 150}px` }}
                >
                  {row && row[header] !== undefined ? formatCellValue(row[header], header) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataGridTable;