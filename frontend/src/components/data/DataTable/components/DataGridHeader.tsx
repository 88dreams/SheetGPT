import React from 'react';
import { FaEye, FaEyeSlash, FaFileExport, FaExpand, FaCompress } from 'react-icons/fa';

interface DataGridHeaderProps {
  showHeaders: boolean;
  setShowHeaders: (show: boolean) => void;
  showRowNumbers: boolean;
  setShowRowNumbers: (show: boolean) => void;
  isExpanded: boolean;
  toggleExpansion: () => void;
  onExport: () => void;
}

const DataGridHeader: React.FC<DataGridHeaderProps> = ({
  showHeaders,
  setShowHeaders,
  showRowNumbers,
  setShowRowNumbers,
  isExpanded,
  toggleExpansion,
  onExport
}) => {
  return (
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
          onClick={toggleExpansion}
          className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          {isExpanded ? <FaCompress size={12} /> : <FaExpand size={12} />}
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
        </button>
        <button
          onClick={onExport}
          className="px-2 py-1 text-xs rounded flex items-center space-x-1 bg-green-100 text-green-700 hover:bg-green-200"
        >
          <FaFileExport size={12} />
          <span>Export to Sheets</span>
        </button>
      </div>
    </div>
  );
};

export default DataGridHeader;