import React from 'react';
import { FaFileExport, FaExpand, FaCompress, FaFileCsv, FaEye, FaKey, FaColumns } from 'react-icons/fa';

interface DataGridHeaderProps {
  isExpanded: boolean;
  toggleExpansion: () => void;
  onExport: () => void;
  onExportCsv?: () => void; // Make this optional
  onUnhideAllColumns?: () => void; // To reveal hidden columns
  hasHiddenColumns?: boolean; // To show/hide the unhide button
  showFullUuids?: boolean; // Whether to show full UUIDs
  onToggleUuidDisplay?: () => void; // Toggle UUID display
  onShowColumnSelector?: () => void; // To open column selector
}

const DataGridHeader: React.FC<DataGridHeaderProps> = ({
  isExpanded,
  toggleExpansion,
  onExport,
  onExportCsv = () => {}, // Default empty function
  onUnhideAllColumns = () => {}, // Default empty function
  hasHiddenColumns = false,
  showFullUuids = false,
  onToggleUuidDisplay = () => {}, // Default empty function
  onShowColumnSelector = () => {} // Default empty function
}) => {
  return (
    <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
      <h3 className="text-lg font-medium">Data Grid</h3>
      <div className="flex space-x-2">
        {/* Column selector button */}
        <button
          onClick={onShowColumnSelector}
          className="px-2 py-1 text-xs rounded flex items-center bg-blue-600 text-white hover:bg-blue-700"
          title="Select visible columns"
        >
          <FaColumns className="mr-1" size={12} />
          Columns
        </button>
        
        {/* UUID toggle button */}
        <button
          onClick={onToggleUuidDisplay}
          className="px-2 py-1 text-xs rounded flex items-center bg-indigo-600 text-white hover:bg-indigo-700"
          title="Toggle UUID format"
        >
          <FaKey className="mr-1" size={12} />
          {showFullUuids ? 'Names' : 'IDs'}
        </button>
        
        {/* Unhide columns button - only shows when columns are hidden */}
        {hasHiddenColumns && (
          <button
            onClick={onUnhideAllColumns}
            className="px-2 py-1 text-xs rounded flex items-center bg-purple-600 text-white hover:bg-purple-700"
            title="Restore hidden columns"
          >
            <FaEye className="mr-1" size={12} />
            Show All
          </button>
        )}
        
        <button
          onClick={toggleExpansion}
          className="px-2 py-1 text-xs rounded flex items-center bg-gray-600 text-white hover:bg-gray-700"
        >
          {isExpanded ? <FaCompress className="mr-1" size={12} /> : <FaExpand className="mr-1" size={12} />}
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
        
        <button
          onClick={onExportCsv}
          className="px-2 py-1 text-xs rounded flex items-center bg-blue-600 text-white hover:bg-blue-700"
        >
          <FaFileCsv className="mr-1" size={12} />
          CSV
        </button>
        
        <button
          onClick={onExport}
          className="px-2 py-1 text-xs rounded flex items-center bg-green-600 text-white hover:bg-green-700"
        >
          <FaFileExport className="mr-1" size={12} />
          Export
        </button>
      </div>
    </div>
  );
};

export default DataGridHeader;