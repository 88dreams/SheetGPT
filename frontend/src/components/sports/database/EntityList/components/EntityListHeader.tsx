import React, { useEffect, useRef } from 'react';
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
  searchValue?: string; // Current search value for controlling the input
}

const EntityListHeader: React.FC<EntityListHeaderProps> = ({
  selectedEntityType,
  showColumnSelector,
  setShowColumnSelector,
  showFullUuids,
  setShowFullUuids,
  openExportDialog,
  onSearch,
  searchValue = '' // Default to empty string if not provided
}) => {
  // Create a ref to the input element so we can set its value programmatically
  const searchInputRef = useRef<Input>(null);
  
  // When searchValue prop changes (especially to ''), update the input value
  useEffect(() => {
    // If we have a ref to the input and the searchValue is explicitly provided
    if (searchInputRef.current && searchInputRef.current.input) {
      // Set the value of the input element directly to match searchValue
      searchInputRef.current.input.value = searchValue;
    }
  }, [searchValue]);
  
  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex justify-between items-center space-x-4">
        <h2 className="text-lg font-semibold min-w-[100px]">
          {getEntityTypeName(selectedEntityType)}
        </h2>
        <div className="flex-grow max-w-xl">
          {/* Controlled search input with ref */}
          <div className="w-full">
            <Input 
              ref={searchInputRef}
              prefix={<SearchOutlined />} 
              placeholder={`Search ${getEntityTypeName(selectedEntityType)} (min 3 chars)`}
              defaultValue={searchValue} // Set initial value from prop
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