import React from 'react';
import { Select } from 'antd';
import { SchemaSummaryResponse } from '../../models/schema';

interface ColumnSelectorPanelProps {
  // isVisible: boolean; // Parent will conditionally render this entire component
  allColumns: string[];
  visibleColumns: Record<string, boolean>;
  onToggleColumn: (columnName: string) => void;
  onShowAllColumns: () => void;
  schemaSummary: SchemaSummaryResponse | null;
  onApplyTemplate: (entityType: string) => void;
  // Optional: onClose to hide the panel from within, if needed
}

const ColumnSelectorPanel: React.FC<ColumnSelectorPanelProps> = ({
  allColumns,
  visibleColumns,
  onToggleColumn,
  onShowAllColumns,
  schemaSummary,
  onApplyTemplate,
}) => {
  if (allColumns.length === 0) {
    return (
      <div className="mb-4 p-3 border border-gray-200 rounded bg-white text-sm text-gray-500">
        No columns available to select. Execute a query to see columns.
      </div>
    );
  }

  const handleTemplateChange = (value: string) => {
    if (value) {
      onApplyTemplate(value);
    }
  };

  return (
    <div className="mb-4 p-4 border border-gray-200 rounded bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-gray-700">Column Visibility</h4>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-600">Apply Template:</label>
            <Select
              placeholder="Select an entity..."
              onChange={handleTemplateChange}
              style={{ width: 180 }}
              allowClear
              size="small"
              disabled={!schemaSummary || schemaSummary.tables.length === 0}
            >
              {schemaSummary?.tables.map(table => (
                <Select.Option key={table.name} value={table.name}>
                  {table.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Select.Option>
              ))}
            </Select>
          </div>
          <button 
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            onClick={onShowAllColumns}
          >
            Show All Columns
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
        {allColumns.map((column) => (
          <div key={column} className="flex items-center">
            <input
              type="checkbox"
              id={`col-vis-${column}`}
              checked={visibleColumns[column] === undefined ? true : visibleColumns[column]} // Default to true if not in map
              onChange={() => onToggleColumn(column)}
              className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label 
              htmlFor={`col-vis-${column}`} 
              className="text-sm text-gray-700 truncate select-none cursor-pointer"
              title={column}
            >
              {column}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColumnSelectorPanel; 