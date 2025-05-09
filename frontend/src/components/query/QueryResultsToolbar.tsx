import React from 'react';
import {
  FaFileAlt,
  FaTable,
  FaColumns,
  FaKey,
  FaTrash,
  FaEdit,
} from 'react-icons/fa';

interface QueryResultsToolbarProps {
  queryResultsCount: number;
  selectedRowCount: number;
  onExportCsv: () => void;
  onExportSheets: () => void;
  onToggleColumns: () => void;
  onToggleUuids: () => void;
  showFullUuids: boolean;
  onClearResults: () => void;
  onBulkEdit: () => void;
  onDeleteSelected: () => void;
  isLoading: boolean;
  isTranslating: boolean; // To disable export buttons during translation
}

const QueryResultsToolbar: React.FC<QueryResultsToolbarProps> = ({
  queryResultsCount,
  selectedRowCount,
  onExportCsv,
  onExportSheets,
  onToggleColumns,
  onToggleUuids,
  showFullUuids,
  onClearResults,
  onBulkEdit,
  onDeleteSelected,
  isLoading,
  isTranslating,
}) => {
  if (queryResultsCount === 0) {
    return null; // Don't render the toolbar if there are no results
  }

  return (
    <div className="mb-4 p-2 border border-green-200 rounded bg-green-50 flex justify-between items-center">
      <span className="text-green-700">
        Query executed successfully - 
        {selectedRowCount > 0 
          ? ` ${selectedRowCount} of ${queryResultsCount} rows selected` 
          : ` ${queryResultsCount} rows returned`}
      </span>
      <div className="flex space-x-2">
        <button 
          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          onClick={onExportCsv}
          disabled={isLoading || isTranslating}
          title="Export current results to CSV"
        >
          <FaFileAlt className="inline mr-1" /> Export CSV
        </button>
        <button 
          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          onClick={onExportSheets}
          disabled={isLoading || isTranslating}
          title="Export current results to Google Sheets"
        >
          <FaTable className="inline mr-1" /> Export to Sheets
        </button>
        <button 
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          onClick={onToggleColumns}
          title="Show/Hide Columns"
        >
          <FaColumns className="inline mr-1" /> Columns
        </button>
        <button 
          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          onClick={onToggleUuids}
          title={showFullUuids ? 'Show entity names' : 'Show full UUIDs'}
        >
          <FaKey className="inline mr-1" /> {showFullUuids ? 'Names' : 'IDs'}
        </button>
        <button 
          className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
          onClick={onClearResults}
          title="Clear current results from display"
        >
          <FaTrash className="inline mr-1" /> Clear Results
        </button>
        {selectedRowCount > 0 && (
          <>
            <button 
              className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors mr-2"
              onClick={onBulkEdit}
              title={`Edit ${selectedRowCount} selected row(s)`}
            >
              <FaEdit className="inline mr-1" /> Bulk Edit ({selectedRowCount})
            </button>
            <button 
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              onClick={onDeleteSelected}
              title={`Delete ${selectedRowCount} selected row(s)`}
            >
              <FaTrash className="inline mr-1" /> Delete ({selectedRowCount})
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default QueryResultsToolbar; 