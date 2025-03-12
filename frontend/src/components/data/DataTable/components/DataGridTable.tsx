import React from 'react';

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
  onColumnResize
}) => {
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
                  onDragStart={(e) => onHeaderDragStart(e, header)}
                  onDragOver={(e) => onHeaderDragOver(e, header)}
                  onDrop={(e) => onHeaderDrop(e, header)}
                  onDragEnd={onHeaderDragEnd}
                >
                  {header}
                  <div 
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize z-20"
                    onMouseDown={(e) => onColumnResize(e, header)}
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
          {rows.map((row: Record<string, any> | null | undefined, rowIndex: number) => (
            <tr 
              key={rowIndex}
              className={`hover:bg-gray-50 ${
                dragOverRow === rowIndex ? 'bg-blue-50' : ''
              }`}
              draggable
              onDragStart={(e) => onRowDragStart(e, rowIndex)}
              onDragOver={(e) => onRowDragOver(e, rowIndex)}
              onDrop={(e) => onRowDrop(e, rowIndex)}
              onDragEnd={onRowDragEnd}
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
                  {row && row[header] !== undefined ? String(row[header]) : ''}
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