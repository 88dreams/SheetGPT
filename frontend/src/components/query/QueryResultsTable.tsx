import React, { useCallback } from 'react';
import SmartColumn from '../common/SmartColumn'; // Adjust path as needed

interface QueryResultsTableProps {
    // Data
    sortedResults: any[];
    // Column Management
    reorderedColumns: string[];
    visibleColumns: { [key: string]: boolean };
    sortConfig: { column: string; direction: 'asc' | 'desc' } | null;
    handleSort: (column: string) => void;
    draggedItem: string | null;
    dragOverItem: string | null;
    hookDragStart: Function;
    hookDragOver: Function;
    hookDrop: Function;
    hookDragEnd: Function;
    // Row Selection
    selectedRows: Set<number>;
    selectAll: boolean;
    toggleRowSelection: (rowIndex: number) => void;
    toggleSelectAll: () => void;
    // Formatting
    formatCellValue: (value: any, column: string) => string;
}

const QueryResultsTable: React.FC<QueryResultsTableProps> = ({
    sortedResults,
    reorderedColumns,
    visibleColumns,
    sortConfig,
    handleSort,
    draggedItem,
    dragOverItem,
    hookDragStart,
    hookDragOver,
    hookDrop,
    hookDragEnd,
    selectedRows,
    selectAll,
    toggleRowSelection,
    toggleSelectAll,
    formatCellValue
}) => {

    // Adapter functions to match SmartColumn's expected signature
    const handleColumnDragStartAdapter = useCallback((e: React.DragEvent<Element>, field: string) => {
        const index = reorderedColumns.findIndex(col => col === field);
        if (index !== -1 && typeof hookDragStart === 'function') {
            hookDragStart(index);
        }
    }, [reorderedColumns, hookDragStart]);

    const handleColumnDragOverAdapter = useCallback((e: React.DragEvent<Element>, field: string) => {
        e.preventDefault();
        const index = reorderedColumns.findIndex(col => col === field);
        if (index !== -1 && typeof hookDragOver === 'function') {
            hookDragOver(index);
        }
    }, [reorderedColumns, hookDragOver]);

    const handleColumnDropAdapter = useCallback((e: React.DragEvent<Element>, field: string) => {
        if (typeof hookDrop === 'function') {
            hookDrop();
        }
    }, [hookDrop]);

    const handleColumnDragEndAdapter = useCallback(() => {
        if (typeof hookDragEnd === 'function') {
            hookDragEnd();
        }
    }, [hookDragEnd]);

    if (!sortedResults || sortedResults.length === 0) {
        return null; 
    }

    const columnsToRender = reorderedColumns.filter(column => visibleColumns[column]);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed border-collapse">
                <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                        {/* Selection column */}
                        <th className="w-10 px-3 py-2 border-r border-gray-200">
                            <input 
                                type="checkbox" 
                                checked={selectAll}
                                onChange={toggleSelectAll}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                aria-label="Select all rows"
                            />
                        </th>
                        
                        {/* Generate header from the visible columns */}
                        {columnsToRender.map((column) => (
                            <SmartColumn
                                key={column}
                                field={column}
                                sortField={sortConfig?.column || ''}
                                sortDirection={sortConfig?.direction || 'none'}
                                handleSort={handleSort}
                                entities={sortedResults}
                                draggedHeader={draggedItem} 
                                dragOverHeader={dragOverItem}
                                handleColumnDragStart={handleColumnDragStartAdapter}
                                handleColumnDragOver={handleColumnDragOverAdapter}
                                handleColumnDrop={handleColumnDropAdapter}
                                handleColumnDragEnd={handleColumnDragEndAdapter}
                                className={`
                                    ${draggedItem === column ? 'opacity-50 bg-blue-50' : ''}
                                    ${dragOverItem === column ? 'bg-blue-100 border-blue-300' : ''}
                                `}
                            />
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {/* Generate rows from the sorted results */}
                    {sortedResults.map((row, rowIndex) => (
                        <tr 
                            key={rowIndex}
                            className={`${selectedRows.has(rowIndex) ? 'bg-blue-50' : ''} border-b border-gray-200 hover:bg-gray-50`}
                        >
                            {/* Selection cell */}
                            <td className="w-10 px-3 py-2 whitespace-nowrap border-r border-gray-200">
                                <input 
                                    type="checkbox" 
                                    checked={selectedRows.has(rowIndex)}
                                    onChange={() => toggleRowSelection(rowIndex)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                    aria-label={`Select row ${rowIndex + 1}`}
                                />
                            </td>
                            
                            {/* Only display visible columns */}
                            {columnsToRender.map((column, cellIndex) => (
                                <td 
                                    key={`${rowIndex}-${column}`}
                                    className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200"
                                >
                                    {row[column] !== null && row[column] !== undefined 
                                        ? formatCellValue(row[column], column)
                                        : <span className="text-gray-400">NULL</span>}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default QueryResultsTable; 