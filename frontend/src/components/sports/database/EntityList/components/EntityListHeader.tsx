import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { FaFileExport, FaColumns, FaKey } from 'react-icons/fa';
import { getEntityTypeName } from '../utils/formatters';
import { EntityType } from '../../../../../types/sports';

interface EntityListHeaderProps {
  selectedEntityType: EntityType;
  showColumnSelector: boolean;
  setShowColumnSelector: (show: boolean) => void;
  showFullUuids: boolean;
  setShowFullUuids: (show: boolean) => void;
  openExportDialog: () => void;
  onSearch?: (query: string) => void;
}

const EntityListHeader: React.FC<EntityListHeaderProps> = ({
  selectedEntityType,
  showColumnSelector,
  setShowColumnSelector,
  showFullUuids,
  setShowFullUuids,
  openExportDialog,
  onSearch
}) => {
  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex justify-between items-center space-x-4">
        <h2 className="text-lg font-semibold min-w-[100px]">
          {getEntityTypeName(selectedEntityType)}
        </h2>
        <div className="flex-grow max-w-xl">
          {/* Simple inline search implementation */}
          <div className="w-full">
            <Input 
              prefix={<SearchOutlined />} 
              placeholder={`Search ${getEntityTypeName(selectedEntityType)} (min 3 chars)`}
              onChange={(e) => {
                // Clear any previous timeout
                if (window.searchTimeout) {
                  clearTimeout(window.searchTimeout);
                }
                
                // Set a new timeout to debounce the search
                window.searchTimeout = setTimeout(() => {
                  if (onSearch) {
                    onSearch(e.target.value.toLowerCase());
                  }
                }, 300); // 300ms debounce
              }}
            />
          </div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={openExportDialog}
            className="px-2 py-1 text-sm font-medium rounded flex items-center bg-green-600 hover:bg-green-700 text-white"
          >
            <FaFileExport className="mr-1" />
            Export
          </button>
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className={`px-2 py-1 text-sm font-medium rounded flex items-center ${
              showColumnSelector
                ? 'bg-blue-600 text-white'
                : 'bg-blue-600 bg-opacity-90 text-white hover:bg-blue-700'
            }`}
          >
            <FaColumns className="mr-1" />
            Columns
          </button>
          <button
            onClick={() => setShowFullUuids(!showFullUuids)}
            className={`px-2 py-1 text-sm font-medium rounded flex items-center ${
              showFullUuids
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-600 bg-opacity-90 text-white hover:bg-indigo-700'
            }`}
          >
            <FaKey className="mr-1" />
            {showFullUuids ? 'IDs' : 'Names'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntityListHeader;