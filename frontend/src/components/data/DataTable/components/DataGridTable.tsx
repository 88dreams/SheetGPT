import React from 'react';
import { FaSort, FaSortUp, FaSortDown, FaEyeSlash } from 'react-icons/fa';
import { createMemoEqualityFn, fingerprint, areEqual } from '../../../../utils/fingerprint';
import SmartColumn from '../../../common/SmartColumn';

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
  // Generate fingerprints for complex dependencies
  const rowsFingerprint = React.useMemo(
    () => fingerprint(rows, { depth: 1 }), 
    [rows]
  );
  
  const relationshipFieldsFingerprint = React.useMemo(
    () => fingerprint(relationshipFields),
    [relationshipFields]
  );
  
  // Memoized formatter function - recalculated only when necessary
  const formatters = React.useMemo(() => {
    // Create a formatter for each header
    const result: Record<string, (value: any) => string> = {};
    
    // UUID pattern for detection
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Build formatters for each header column
    headers.forEach(header => {
      // Create a formatter function optimized for this specific column
      result[header] = (value: any) => {
        if (value === null || value === undefined) return '';
        
        // Check if it's a UUID field with relationship
        const isUuidField = header.endsWith('_id');
        const relationFieldName = isUuidField ? relationshipFields[header] : null;
        
        // UUID field with relationship handling
        if (isUuidField && relationFieldName) {
          // Return full UUID when toggle is enabled
          if (showFullUuids) {
            return String(value);
          }
          
          // Find relationship display name
          const currentRow = rows.find(row => row[header] === value);
          if (currentRow && currentRow[relationFieldName]) {
            return String(currentRow[relationFieldName]);
          }
          
          // Fallback for UUID format
          if (typeof value === 'string' && uuidPattern.test(value)) {
            return showFullUuids ? value : `${value.substring(0, 8)}...`;
          }
        }
        
        // General UUID format detection
        if (typeof value === 'string' && uuidPattern.test(value)) {
          return showFullUuids ? value : `${value.substring(0, 8)}...`;
        }
        
        // Default string conversion
        return String(value);
      };
    });
    
    return result;
  }, [headers, rowsFingerprint, relationshipFieldsFingerprint, showFullUuids]);
  
  // Function to format cell values using the memoized formatters
  const formatCellValue = (value: any, header: string) => {
    return formatters[header] && header in formatters ? formatters[header](value) : String(value);
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
              <th scope="col" className="w-10 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200 hover:bg-gray-100">
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
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-10 bg-gray-50 z-10 border-r border-gray-200 hover:bg-gray-100">
                  #
                </th>
              )}
              {headers.map((header: string) => (
                <SmartColumn
                  key={header}
                  field={header}
                  sortField={sortField || ''}
                  sortDirection={sortDirection || 'none'}
                  handleSort={onSort || (() => {})}
                  entities={rows}
                  handleResizeStart={onColumnResize}
                  columnWidth={columnWidths[header] || 150}
                  draggedHeader={draggedHeader}
                  dragOverHeader={dragOverHeader}
                  handleColumnDragStart={onHeaderDragStart}
                  handleColumnDragOver={onHeaderDragOver}
                  handleColumnDrop={onHeaderDrop}
                  handleColumnDragEnd={onHeaderDragEnd}
                  className="bg-gray-50"
                  additionalHeaderContent={
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
                  }
                />
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

// Memoize the component to prevent unnecessary re-renders using our fingerprinting utility
// The custom equality function efficiently compares previous and next props
export default React.memo(
  DataGridTable, 
  createMemoEqualityFn({
    // Using depth of 1 for rows to only check reference equality for array elements
    // This is important for performance since rows can be large
    customHandlers: {
      // Custom handler for rows array - only compare length and contents at depth 1
      Array: (value) => {
        if (Array.isArray(value)) {
          return `Array:length=${value.length}`;
        }
        return fingerprint(value, { depth: 1 });
      }
    },
    // Set an appropriate depth to balance performance vs accuracy
    depth: 2,
    // Include properties that should trigger re-renders
    // Skip function props as they rarely change in identity 
    skipUndefined: true
  })
);