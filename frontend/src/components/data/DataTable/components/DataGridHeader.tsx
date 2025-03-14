import React from 'react';
import { FaFileExport, FaExpand, FaCompress, FaFileCsv, FaEye, FaKey } from 'react-icons/fa';

interface DataGridHeaderProps {
  isExpanded: boolean;
  toggleExpansion: () => void;
  onExport: () => void;
  onExportCsv?: () => void; // Make this optional
  onUnhideAllColumns?: () => void; // To reveal hidden columns
  hasHiddenColumns?: boolean; // To show/hide the unhide button
  showFullUuids?: boolean; // Whether to show full UUIDs
  onToggleUuidDisplay?: () => void; // Toggle UUID display
}

const DataGridHeader: React.FC<DataGridHeaderProps> = ({
  isExpanded,
  toggleExpansion,
  onExport,
  onExportCsv = () => {}, // Default empty function
  onUnhideAllColumns = () => {}, // Default empty function
  hasHiddenColumns = false,
  showFullUuids = false,
  onToggleUuidDisplay = () => {} // Default empty function
}) => {
  return (
    <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
      <h3 className="text-lg font-medium">Data Grid</h3>
      <div className="flex space-x-2">
        {/* UUID toggle button */}
        <button
          onClick={onToggleUuidDisplay}
          className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          title="Toggle UUID format"
        >
          <FaKey size={12} />
          <span>{showFullUuids ? 'Show Names' : 'Show UUIDs'}</span>
        </button>
        {/* Unhide columns button - only shows when columns are hidden */}
        {hasHiddenColumns && (
          <button
            onClick={onUnhideAllColumns}
            className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-purple-100 text-purple-700 hover:bg-purple-200"
            title="Restore hidden columns"
          >
            <FaEye size={12} />
            <span>Unhide Columns</span>
          </button>
        )}
        <button
          onClick={toggleExpansion}
          className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          {isExpanded ? <FaCompress size={12} /> : <FaExpand size={12} />}
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
        </button>
        <button
          onClick={onExportCsv}
          className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
        >
          <FaFileCsv size={12} />
          <span>Export CSV</span>
        </button>
        <button
          onClick={onExport}
          className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-green-100 text-green-700 hover:bg-green-200"
        >
          <FaFileExport size={12} />
          <span>Export Sheets</span>
        </button>
      </div>
    </div>
  );
};

export default DataGridHeader;